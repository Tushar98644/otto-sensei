export const PREP_ROUNDS = ["opening", "fit", "skills", "behavioural", "closing"] as const;
export type PrepRound = (typeof PREP_ROUNDS)[number];

export const DEFAULT_ROUND: PrepRound = "fit";

export function byRound<T extends { round: PrepRound }>(questions: readonly T[]): T[] {
  return [...questions].sort((a, b) => PREP_ROUNDS.indexOf(a.round) - PREP_ROUNDS.indexOf(b.round));
}
