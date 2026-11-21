const SECOND = 1_000;

// Timed by the clock, since one AI call does all of it and reports nothing on the way.
export const TAILOR_STAGES = [
  { from: 0, text: "Otto is reading the job post." },
  { from: 8 * SECOND, text: "Otto is comparing it with your resume." },
  { from: 20 * SECOND, text: "Otto is writing your tailored lines." },
  { from: 45 * SECOND, text: "Still writing. Long posts take a little longer." },
] as const;

export function tailorStage(elapsedMs: number): string {
  let text: string = TAILOR_STAGES[0].text;
  for (const stage of TAILOR_STAGES) if (elapsedMs >= stage.from) text = stage.text;
  return text;
}

// The next moment the line changes, or null once it's on the last stage.
export function nextStageIn(elapsedMs: number): number | null {
  const next = TAILOR_STAGES.find((stage) => stage.from > elapsedMs);
  return next ? next.from - elapsedMs : null;
}
