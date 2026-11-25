import { Suspense } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { loadMessages } from "@/i18n/messages";
import { contentView } from "@/lib/portfolio/content-view";
import { jordanContent, jordanGitHub, jordanV2Resume } from "@/lib/portfolio/fixtures/jordan";
import type { PortfolioTemplateId } from "@/lib/portfolio/types";
import { portfolioView } from "@/lib/portfolio/view";
import { LazyTemplate, loadDesignWords, loadTemplate } from "./lazy";
import { PORTFOLIO_TEMPLATES } from "./registry";
import type { DesignWords } from "./types";

const NOW = Date.UTC(2026, 10, 8);

// A Spanish resume: the owner's words stay as written, the design's own words follow the resume.
function spanishPage() {
  const resume = { ...jordanV2Resume(), lang: "es" as const };
  const view = portfolioView(resume, { showEmail: true, showPhone: false, hiddenSections: [] });
  const content = contentView({ view, content: jordanContent(), github: jordanGitHub(), now: NOW });
  return { view, content };
}

let words: DesignWords;

beforeAll(async () => {
  words = await loadMessages("es", "portfolioDesigns");
  await Promise.all([loadTemplate("navy"), loadTemplate("gazette"), loadDesignWords("es")]);
});

function draw(id: PortfolioTemplateId): string {
  const { Component } = PORTFOLIO_TEMPLATES[id];
  return renderToStaticMarkup(
    <Component {...spanishPage()} words={words} resumeHref="/s/AbCdEfGhJkLmNp" />,
  );
}

describe("a portfolio whose resume is in Spanish", () => {
  it("draws Navy's own words in Spanish, around the owner's", () => {
    const html = draw("navy");
    for (const spanish of [
      "Saltar al contenido",
      'aria-label="Inicio"',
      "Hola, me llamo",
      "Contáctame",
      "Sobre mí",
      "Dónde he trabajado",
      "Algunas cosas que he creado",
      "¿Qué sigue?",
      "Escríbeme",
      ">CV</a>",
    ])
      expect(html).toContain(spanish);
    for (const english of [
      "Hi, my name is",
      "Get In Touch",
      "Where I’ve Worked",
      "Skip to Content",
    ])
      expect(html).not.toContain(english);
    expect(html).toContain("Jordan Ellis");
  });

  it("prints Gazette's newspaper in Spanish, dates included", () => {
    const html = draw("gazette");
    for (const spanish of [
      "Edición matutina",
      "Todo el trabajo digno de lanzarse.",
      "En esta edición",
      "Pasa la página",
      "Telegramas al director",
      "Lee el currículum",
      "Así concluye la edición matutina",
    ])
      expect(html).toContain(spanish);
    for (const english of [
      "Morning Edition",
      "Turn the page",
      "In this edition",
      "Read the Resume",
    ])
      expect(html).not.toContain(english);
    expect(html).toMatch(/Edición matutina — \d{1,2} de [a-z]+ de \d{4}/);
  });

  it("shows the editor's preview in the page's language, not the visitor's", () => {
    const html = renderToStaticMarkup(
      <Suspense fallback={<p>Loading the design</p>}>
        <LazyTemplate id="navy" {...spanishPage()} />
      </Suspense>,
    );
    expect(html).toContain("Hola, me llamo");
    expect(html).not.toContain("Hi, my name is");
  });
});
