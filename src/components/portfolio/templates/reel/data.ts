import type { ContentProject } from "@/lib/portfolio/content";
import { safeId } from "../parts";

export const SUMMARIES_MAX = 4;

export type Device = "laptop" | "phone";

export function deviceOf(project: Pick<ContentProject, "device">): Device {
  return project.device === "phone" ? "phone" : "laptop";
}

export const detailId = (project: ContentProject) => safeId("pf-reel-p", project.id);

export function projectTarget(project: ContentProject): { href: string; label: string } | null {
  if (project.details.length > 0) {
    return { href: `#${detailId(project)}`, label: "View project" };
  }
  if (project.website) return { href: project.website.href, label: "View website" };
  if (project.source) return { href: project.source.href, label: "View source" };
  return null;
}

export const indexText = (index: number) => (index < 10 ? `0${index}` : String(index));

export function introLabel(role: string, disciplines: readonly string[]): string {
  if (disciplines.length === 0) return role;
  const list =
    disciplines.length === 1
      ? disciplines[0]!
      : [disciplines.slice(0, -1).join(", "), disciplines.at(-1)].join(", and ");
  return `${role} + ${list}`;
}

const TITLE_FITS = 13;

export function titleScale(role: string, disciplines: readonly string[]): number {
  const longest = Math.max(role.length, ...disciplines.map((word) => word.length + 2), 1);
  return Math.min(1, Number((TITLE_FITS / longest).toFixed(3)));
}

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
