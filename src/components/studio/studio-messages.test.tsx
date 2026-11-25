import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STUDIO_NAMESPACES } from "@/app/[lang]/studio/namespaces";
import type { Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/server";
import type { RecruiterReport } from "@/lib/checks/types";
import { ChecksList } from "./review/checks-list";
import { ReadTextPanel } from "./review/read-text-panel";
import { StudioStepper } from "./studio-stepper";
import { inStudio } from "./testing";
import { StartOptions } from "./upload/start-options";

async function render(locale: Locale, ui: ReactNode): Promise<string> {
  const html = renderToStaticMarkup(
    inStudio(ui, locale, await pickMessages(locale, STUDIO_NAMESPACES)),
  );
  return html
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const context = { hasResume: true, hasReport: true, hasTailored: false };

const report: RecruiterReport = {
  kind: "pdf",
  pageCount: 2,
  wordCount: 512,
  checks: [
    { id: "text-layer", status: "pass", title: "Text", detail: "Readable", fix: null },
    { id: "fonts", status: "fail", title: "Fonts", detail: "Odd fonts", fix: "Use a plain font" },
  ],
  counts: { pass: 1, warn: 0, fail: 1 },
  readText: "Alex Morgan\nProduct designer",
  sectionsFound: [],
  checkedAt: 0,
} as unknown as RecruiterReport;

const noop = () => {};
const options = {
  onGuided: noop,
  onLocalFile: noop,
  onScratch: noop,
  onSample: noop,
};

describe("the studio in Spanish", () => {
  it("names the steps and where you are", async () => {
    const text = await render("es", <StudioStepper step="fix" context={context} onSelect={noop} />);
    expect(text).toContain("Paso 3 de 5");
    expect(text).toContain("Corregir líneas");
    expect(text).toContain("Vista del reclutador");
  });

  it("offers the ways to start", async () => {
    const text = await render("es", <StartOptions {...options} />);
    expect(text).toContain("¿Aún no tienes currículum? Créalo con Otto");
    expect(text).toContain("Importar desde LinkedIn");
    expect(text).toContain("Prueba un currículum de ejemplo");
  });

  it("groups the file checks and counts them", async () => {
    const text = await render("es", <ChecksList checks={report.checks} />);
    expect(text).toContain("Lo que revisamos");
    expect(text).toContain("Necesita corrección (1)");
    expect(text).toContain("Cómo corregirlo: Use a plain font");
    expect(text).toContain("1 revisión superada");
  });

  it("shows what hiring software reads, with counts in Spanish", async () => {
    const text = await render("es", <ReadTextPanel report={report} />);
    expect(text).toContain("Lo que lee el software de selección");
    expect(text).toContain("PDF · 2 páginas · 512 palabras");
  });
});

describe("the studio in English", () => {
  it("reads exactly as before", async () => {
    expect(
      await render("en", <StudioStepper step="fix" context={context} onSelect={noop} />),
    ).toContain("Step 3 of 5 · : Fix lines");
    const checks = await render("en", <ChecksList checks={report.checks} />);
    expect(checks).toContain("Needs fixing (1)");
    expect(checks).toContain("How to fix: Use a plain font");
    expect(checks).toContain("1 check passed");
    expect(await render("en", <ReadTextPanel report={report} />)).toContain(
      "PDF · 2 pages · 512 words",
    );
  });
});
