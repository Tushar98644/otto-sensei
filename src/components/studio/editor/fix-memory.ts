import type { FixResponse } from "@/lib/api/types";

// Line fixes already paid for in this tab, by the exact request (line, role and answers). Opening
// "Fix with Otto" again on a line nobody changed, or sending the same answers again, shows the
// suggestion Otto already wrote instead of spending another fix (and another AI call) on it.

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
