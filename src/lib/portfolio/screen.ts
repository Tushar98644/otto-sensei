import { checkContent, textsOf } from "@/lib/ai/moderation";
import type { Resume } from "@/lib/resume/schema";
import { shareSnapshot, snapshotText } from "@/lib/share/snapshot";
import type { GitHubStats, PortfolioContent } from "./content";
import { getPortfolio } from "./records";
import { normalizeSlug } from "./slug";
import type { Portfolio, PortfolioPatch } from "./types";

export type PageParts = {
  slug?: string;
  snapshot?: Resume;
  content?: PortfolioContent;
  github?: GitHubStats | null;
};

export type Blocked = { status: "blocked" };

const TRIES = 3;

// Hidden sections and contact switches are ignored: anything stored can be shown with one click.
export function pageTexts(parts: PageParts): string[] {
  return [
    parts.slug ?? "",
    parts.snapshot ? snapshotText(parts.snapshot) : "",
    ...textsOf(parts.content),
    ...textsOf(parts.github),
  ];
}

export async function pageAllowed(parts: PageParts, source: string): Promise<boolean> {
  return (await checkContent(pageTexts(parts), { source })).allowed;
}

export function patchParts(current: Portfolio | null, patch: PortfolioPatch): PageParts | null {
  if (!current) return null;
  const publishing = patch.published === true && !current.published;
  if (!publishing && (!current.published || patch.published === false)) return null;
  const snapshot = patch.resume ? shareSnapshot(patch.resume) : undefined;
  const wanted = patch.slug === undefined ? current.slug : normalizeSlug(patch.slug);
  const slug = wanted === current.slug ? undefined : wanted;
  if (publishing) {
    return {
      slug: wanted,
      snapshot: snapshot ?? current.snapshot,
      content: current.content,
      github: current.github,
    };
  }
  return snapshot || slug ? { snapshot, slug } : null;
}

export function liveParts(current: Portfolio | null, parts: PageParts): PageParts | null {
  return current?.published ? parts : null;
}

// Each try checks the page as it is now and writes only if nothing changed it since.
export async function screenedWrite<R extends { status: string }>(
  userId: string,
  source: string,
  partsFor: (current: Portfolio | null) => PageParts | null,
  write: (version: number | null) => Promise<R>,
): Promise<R | Blocked> {
  for (let attempt = 1; ; attempt++) {
    const current = await getPortfolio(userId);
    const parts = partsFor(current);
    if (parts && !(await pageAllowed(parts, source))) return { status: "blocked" };
    const result = await write(current?.updatedAt ?? null);
    if (result.status !== "changed" || attempt === TRIES) return result;
  }
}
