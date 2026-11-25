import { describe, expect, it } from "vitest";
import { createSampleResume } from "@/lib/resume/sample";
import { resumeProse } from "@/lib/resume/lang";
import { detectionWords, detectLanguage, languageOf } from "./detect";
import { contentLangOf, isContentLang, localeOfLang } from "./languages";

const RESUME_LINES = {
  en: [
    "Built REST APIs in Node.js that cut page load time from 3s to 0.8s",
    "Managed a team of 5 engineers across two time zones",
    "Responsible for the onboarding of new customers and their first invoices",
    "Increased sales by 20% for the Los Angeles region through weekly calls",
  ],
  es: [
    "Desarrollé una API REST con Node.js para el equipo de pagos",
    "Gestión de un equipo de 5 desarrolladores y coordinación con clientes",
    "Reduje el tiempo de carga de la página en un 40% mediante caché",
    "Responsable de la atención al cliente y de las ventas en la zona norte",
  ],
  pt: [
    "Desenvolvi uma API REST com Node.js para a equipe de pagamentos",
    "Gestão de uma equipe de 5 desenvolvedores e coordenação com clientes",
    "Reduzi o tempo de carregamento da página em 40% com cache",
    "Responsável pelo atendimento ao cliente e pelas vendas na região sul",
  ],
  fr: [
    "Développé une API REST avec Node.js pour l'équipe des paiements",
    "Gestion d'une équipe de 5 développeurs et coordination avec les clients",
    "Réduit le temps de chargement de la page de 40 % grâce au cache",
    "Responsable du service client et des ventes dans la région nord",
  ],
  de: [
    "Entwicklung einer REST-API mit Node.js für das Zahlungsteam",
    "Leitung eines Teams von 5 Entwicklern und Abstimmung mit Kunden",
    "Ladezeit der Seite durch Caching um 40 % verkürzt",
    "Verantwortlich für den Kundenservice und den Vertrieb in der Region Nord",
  ],
} as const;

const JOB_POSTS = {
  en: "We're hiring a backend engineer to build our payments platform. You have 3+ years of experience with Go and PostgreSQL, and you care about reliability.",
  es: "Buscamos un desarrollador backend con experiencia en Go y PostgreSQL. Requisitos: 3 años de experiencia, inglés avanzado y ganas de aprender. Ofrecemos trabajo remoto.",
  pt: "Buscamos uma pessoa desenvolvedora backend com experiência em Go e PostgreSQL. Requisitos: 3 anos de experiência e inglês avançado. Oferecemos trabalho remoto.",
  fr: "Nous recherchons un développeur backend avec une expérience en Go et PostgreSQL. Profil recherché : 3 ans d'expérience, un bon niveau d'anglais et l'envie d'apprendre.",
  de: "Wir suchen eine Backend-Entwicklerin oder einen Backend-Entwickler mit Erfahrung in Go und PostgreSQL. Anforderungen: 3 Jahre Erfahrung und sehr gute Englischkenntnisse.",
} as const;

describe("detectLanguage", () => {
  describe.each(Object.entries(RESUME_LINES))("%s resume lines", (lang, lines) => {
    it.each(lines)("reads %s", (line) => {
      expect(detectLanguage(line).lang).toBe(lang);
    });

    it("reads the lines together, and surely", () => {
      const together = detectLanguage(lines.join("\n"));
      expect(together.lang).toBe(lang);
      expect(together.confidence).toBeGreaterThanOrEqual(0.65);
    });
  });

  it.each(Object.entries(JOB_POSTS))("reads a %s job post", (lang, post) => {
    const found = detectLanguage(post);
    expect(found.lang).toBe(lang);
    expect(found.confidence).toBeGreaterThan(0.7);
  });

  it.each([
    "",
    "   ",
    "Led 3 hires",
    "Python, Go, Kubernetes, AWS, Terraform",
    "2019 – 2021",
    "jane@example.com | +1 415 555 0134",
  ])("is unsure about %j", (text) => {
    expect(detectLanguage(text)).toMatchObject({ lang: "unknown" });
  });

  it("isn't fooled by foreign place and company names in an English resume", () => {
    const text = [
      "Software engineer at Mercado Libre in Buenos Aires, then Los Angeles and San José.",
      "Built the checkout for Banco do Brasil and Société Générale with a team of 4.",
      "Studied at the Universidad de Chile and the Technische Universität München.",
    ].join("\n");
    expect(detectLanguage(text).lang).toBe("en");
  });

  it("ignores words in capitals, like MIT or LA", () => {
    expect(detectLanguage("MIT LA DE DIE DER").lang).toBe("unknown");
  });

  it("reads English for the sample resume", () => {
    expect(detectLanguage(resumeProse(createSampleResume(0))).lang).toBe("en");
  });

  it("tells Spanish from Portuguese when they share most words", () => {
    expect(detectLanguage("Gestión de proyectos y coordinación de equipos de ventas").lang).toBe("es");
    expect(detectLanguage("Gestão de projetos e coordenação de equipes de vendas").lang).toBe("pt");
  });

  it("gives a confidence between 0 and 1", () => {
    for (const text of [...Object.values(JOB_POSTS), "Led 3 hires", ""]) {
      const { confidence } = detectLanguage(text);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    }
  });

  it("reads only the start of a very long text", () => {
    const long = `${JOB_POSTS.fr} ${"x ".repeat(50_000)} ${JOB_POSTS.de.repeat(20)}`;
    expect(detectLanguage(long).lang).toBe("fr");
  });
});

describe("languageOf", () => {
  it("falls back when unsure", () => {
    expect(languageOf("Led 3 hires")).toBe("en");
    expect(languageOf("Led 3 hires", "de")).toBe("de");
    expect(languageOf(JOB_POSTS.pt, "de")).toBe("pt");
  });
});

describe("detectionWords", () => {
  it("splits French elisions and keeps English contractions whole", () => {
    expect(detectionWords("L’équipe d'ingénieurs qu'on a formée").map((word) => word.lower)).toEqual([
      "l'",
      "équipe",
      "d'",
      "ingénieurs",
      "qu'",
      "on",
      "a",
      "formée",
    ]);
    expect(detectionWords("I'm sure it's the team's").map((word) => word.lower)).toEqual([
      "i'm",
      "sure",
      "it's",
      "the",
      "team's",
    ]);
  });
});

describe("content languages", () => {
  it("knows the five languages", () => {
    expect(isContentLang("pt")).toBe(true);
    expect(isContentLang("pt-BR")).toBe(false);
    expect(isContentLang("it")).toBe(false);
  });

  it("maps tags and UI locales to a content language", () => {
    expect(contentLangOf("pt-BR")).toBe("pt");
    expect(contentLangOf("es_MX")).toBe("es");
    expect(contentLangOf("DE")).toBe("de");
    expect(contentLangOf("it")).toBeNull();
    expect(contentLangOf(undefined)).toBeNull();
  });

  it("formats each language with its UI locale", () => {
    expect(localeOfLang("pt")).toBe("pt-BR");
    expect(localeOfLang("en")).toBe("en");
  });
});
