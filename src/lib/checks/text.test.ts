import { describe, expect, it } from "vitest";
import de from "@/i18n/messages/de/file-checks";
import en from "@/i18n/messages/en/file-checks";
import es from "@/i18n/messages/es/file-checks";
import type { Extraction, ExtractionSignals } from "@/lib/parse/types";
import { runRecruiterChecks } from "./recruiter";
import { checkText, localizeCheck } from "./text";
import type { CheckId, RecruiterCheck } from "./types";

function extraction(
  lines: string[],
  overrides: Partial<Omit<Extraction, "signals">> = {},
  signals: Partial<ExtractionSignals> = {},
): Extraction {
  const text = lines.join("\n");
  return {
    kind: "pdf",
    text,
    lines,
    pageCount: 1,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    pages: [],
    ...overrides,
    signals: {
      hasTextLayer: true,
      columnLayout: false,
      imageCount: 0,
      tableCount: 0,
      textBoxCount: 0,
      headerFooterText: "",
      iconGlyphCount: 0,
      ...signals,
    },
  };
}

const FILLER = Array.from(
  { length: 12 },
  (_, i) => `• Shipped improvement number ${i + 1} for the billing team and its customers.`,
);
const PARAGRAPH = Array.from({ length: 70 }, () => "word").join(" ");

function resume({ contact = "jane@example.com | +1 555 123 4567", experience = FILLER, dates = ["Jan 2021 - Present", "Mar 2018 - Dec 2020"], extra = ["EDUCATION", "BSc Physics, University of Somewhere\t2014 - 2018", "SKILLS", "Python, Go, SQL"] } = {}) {
  return [
    "Jane Doe",
    contact,
    "EXPERIENCE",
    `Engineer, Acme Corp\t${dates[0]}`,
    ...experience.slice(0, Math.ceil(experience.length / 2)),
    `Developer, Beta Labs\t${dates[1]}`,
    ...experience.slice(Math.ceil(experience.length / 2)),
    ...extra,
  ];
}

const EXTRACTIONS: Extraction[] = [
  extraction(resume()),
  extraction(["Hello"], {}, { hasTextLayer: false, imageCount: 1 }),
  extraction(["Hello"], { kind: "docx" }, { hasTextLayer: false }),
  extraction(resume(), { kind: "docx", pageCount: 3, wordCount: 1500 }, { iconGlyphCount: 3, imageCount: 2, tableCount: 1, textBoxCount: 1, columnLayout: true }),
  extraction(resume(), { kind: "docx" }, { iconGlyphCount: 1, imageCount: 1, tableCount: 2, textBoxCount: 2 }),
  extraction(resume(), {}, { columnLayout: true }),
  extraction(resume({ contact: "" }), { kind: "docx" }, { headerFooterText: "jane@example.com +1 555 123 4567" }),
  extraction(resume({ contact: "+1 555 123 4567" }), { kind: "docx" }, { headerFooterText: "jane@example.com" }),
  extraction(resume({ contact: "jane@example.com" }), { kind: "docx" }, { headerFooterText: "+1 555 123 4567" }),
  extraction(resume({ contact: "" })),
  extraction(resume({ dates: ["Jan 2021 - Present", "03/2018 - 12/2020"] })),
  extraction(resume({ dates: ["", ""] })),
  extraction(resume({ experience: [PARAGRAPH, PARAGRAPH] }), { kind: "docx" }),
  extraction(resume({ extra: [] })),
  extraction(resume({ extra: ["SKILLS", "Go"] })),
  extraction(resume({ extra: ["EDUCATION", "BSc"] })),
  extraction(["Jane", "PROJECTS", "Chess bot", "EDUCATION", "BSc", "SKILLS", "Go"]),
  extraction(["Jane", "jane@example.com", "EDUCATION", "BSc", "SKILLS", "Go"]),
  extraction(["Jane", "EXPERIENCE", "Did things"]),
  extraction(["Jane", "Engineer Jan 2020 - Mar 2021", "EDUCATION", "BSc"], {}, { columnLayout: true }),
];

const CHECKS: RecruiterCheck[] = EXTRACTIONS.flatMap((item) => runRecruiterChecks(item, 0).checks);

describe("file check words", () => {
  it("cover every result and fix the checks can give", () => {
    const keys = new Set(CHECKS.map((check) => check.copy?.key));
    expect(Object.keys(en.results).filter((key) => !keys.has(key as never))).toEqual([]);
    const fixes = new Set(CHECKS.map((check) => check.copy?.fix));
    expect(Object.keys(en.fixes).filter((key) => !fixes.has(key as never))).toEqual([]);
  });

  it("rebuild the English exactly", () => {
    for (const check of CHECKS) {
      expect(checkText(check, en, "en"), check.copy?.key).toEqual({
        title: check.title,
        detail: check.detail,
        fix: check.fix,
      });
    }
  });

  it("read in Spanish and German", () => {
    const [report] = [runRecruiterChecks(EXTRACTIONS[3]!, 0)];
    const byId = (id: CheckId) => report.checks.find((check) => check.id === id)!;
    expect(localizeCheck(byId("tables"), es, "es")).toMatchObject({
      title: "Hay tablas",
      detail: "Tu archivo tiene 1 tabla. Algunos sistemas leen las celdas en desorden o se las saltan.",
      fix: "Cambia las tablas por líneas de texto normal.",
    });
    expect(localizeCheck(byId("length"), es, "es").detail).toMatch(/^Tu currículum tiene 3 páginas\./);
    const good = runRecruiterChecks(extraction(resume(), { wordCount: 1500 }), 0).checks.find(
      (check) => check.id === "length",
    )!;
    expect(localizeCheck(good, de, "de").detail).toBe(
      "1 Seite und 1.500 Wörter: genug für den Abgleich mit Jobs, kurz genug zum Überfliegen.",
    );
    const sections = runRecruiterChecks(EXTRACTIONS[0]!, 0).checks.find((check) => check.id === "sections")!;
    expect(localizeCheck(sections, es, "es").detail).toBe("Encontramos Experiencia, Educación y Habilidades.");
  });

  it("keeps English for a check saved without its copy", () => {
    const { copy: _copy, ...old } = CHECKS[0]!;
    expect(localizeCheck(old, es, "es")).toEqual(old);
  });
});
