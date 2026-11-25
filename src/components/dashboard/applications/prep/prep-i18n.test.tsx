import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SamplePack } from "@/components/dashboard/interview/sample-pack";
import { interviewDayLine, prepPickerChoices } from "@/components/dashboard/interview/view";
import { formatFor } from "@/i18n/intl";
import { loadMessages } from "@/i18n/messages";
import EN_APP from "@/i18n/messages/en/app";
import EN_PREP from "@/i18n/messages/en/prep";
import type { Application } from "@/lib/applications/schema";
import { OTTO } from "@/components/mascot/lines";
import { FEATURE_LABELS } from "@/config/plans";
import { FOCUS_COPY, LEVEL_COPY } from "@/lib/insights/prep-focus";
import type { InterviewPrep } from "@/lib/insights/prep";
import { prepToText } from "@/lib/insights/prep-view";
import { inEnglish, inLocale } from "../../messages-testing";
import { PracticeMeter } from "./practice-meter";
import { PrepPack } from "./prep-pack";
import { prepAllowance } from "./prep-start";

const NOW = new Date(2026, 10, 22, 15).getTime();
const noon = (day: number) => new Date(2026, 10, day, 12).getTime();

const PREP: InterviewPrep = {
  version: 3,
  technical: null,
  job: { title: "Data Engineer", company: "Mapline" },
  questions: [
    {
      round: "skills",
      question: "Walk me through how you'd test a dbt pipeline.",
      checking: "Whether you test data, not just code.",
      followUp: "What would you do when a test fails at 2am?",
      points: ["Your billing rebuild in Go", "[Which checks did you run?]"],
      story: 0,
    },
  ],
  stories: [
    {
      title: "Billing rebuild",
      line: "Rebuilt billing in Go",
      place: "Engineer at Acme",
      situation: "[What was going on?]",
      task: "[What were you asked to do?]",
      action: "Rebuilt billing in Go",
      result: "Cut latency by [number]",
    },
  ],
  asks: ["What does a good first quarter look like?"],
  createdAt: 1,
  demo: false,
} as unknown as InterviewPrep;

const pack = () => (
  <PrepPack
    prep={PREP}
    target={{ company: "Mapline", role: "Data Engineer" } as never}
    storageKey="k"
  />
);

describe("interview prep in Spanish", () => {
  it("draws the prep pack's rounds, stories and practice in Spanish", async () => {
    const html = renderToStaticMarkup(await inLocale("es", pack()));
    expect(html).toContain("Otto hace de entrevistador");
    expect(html).toContain("1 pregunta en 1 ronda, y luego tu turno");
    expect(html).toContain("Empezar a practicar");
    expect(html).toContain("Tus historias");
    expect(html).toContain("Cómo responder");
    expect(html).toContain("Situación");
    expect(html).not.toMatch(/Start practicing|Your stories|How to answer/);
  });

  it("keeps English exactly as it was", () => {
    const html = renderToStaticMarkup(inEnglish(pack()));
    expect(html).toContain("1 question in 1 round, then your turn");
    expect(html).toContain("Start practicing");
    expect(html).toContain("What they&#x27;re checking: ");
    expect(html).toContain("Not practiced yet");
  });

  it("shows the sample pack and practice meter in the reader's language", async () => {
    const es = renderToStaticMarkup(await inLocale("es", <SamplePack />));
    expect(es).toContain("Paquete de preparación de ejemplo");
    expect(es).toContain("Lo que evalúan: ");
    const de = renderToStaticMarkup(await inLocale("de", <PracticeMeter got={2} total={5} />));
    expect(de).toContain("2 von 5 geübt");
    expect(renderToStaticMarkup(inEnglish(<PracticeMeter got={2} total={5} />))).toContain(
      "Practiced 2 of 5",
    );
  });

  it("words the interview day, the picker and the copied pack in Spanish", async () => {
    const prep = await loadMessages("es", "prep");
    const applications = await loadMessages("es", "applications");
    const format = formatFor("es");
    expect(interviewDayLine(noon(22), NOW, prep, format)).toBe("Entrevista hoy");
    expect(interviewDayLine(noon(18), NOW, prep, format)).toMatch(/^La entrevista fue el /);
    const [choice] = prepPickerChoices(
      [{ id: "a", company: "Mapline", role: "Data Engineer", status: "interview" } as Application],
      [],
      prep,
      applications,
    );
    expect(choice?.label).toBe("Mapline, Data Engineer (En entrevistas)");
    const text = prepToText(PREP, { company: "", role: "" }, prep);
    expect(text).toContain("Preparación para entrevistas: Data Engineer en Mapline");
    expect(text).toContain("Ronda 1 · Habilidades");
    expect(text).toContain("Tus historias (STAR)");
  });

  it("says what a prep costs in the reader's language, and English as before", async () => {
    const usage = { used: 2, limit: 30 };
    const period = { kind: "month", resetsAt: noon(30), renews: true } as const;
    const es = prepAllowance(usage, period, await loadMessages("es", "app"), formatFor("es"));
    expect(es).toMatch(/^Usa 1 de tus 30 cartas de presentación/);
    expect(prepAllowance(usage, period)).toBe(
      "Uses 1 of your 30 cover letters, outreach messages, answers and interview prep this month. 28 left.",
    );
    expect(prepAllowance({ used: 30, limit: 30 }, period)).toBe(
      "You've used all 30 cover letters, outreach messages, answers and interview prep this month. They reset on Nov 30, when your plan renews.",
    );
  });
});

describe("the English messages match the English the app already had", () => {
  it("keeps the focus, level, feature and working lines word for word", () => {
    for (const [focus, copy] of Object.entries(FOCUS_COPY)) {
      expect(EN_PREP.focus[focus as keyof typeof FOCUS_COPY]).toEqual(copy);
    }
    expect(EN_PREP.levels).toEqual(LEVEL_COPY);
    expect(EN_APP.features).toEqual(FEATURE_LABELS);
    expect(EN_APP.working).toEqual(OTTO.working);
  });
});
