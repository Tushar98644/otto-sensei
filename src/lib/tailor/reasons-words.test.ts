import { describe, expect, it } from "vitest";
import enLint from "@/i18n/messages/en/lint";
import en from "@/i18n/messages/en/studio-tailor";
import esLint from "@/i18n/messages/es/lint";
import es from "@/i18n/messages/es/studio-tailor";
import type { TailorRequirement } from "@/lib/ai/types";
import { lintResume } from "@/lib/lint/bullets";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { jobLines, rowReasons, tailorFixFirst, type ReasonContext } from "./reasons";
import {
  normalizeRequirements,
  screenerCounts,
  screenerHeadline,
  screenerRows,
} from "./requirements";
import { summaryCheck, titleCheck } from "./title-checks";

const NOW = Date.UTC(2026, 10, 11);

function resume(fields: Partial<Resume> = {}): Resume {
  const base = emptyResume(0);
  return {
    ...base,
    basics: { ...base.basics, name: "Dana Cho", headline: "Data Analyst" },
    summary: "",
    experience: [
      {
        id: "lumen",
        title: "Software Engineer",
        company: "Lumen Logistics",
        location: "",
        startDate: "Jan 2022",
        endDate: "Present",
        bullets: [
          { id: "l1", text: "Responsible for maintaining the PostgreSQL database and migrations" },
          { id: "l2", text: "Cut p95 latency from 900ms to 210ms with a Redis cache" },
        ],
      },
    ],
    projects: [
      {
        id: "alerts",
        name: "Transit Alerts",
        link: "",
        bullets: [{ id: "p1", text: "Go service that sends delay alerts to 900 riders" }],
      },
    ],
    certifications: [{ id: "c", name: "AWS Certified Developer", issuer: "", date: "" }],
    skills: [{ id: "s", label: "Tools", items: ["Kubernetes", "Terraform"] }],
    ...fields,
  };
}

const req = (
  id: string,
  text: string,
  terms: string[],
  importance: "must" | "nice" = "must",
): TailorRequirement => ({ id, text, importance, source: "structure", terms, quote: "", ask: "" });

const REQUIREMENTS = [
  req("r1", "CI/CD", ["CI/CD"]),
  req("r2", "Kubernetes", ["Kubernetes"]),
  req("r3", "PostgreSQL, 5+ years", ["PostgreSQL"]),
  req("r4", "Go", ["Go"]),
  req("r5", "AWS", ["AWS"], "nice"),
  req("r6", "Redis", ["Redis"], "nice"),
];

function screener(words?: {
  t: typeof en | typeof es;
  lint: typeof enLint | typeof esLint;
  locale: "en" | "es";
}) {
  const r = resume();
  const rows = screenerRows(r, REQUIREMENTS, words ? { places: words.t.reasons.places } : {});
  const context: ReasonContext = {
    resume: r,
    lint: lintResume(r),
    now: NOW,
    ...(words ? { words: words.t.reasons, lintWords: words.lint, locale: words.locale } : {}),
  };
  const reasons = rowReasons(rows, context);
  const { lines } = jobLines(rows, context);
  const title = titleCheck(r, "Backend Engineer", words?.t.reasons.title);
  const summary = summaryCheck(
    r,
    rows,
    "Backend Engineer",
    words?.t.reasons.summary,
    words?.locale,
  );
  const fixFirst = tailorFixFirst({
    rows,
    reasons,
    lines,
    title,
    summary,
    ...(words ? { words: words.t.reasons, locale: words.locale } : {}),
  });
  const headline = screenerHeadline(screenerCounts(rows), words?.t.reasons.headline);
  return { rows, reasons, lines, title, summary, fixFirst, headline };
}

describe("the screener's words", () => {
  it("are the same in English with or without the messages", () => {
    expect(screener({ t: en, lint: enLint, locale: "en" })).toEqual(screener());
  });

  it("read in Spanish", () => {
    const { rows, reasons, lines, title, fixFirst, headline } = screener({
      t: es,
      lint: esLint,
      locale: "es",
    });
    expect(rows.find((row) => row.id === "r3")?.proof.line?.place).toBe(
      "Software Engineer en Lumen Logistics, línea 1",
    );
    expect(reasons.r2?.text).toBe(
      "Solo en tu lista de habilidades (Tools). Ninguna línea de trabajo muestra que lo usaste, y los filtros lo buscan en lo que hiciste.",
    );
    expect(reasons.r5?.text).toBe(
      "Solo en tus certificaciones. Muéstralo también en una línea sobre lo que hiciste.",
    );
    expect(reasons.r4?.text).toBe(
      "Aparece en tu proyecto Transit Alerts, no en un trabajo. Si lo usaste en el trabajo, dilo en ese trabajo.",
    );
    expect(reasons.r3?.text).toMatch(
      /^Aparece en Lumen Logistics, pero esa línea suena a descripción del puesto\. La oferta pide 5\+ años/,
    );
    expect(lines[0]?.place).toBe("Software Engineer en Lumen Logistics");
    expect(lines[0]?.note).toMatch(
      /^Muestra PostgreSQL, 5\+ years \(un requisito obligatorio\)\. “Responsible for”/,
    );
    expect(title?.status).toBe("differs");
    expect(fixFirst[0]?.title).toBe("Falta 1 requisito obligatorio en tu currículum: CI/CD");
    expect(headline).toBe("Requisitos obligatorios demostrados: 2 de 4 · Deseables: 2 de 2");
  });

  it("asks the fallback question in the app's language", () => {
    const raw = { importance: "must", source: "structure", quote: "", ask: "" };
    const [withTerm, withoutTerm] = normalizeRequirements(
      [
        { ...raw, text: "Python", terms: ["Python"] },
        { ...raw, text: "Mentoring new hires", terms: [] },
      ],
      { ...es.reasons.asks },
    );
    expect(withTerm?.ask).toBe("¿Has usado Python?");
    expect(withoutTerm?.ask).toBe("¿Tienes experiencia con mentoring new hires?");
    expect(normalizeRequirements([{ ...raw, text: "Python", terms: ["Python"] }])[0]?.ask).toBe(
      "Have you used Python?",
    );
  });
});
