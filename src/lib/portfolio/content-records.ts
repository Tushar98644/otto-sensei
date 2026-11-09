import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { portfolios } from "@/db/schema";
import { fetchGitHubStats } from "@/lib/github/profile";
import { GitHubError } from "@/lib/github/http";
import { parseStoredStats } from "@/lib/github/stats";
import { log } from "@/lib/log";
import { emptyResume, ResumeSchema } from "@/lib/resume/schema";
import { parseStoredContent, uploadsIn, type GitHubStats, type PortfolioContent } from "./content";
import { githubUsernameFor } from "./content-view";
import { attachMedia, deleteAllMedia, ownedMedia, sweepDetachedMedia } from "./media-records";
import { portfolioSlugsOf } from "./records";
import { portfolioView } from "./view";

// Server-only. The content half of a portfolio (src/lib/portfolio/content.ts): saving the owner's
// document, keeping its GitHub numbers fresh and filling the photo from the sign-in account.

// GitHub numbers older than this are fetched again when the owner opens the editor.
export const GITHUB_STALE_MS = 6 * 60 * 60 * 1000;

export type SaveContentResult =
  | { status: "saved"; content: PortfolioContent; slug: string }
  | { status: "bad_media" }
  | { status: "not_found" }
  | { status: "no_user" };

/**
 * Replaces the stored document. Every uploaded picture it names must be one of this account's
 * files; pictures it no longer names start their grace period (Undo can still bring them back).
 */
export async function saveContent(
  userId: string,
  content: PortfolioContent,
  now = Date.now(),
): Promise<SaveContentResult> {
  const db = await getDb();
  const uploads = uploadsIn(content);
  const result = await db.transaction(async (tx): Promise<SaveContentResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const [current] = await tx
      .select({ id: portfolios.id, slug: portfolios.slug })
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .limit(1);
    if (!current) return { status: "not_found" };
    if (!(await ownedMedia(tx, userId, uploads))) return { status: "bad_media" };
    await tx
      .update(portfolios)
      .set({ content, updatedAt: now })
      .where(eq(portfolios.id, current.id));
    await attachMedia(
      tx,
      userId,
      uploads.map((ref) => ref.id),
      now,
    );
    return { status: "saved", content, slug: current.slug };
  });
  if (result.status === "saved") await sweepDetachedMedia(userId, now);
  return result;
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
 * Takes the sign-in account's picture (Google) as the page's photo, once: only while the photo is
 * still automatic, so a photo the owner replaced or removed is never overwritten.
 */
export async function fillAccountPhoto(
  userId: string,
  avatarUrl: string | null,
): Promise<PortfolioContent | null> {
  if (!avatarUrl) return null;
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const [row] = await tx
      .select({ id: portfolios.id, content: portfolios.content })
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .limit(1);
    if (!row) return null;
    const content = parseStoredContent(row.content);
    if (content.photo !== null) return null;
    const next: PortfolioContent = { ...content, photo: { kind: "link", url: avatarUrl, alt: "" } };
    await tx.update(portfolios).set({ content: next }).where(eq(portfolios.id, row.id));
    return next;
  });
}

/**
 * Deletes the account's portfolio, its old addresses and every uploaded picture. Pictures go first:
 * if the store can't delete them the page stays, so nothing is left behind without a row.
 * Returns the addresses whose cached pages must be dropped, or null when there was no portfolio.
 */
export async function deletePortfolio(userId: string): Promise<string[] | null> {
  const slugs = await portfolioSlugsOf(userId);
  if (slugs.length === 0) return null;
  await deleteAllMedia(userId);
  const db = await getDb();
  await db.delete(portfolios).where(eq(portfolios.userId, userId));
  return slugs;
}
