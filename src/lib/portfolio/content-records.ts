import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { portfolios } from "@/db/schema";
import { fetchGitHubStats } from "@/lib/github/profile";
import { GitHubError } from "@/lib/github/http";
import { parseStoredStats, storedStats } from "@/lib/github/stats";
import { log } from "@/lib/log";
import { refreshPortfolioPages } from "./cache";
import type { GitHubStats, PortfolioContent } from "./content";
import { parseStoredContent } from "./content-validation";
import { pageMoved, portfolioSlugsOf } from "./records";

export const GITHUB_STALE_MS = 6 * 60 * 60 * 1000;

type GitHubRow = { id: string; slug: string; github: unknown; checkedAt: number | null };

const GITHUB_COLUMNS = {
  id: portfolios.id,
  slug: portfolios.slug,
  github: portfolios.github,
  checkedAt: portfolios.githubCheckedAt,
};

type ContentPage = { content: PortfolioContent; github: GitHubRow };

export async function getContentPage(userId: string): Promise<ContentPage | null> {
  const db = await getDb();
  const [row] = await db
    .select({ ...GITHUB_COLUMNS, content: portfolios.content })
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);
  if (!row) return null;
  const { content, ...github } = row;
  return { content: parseStoredContent(content), github };
}

export type SaveContentResult =
  | {
      status: "saved";
      content: PortfolioContent;
      slug: string;
      published: boolean;
      github: GitHubRow;
    }
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
      .select({
        ...GITHUB_COLUMNS,
        updatedAt: portfolios.updatedAt,
        published: portfolios.published,
      })
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .limit(1);
    if (!current) return { status: "not_found" };
    if (pageMoved(version, current)) return { status: "changed" };
    await tx
      .update(portfolios)
      .set({ content, updatedAt: now })
      .where(eq(portfolios.id, current.id));
    const { id, slug, github, checkedAt, published } = current;
    return { status: "saved", content, slug, published, github: { id, slug, github, checkedAt } };
  });
}

export type GitHubRefresh = { github: GitHubStats | null; changed: boolean; slug: string | null };

type RefreshOptions = {
  force?: boolean;
  now?: number;
  row?: GitHubRow;
  // Given (as after()), an old copy of the same account's numbers is answered and refetched through it.
  later?: (task: () => Promise<void>) => void;
};

async function readGitHubRow(userId: string): Promise<GitHubRow | null> {
  const db = await getDb();
  const [row] = await db
    .select(GITHUB_COLUMNS)
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);
  return row ?? null;
}

// Saves that land while a refetch runs would only repeat it, and pile up while GitHub is slow.
const refreshing = new Set<string>();

async function refreshInBackground(userId: string, login: string): Promise<void> {
  if (refreshing.has(userId)) return;
  refreshing.add(userId);
  try {
    const result = await refreshGitHub(userId, login);
    if (result?.changed) refreshPortfolioPages([result.slug]);
  } catch (error) {
    log.warn("portfolio.github_refresh_failed", {}, error);
  } finally {
    refreshing.delete(userId);
  }
}

// Only the owner's connected GitHub login: a username on the resume could be anyone's.
export async function refreshGitHub(
  userId: string,
  login: string | null,
  { force = false, now = Date.now(), row: given, later }: RefreshOptions = {},
): Promise<GitHubRefresh | null> {
  const row = given ?? (await readGitHubRow(userId));
  if (!row) return null;
  const db = await getDb();
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
  // Another account's numbers are never shown, so only the same account's can wait.
  if (sameUser && later && !force) {
    later(() => refreshInBackground(userId, login));
    return { github: stored, changed: false, slug: row.slug };
  }

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
