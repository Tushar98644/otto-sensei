import type { FixResponse } from "@/lib/api/types";

// Line fixes already paid for in this tab, by exact request: reopening an unchanged line, or
// resending the same answers, shows Otto's earlier suggestion instead of spending another fix.

const MAX_KEPT = 40;
const kept = new Map<string, FixResponse>();

export type FixRequest = {
  bullet: string;
  role: { title: string; company: string };
  answers: readonly { question: string; answer: string }[];
};

function keyOf({ bullet, role, answers }: FixRequest): string {
  return JSON.stringify([
    bullet.trim(),
    role.title,
    role.company,
    answers.map((item) => [item.question, item.answer.trim()]),
  ]);
}

export function recallFix(request: FixRequest): FixResponse | null {
  return kept.get(keyOf(request)) ?? null;
}

export function rememberFix(request: FixRequest, response: FixResponse): void {
  const key = keyOf(request);
  kept.delete(key);
  kept.set(key, response);
  while (kept.size > MAX_KEPT) {
    const oldest = kept.keys().next().value;
    if (oldest === undefined) break;
    kept.delete(oldest);
  }
}

export function forgetFixesForTests(): void {
  kept.clear();
}
