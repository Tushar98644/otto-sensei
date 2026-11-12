import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { portfolios } from "@/db/schema";
import { fetchGitHubStats } from "@/lib/github/profile";
import { GitHubError } from "@/lib/github/http";
import { parseStoredStats, storedStats } from "@/lib/github/stats";
import { log } from "@/lib/log";
import type { GitHubStats, PortfolioContent } from "./content";
import { pageMoved, portfolioSlugsOf } from "./records";

export const GITHUB_STALE_MS = 6 * 60 * 60 * 1000;

export type SaveContentResult =
  | { status: "saved"; content: PortfolioContent; slug: string }
  | { status: "not_found" }
  | { status: "no_user" }
  | { status: "changed" };

export async function saveContent(
  userId: string,
  content: PortfolioContent,
  now = Date.now(),
  version?: number | null,
): Promise<SaveContentResult> {
  const db = await getDb();
  return db.transaction(async (tx): Promise<SaveContentResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const [current] = await tx
      .select({ id: portfolios.id, slug: portfolios.slug, updatedAt: portfolios.updatedAt })
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .limit(1);
    if (!current) return { status: "not_found" };
    if (pageMoved(version, current)) return { status: "changed" };
    await tx
      .update(portfolios)
      .set({ content, updatedAt: now })
      .where(eq(portfolios.id, current.id));
    return { status: "saved", content, slug: current.slug };
  });
}

export type GitHubRefresh = { github: GitHubStats | null; changed: boolean; slug: string | null };

// Only the owner's connected GitHub login: a username on the resume could be anyone's.
export async function refreshGitHub(
  userId: string,
  login: string | null,
  { force = false, now = Date.now() }: { force?: boolean; now?: number } = {},
): Promise<GitHubRefresh | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      id: portfolios.id,
      slug: portfolios.slug,
      github: portfolios.github,
      checkedAt: portfolios.githubCheckedAt,
    })
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);
  if (!row) return null;
  const stored = parseStoredStats(row.github);
  const clear = async (): Promise<GitHubRefresh> => {
    if (row.github !== null) {
      await db
        .update(portfolios)
        .set({ github: null, githubCheckedAt: now })
        .where(eq(portfolios.id, row.id));
    }
    return { github: null, changed: stored !== null, slug: row.slug };
  };

  if (!login) return clear();
  const sameUser = stored?.username.toLowerCase() === login.toLowerCase();
  const fresh = sameUser && row.checkedAt !== null && now - row.checkedAt < GITHUB_STALE_MS;
  if (fresh && !force) return { github: stored, changed: false, slug: row.slug };

  let github: GitHubStats | null;
  try {
    github = await fetchGitHubStats(login, now);
  } catch (error) {
    if (!(error instanceof GitHubError)) throw error;
    log.info("portfolio.github_unavailable", { reason: error.reason });
    return sameUser ? { github: stored, changed: false, slug: row.slug } : clear();
  }
  await db
    .update(portfolios)
    .set({ github: github ? storedStats(github) : null, githubCheckedAt: now })
    .where(eq(portfolios.id, row.id));
  return { github, changed: true, slug: row.slug };
}

export async function deletePortfolio(userId: string): Promise<string[] | null> {
  const slugs = await portfolioSlugsOf(userId);
  if (slugs.length === 0) return null;
  const db = await getDb();
  await db.delete(portfolios).where(eq(portfolios.userId, userId));
  return slugs;
}
