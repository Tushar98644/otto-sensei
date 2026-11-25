import { describe, expect, it } from "vitest";
import { formatFor } from "@/i18n/intl";
import { loadMessages } from "@/i18n/messages";
import {
  findingOf,
  findingText,
  notEnoughLine,
  suggestionCopy,
  waitingLine,
  type Comparison,
  type SuggestionKind,
  type Working,
} from "@/lib/applications/working";
import { gapLine, gapNudge, type SkillGap } from "@/lib/insights/skill-gaps";
import { EN, FORMAT_EN } from "../messages-testing";
import {
  findingLines,
  gapLineText,
  gapNudgeText,
  notEnoughText,
  suggestionText,
  waitingText,
} from "./copy";

const t = EN.applications;
const plain = (template: string) => template.replace(/<\/?b>/g, "");

const group = (sent: number, counted: number, replies: number, interviews: number) => ({
  sent,
  counted,
  replies,
  interviews,
});

const COMPARISONS: Comparison[] = [
  {
    topic: "resume",
    with: group(12, 10, 4, 3),
    without: group(9, 8, 2, 1),
    ready: true,
    measure: "interviews",
    leader: "with",
  },
  {
    topic: "resume",
    with: group(6, 5, 2, 0),
    without: group(6, 5, 1, 0),
    ready: true,
    measure: "replies",
    leader: "same",
  },
  {
    topic: "resume",
    with: group(0, 0, 0, 0),
    without: group(0, 0, 0, 0),
    ready: false,
    measure: "interviews",
    leader: null,
  },
  {
    topic: "resume",
    with: group(2, 1, 0, 0),
    without: group(3, 3, 1, 0),
    ready: false,
    measure: "interviews",
    leader: null,
  },
  {
    topic: "letter",
    with: group(7, 6, 3, 2),
    without: group(9, 9, 2, 1),
    ready: true,
    measure: "interviews",
    leader: "with",
  },
  {
    topic: "letter",
    with: group(2, 2, 1, 0),
    without: group(3, 1, 0, 0),
    ready: false,
    measure: "replies",
    leader: null,
  },
];

describe("What's working, in the dashboard's words", () => {
  it("reads exactly as lib/applications/working does in English", () => {
    for (const comparison of COMPARISONS) {
      const { lead, rest } = findingLines(comparison, t);
      const nbsp = (text: string) => text.replace(/(\d+) of (\d+)/g, "$1 of $2");
      expect(`${plain(lead)} ${rest}`).toBe(nbsp(findingText(findingOf(comparison))));
      expect(notEnoughText(comparison, t, FORMAT_EN)).toBe(notEnoughLine(comparison));
    }
    for (const waiting of [0, 1, 4]) {
      expect(waitingText(waiting, t, FORMAT_EN)).toBe(waitingLine(waiting));
    }
    const [resume, , , , letter] = COMPARISONS as [
      Comparison,
      Comparison,
      Comparison,
      Comparison,
      Comparison,
    ];
    const kinds: SuggestionKind[] = ["log", "tailor", "letter", "apply", "wait"];
    for (const suggestion of kinds) {
      for (const total of [0, 3]) {
        const working: Working = { total, counted: total, waiting: 0, resume, letter, suggestion };
        expect(suggestionText(working, t, FORMAT_EN)).toEqual(suggestionCopy(working));
      }
    }
  });

  it("says it in Spanish", async () => {
    const es = await loadMessages("es", "applications");
    const format = formatFor("es");
    const [first] = COMPARISONS as [Comparison];
    expect(plain(findingLines(first, es).lead)).toBe(
      "Tus versiones adaptadas consiguieron entrevista 3 de 10 veces.",
    );
    expect(waitingText(2, es, format)).toMatch(/^2 postulaciones de los últimos 7 días/);
  });
});

describe("skill gaps, in the dashboard's words", () => {
  const gaps: SkillGap[] = [
    { term: "Airflow", asked: 4, missing: 3, listed: 0, jobs: [], copyIds: [] },
    { term: "dbt", asked: 2, missing: 0, listed: 2, jobs: [], copyIds: [] },
    { term: "Kafka", asked: 1, missing: 1, listed: 1, jobs: [], copyIds: [] },
  ];

  it("reads exactly as lib/insights/skill-gaps does in English", () => {
    for (const gap of gaps) {
      for (const jobs of [1, 5])
        expect(gapLineText(gap, jobs, t, FORMAT_EN)).toBe(gapLine(gap, jobs));
      expect(gapNudgeText(gap, t, FORMAT_EN)).toBe(gapNudge(gap).text);
    }
  });
});
