import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { portfolios } from "@/db/schema";
import { fetchGitHubStats } from "@/lib/github/profile";
import { GitHubError } from "@/lib/github/http";
import { parseStoredStats } from "@/lib/github/stats";
import { log } from "@/lib/log";
import { emptyResume, ResumeSchema } from "@/lib/resume/schema";
import { parseStoredContent, type GitHubStats, type PortfolioContent } from "./content";
import { githubUsernameFor } from "./content-view";
import { portfolioSlugsOf } from "./records";
import { portfolioView } from "./view";

// Server-only. The content half of a portfolio (src/lib/portfolio/content.ts): saving the owner's
// document and keeping its GitHub numbers fresh.

// GitHub numbers older than this are fetched again when the owner opens the editor.
export const GITHUB_STALE_MS = 6 * 60 * 60 * 1000;

export type SaveContentResult =
  | { status: "saved"; content: PortfolioContent; slug: string }
  | { status: "not_found" }
  | { status: "no_user" };

/** Replaces the stored document. */
export async function saveContent(
  userId: string,
  content: PortfolioContent,
  now = Date.now(),
): Promise<SaveContentResult> {
  const db = await getDb();
  return db.transaction(async (tx): Promise<SaveContentResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const [current] = await tx
      .select({ id: portfolios.id, slug: portfolios.slug })
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .limit(1);
    if (!current) return { status: "not_found" };
    await tx
      .update(portfolios)
      .set({ content, updatedAt: now })
      .where(eq(portfolios.id, current.id));
    return { status: "saved", content, slug: current.slug };
  });
}

export type GitHubRefresh = { github: GitHubStats | null; changed: boolean; slug: string | null };

/**
 * Fetches the page's GitHub numbers again when they're older than GITHUB_STALE_MS (or always with
 * `force`). Keeps the old copy when GitHub is busy; clears it when there's no username any more.
 */
export async function refreshGitHub(
  userId: string,
  { force = false, now = Date.now() }: { force?: boolean; now?: number } = {},
): Promise<GitHubRefresh | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      id: portfolios.id,
      slug: portfolios.slug,
      snapshot: portfolios.snapshot,
      content: portfolios.content,
      github: portfolios.github,
      checkedAt: portfolios.githubCheckedAt,
      createdAt: portfolios.createdAt,
    })
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);
  if (!row) return null;
  const stored = parseStoredStats(row.github);
  const parsed = ResumeSchema.safeParse(row.snapshot);
  const resume = parsed.success ? parsed.data : emptyResume(row.createdAt);
  const view = portfolioView(resume, { showEmail: false, showPhone: false, hiddenSections: [] });
  const username = githubUsernameFor(view, parseStoredContent(row.content));

  if (!username) {
    if (stored === null) return { github: null, changed: false, slug: row.slug };
    await db
      .update(portfolios)
      .set({ github: null, githubCheckedAt: now })
      .where(eq(portfolios.id, row.id));
    return { github: null, changed: true, slug: row.slug };
  }
  const sameUser = stored?.username.toLowerCase() === username.toLowerCase();
  const fresh = sameUser && row.checkedAt !== null && now - row.checkedAt < GITHUB_STALE_MS;
  if (fresh && !force) return { github: stored, changed: false, slug: row.slug };

  let github: GitHubStats | null;
  try {
    github = await fetchGitHubStats(username, now);
  } catch (error) {
    if (!(error instanceof GitHubError)) throw error;
    log.info("portfolio.github_unavailable", { reason: error.reason });
    return { github: sameUser ? stored : null, changed: false, slug: row.slug };
  }
  await db
    .update(portfolios)
    .set({ github: github as unknown as Record<string, unknown> | null, githubCheckedAt: now })
    .where(eq(portfolios.id, row.id));
  return { github, changed: true, slug: row.slug };
}

/**
 * Deletes the account's portfolio and its old addresses. Returns the addresses whose cached pages
 * must be dropped, or null when there was no portfolio.
 */
export async function deletePortfolio(userId: string): Promise<string[] | null> {
  const slugs = await portfolioSlugsOf(userId);
  if (slugs.length === 0) return null;
  const db = await getDb();
  await db.delete(portfolios).where(eq(portfolios.userId, userId));
  return slugs;
}
