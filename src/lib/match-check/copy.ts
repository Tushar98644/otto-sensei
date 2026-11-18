import type { MatchCheck, MatchCount, MatchStatus } from "./check";

const number = new Intl.NumberFormat("en-US");

function skills(total: number): string {
  return total === 1 ? "skill" : "skills";
}

export function matchHeadline({ found, total }: Pick<MatchCheck, "found" | "total">): string {
  if (total === 0) return "No skills or tools Otto knows in this post";
  return `Found ${number.format(found)} of ${number.format(total)} ${skills(total)} the post names`;
}

export function countLine(label: string, { found, total }: MatchCount): string | null {
  if (total === 0) return null;
  return `${label}: ${number.format(found)} of ${number.format(total)} found`;
}

export function listedNote(listed: number): string | null {
  if (listed === 0) return null;
  const which = listed === 1 ? "One only appears" : `${number.format(listed)} only appear`;
  return `${which} in a list, such as your skills. Recruiters look for a line that says where you used ${listed === 1 ? "it" : "them"}.`;
}

export function matchOtto(check: Pick<MatchCheck, "found" | "total" | "must">): string {
  const { found, total, must } = check;
  if (total === 0) {
    return "I couldn't find skills or tools I know in this post. A post that lists its requirements works better.";
  }
  if (found === total) {
    return total === 1
      ? "Your resume names the one skill this post names."
      : `Your resume names all ${number.format(total)} skills this post names.`;
  }
  if (must.total > 0 && must.found < must.total) {
    const left = must.total - must.found;
    return `${number.format(left)} of the post's ${number.format(must.total)} must-haves ${left === 1 ? "isn't" : "aren't"} in your resume yet. Start there.`;
  }
  return `Your resume names ${number.format(found)} of the ${number.format(total)} ${skills(total)} this post names. Here's where.`;
}

export const STATUS_LABELS: Record<MatchStatus, string> = {
  shown: "In a line",
  listed: "Listed, not shown",
  missing: "Not found",
};

export const MISSING_HINT =
  "If you've used it, add a line that says where and what you did. Use the post's own words.";
