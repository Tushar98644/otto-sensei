import type { ContentProject } from "@/lib/portfolio/content";
import { safeId } from "../parts";

// Pure helpers for Reel: what each part of Hamish's design gets from someone's portfolio.

// His home page shows three projects; a fourth keeps a two-two rhythm for people with more.
export const SUMMARIES_MAX = 4;

export type Device = "laptop" | "phone";

/** The device a project's drawn screen goes on: a pair of phones when the owner says so. */
export function deviceOf(project: Pick<ContentProject, "device">): Device {
  return project.device === "phone" ? "phone" : "laptop";
}

export const detailId = (project: ContentProject) => safeId("pf-reel-p", project.id);

/** Where a project's button goes: its own page when there's more to show, else its site. */
export function projectTarget(project: ContentProject): { href: string; label: string } | null {
  if (project.details.length > 0) {
    return { href: `#${detailId(project)}`, label: "View project" };
  }
  if (project.website) return { href: project.website.href, label: "View website" };
  if (project.source) return { href: project.source.href, label: "View source" };
  return null;
}

/** "01", "02"... as the summaries number themselves. */
export const indexText = (index: number) => (index < 10 ? `0${index}` : String(index));

/**
 * The screen reader label for the title: "Designer + Developer, Prototyper, and Animator" in the
 * original, which assumes several disciplines.
 */
export function introLabel(role: string, disciplines: readonly string[]): string {
  if (disciplines.length === 0) return role;
  const list =
    disciplines.length === 1
      ? disciplines[0]!
      : [disciplines.slice(0, -1).join(", "), disciplines.at(-1)].join(", and ");
  return `${role} + ${list}`;
}

// The original's words ("Designer", "+ Illustrator") fit its column at full size; past about 13
// characters a line runs off the side, so longer ones step the whole title down together.
const TITLE_FITS = 13;

export function titleScale(role: string, disciplines: readonly string[]): number {
  const longest = Math.max(role.length, ...disciplines.map((word) => word.length + 2), 1);
  return Math.min(1, Number((TITLE_FITS / longest).toFixed(3)));
}

/**
 * The part of a drawing that fills a screen of width x height without stretching: centred
 * across, from the top down.
 */
export function coverRect(
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } {
  if (sourceWidth <= 0 || sourceHeight <= 0 || width <= 0 || height <= 0)
    return { x: 0, y: 0, width: Math.max(0, sourceWidth), height: Math.max(0, sourceHeight) };
  const target = width / height;
  if (sourceWidth / sourceHeight > target) {
    const cropWidth = sourceHeight * target;
    return { x: (sourceWidth - cropWidth) / 2, y: 0, width: cropWidth, height: sourceHeight };
  }
  return { x: 0, y: 0, width: sourceWidth, height: sourceWidth / target };
}

/**
 * Words of `text` in lines of at most `width` characters, at most `lines` of them; a cut ends in
 * an ellipsis. For text drawn into SVG, which doesn't wrap.
 */
export function wrapText(text: string, width: number, lines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const out: string[] = [];
  let line = "";
  for (const word of words) {
    const piece = word.length > width ? `${word.slice(0, width - 1)}…` : word;
    if (!line) line = piece;
    else if (line.length + 1 + piece.length <= width) line = `${line} ${piece}`;
    else {
      out.push(line);
      line = piece;
    }
  }
  if (line) out.push(line);
  if (out.length <= lines) return out;
  const kept = out.slice(0, lines);
  const last = kept[lines - 1]!;
  kept[lines - 1] = `${last.length + 1 > width ? last.slice(0, width - 1) : last}…`;
  return kept;
}
