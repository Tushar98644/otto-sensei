import { PROMPTS } from "./entry";
import { monthLabel } from "./month";
import { ENTRY_FIELDS, type CareerLogEntry } from "./types";

// The log as plain text, newest month first: the page's Download and the account's data export share it.
export function careerLogText(entries: readonly CareerLogEntry[], downloadedOn: string): string {
  const months = [...entries].sort((a, b) => b.month.localeCompare(a.month));
  const blocks = months.map((entry) => {
    const lines = [monthLabel(entry.month), "=".repeat(monthLabel(entry.month).length)];
    if (entry.nothingNew) return [...lines, "Nothing new this month."].join("\n");
    for (const field of ENTRY_FIELDS) {
      const text = entry[field].trim();
      if (text) lines.push("", PROMPTS[field].label, text);
    }
    return lines.join("\n");
  });
  return [
    `Career log, downloaded on ${downloadedOn}.`,
    `${months.length} ${months.length === 1 ? "month" : "months"}.`,
    "",
    ...blocks.flatMap((block) => [block, ""]),
  ].join("\n");
}

export function careerLogJson(entries: readonly CareerLogEntry[]): string {
  return JSON.stringify(
    [...entries]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((entry) => ({
        month: entry.month,
        shipped: entry.shipped,
        numbers: entry.numbers,
        learned: entry.learned,
        nothingNew: entry.nothingNew,
        updatedAt: new Date(entry.updatedAt).toISOString(),
      })),
    null,
    2,
  );
}
