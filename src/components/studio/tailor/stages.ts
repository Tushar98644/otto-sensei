const SECOND = 1_000;

export type TailorStageKey = "reading" | "comparing" | "writing" | "still";

// Timed by the clock, since one AI call does all of it and reports nothing on the way.
export const TAILOR_STAGES = [
  { from: 0, key: "reading" },
  { from: 8 * SECOND, key: "comparing" },
  { from: 20 * SECOND, key: "writing" },
  { from: 45 * SECOND, key: "still" },
] as const satisfies readonly { from: number; key: TailorStageKey }[];

// The stage's key; the studio's messages hold its words under studioTailor.stages.
export function tailorStage(elapsedMs: number): TailorStageKey {
  let key: TailorStageKey = TAILOR_STAGES[0].key;
  for (const stage of TAILOR_STAGES) if (elapsedMs >= stage.from) key = stage.key;
  return key;
}

// The next moment the line changes, or null once it's on the last stage.
export function nextStageIn(elapsedMs: number): number | null {
  const next = TAILOR_STAGES.find((stage) => stage.from > elapsedMs);
  return next ? next.from - elapsedMs : null;
}
