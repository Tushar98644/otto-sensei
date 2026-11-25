import { describe, expect, it } from "vitest";
import { CONTENT_LANGS, type ContentLang } from "@/lib/i18n/languages";
import { emptyResume, newBullet, newExperience, type Resume } from "@/lib/resume/schema";
import { lintBullet, lintResume, lintSummary } from "../bullets";
import { lineEnding, punctuationIssues } from "../punctuation";
import type { LintIssueId } from "../types";
import { CHECK_LANGS, LINT_LANGUAGES, lintLanguage, runs } from ".";

const work = (lang: ContentLang) => ({ kind: "work", lang }) as const;
const ids = (text: string, lang: ContentLang) => lintBullet(text, work(lang)).map((i) => i.id);

const STRONG: Record<Exclude<ContentLang, "en">, string[]> = {
  es: [
    "Reduje el tiempo de carga de la página un 40% mediante caché en el CDN",
    "Gestión de un equipo de 5 desarrolladores para el lanzamiento de la app móvil",
    "Implementé un sistema de alertas usado por tres equipos de soporte",
    "Aumenté las ventas un 20% automatizando el seguimiento de clientes",
    "Lideré la migración a la nube de 40 servicios en seis meses",
  ],
  pt: [
    "Reduzi o tempo de carregamento da página em 40% com cache no CDN",
    "Gestão de uma equipe de 5 desenvolvedores no lançamento do app",
    "Aumentei as vendas em 20% no último ano",
    "Liderei a migração de 40 serviços para a nuvem em seis meses",
  ],
  fr: [
    "Réduit le temps de chargement de la page de 40 % grâce au cache",
    "Gestion d'une équipe de 5 développeurs pour le lancement de l'application",
    "Augmenté les ventes de 20 % en automatisant les relances",
    "Développé une API utilisée par trois équipes support",
  ],
  de: [
    "Ladezeit der Seite durch Caching um 40 % verkürzt",
    "Leitung eines Teams von 5 Entwicklern beim Launch der App",
    "Steigerung des Umsatzes um 20 % im Jahr 2023",
    "Aufbau eines Monitoring-Systems für drei Support-Teams",
  ],
};

const FLAGGED: Record<Exclude<ContentLang, "en">, [string, LintIssueId[]][]> = {
  es: [
    ["Responsable de la atención al cliente en la zona norte", ["duty"]],
    ["Ayudé con la migración de la base de datos a PostgreSQL", ["weak-start", "no-result"]],
    [
      "Persona proactiva con capacidad de trabajo en equipo y orientada a resultados",
      ["stock-phrase", "no-result"],
    ],
    ["Mi rol fue coordinar a varios proveedores", ["first-person", "no-result", "vague"]],
    ["Aumenté las ventas un 20% en 2023", ["no-method"]],
    ["Mejoré el proceso de incorporación de nuevos clientes", ["no-number"]],
    ["Participé en 5 hackatones", ["weak-start", "too-short"]],
  ],
  pt: [
    ["Responsável pelo atendimento ao cliente na região sul", ["duty"]],
    [
      "Participei de vários projetos de migração para a nuvem",
      ["weak-start", "no-result", "vague"],
    ],
    [
      "Profissional proativo com foco em resultados e espírito de equipe",
      ["stock-phrase", "no-result"],
    ],
    ["Melhorei o processo de integração de novos clientes", ["no-number"]],
    ["Eu desenvolvi o sistema de cobrança para 40 clientes", ["first-person"]],
  ],
  fr: [
    ["Responsable de la relation client sur la région nord", ["duty"]],
    [
      "J'ai participé à plusieurs projets de migration vers le cloud",
      ["first-person", "weak-start", "no-result", "vague"],
    ],
    [
      "Rigoureux, force de proposition et doté d'un excellent relationnel",
      ["stock-phrase", "no-result"],
    ],
    ["Amélioré le parcours d'inscription des nouveaux clients", ["no-number"]],
    ["Doté d'un bon esprit d'équipe pour livrer 3 projets", ["stock-phrase"]],
  ],
  de: [
    ["Verantwortlich für den Kundenservice in der Region Nord", ["duty"]],
    [
      "Mitarbeit an verschiedenen Projekten zur Cloud-Migration",
      ["weak-start", "no-result", "vague"],
    ],
    [
      "Teamfähig, belastbar und ergebnisorientiert mit hoher Einsatzbereitschaft",
      ["stock-phrase", "no-result"],
    ],
    ["Kostensenkung im Einkauf durch neue Lieferantenverträge", ["no-number"]],
    ["Ich habe das Abrechnungssystem für 40 Kunden entwickelt", ["first-person"]],
  ],
};

describe("language packs", () => {
  describe.each(Object.entries(STRONG))("%s", (lang, lines) => {
    it.each(lines)("passes a strong line: %s", (text) => {
      expect(lintBullet(text, work(lang as ContentLang))).toEqual([]);
    });

    it.each(FLAGGED[lang as Exclude<ContentLang, "en">])("%s -> %j", (text, expected) => {
      expect(ids(text, lang as ContentLang)).toEqual(expected);
    });
  });

  it("fixes the old bug: a line with a result in another language isn't 'no result'", () => {
    const line = "Desarrollé una API REST con Node.js que redujo los errores de pago";
    expect(ids(line, "en")).toContain("no-result");
    expect(ids(line, "es")).not.toContain("no-result");
    expect(ids(line, "es")).toEqual(["no-number"]);
  });

  it.each([
    ["es", "Gestión de inventario y desarrollo de proveedores para 12 tiendas"],
    ["es", "Desarrollo de una plataforma de pagos para 3 países"],
    ["pt", "Gestão de estoque e desenvolvimento de fornecedores para 12 lojas"],
    ["fr", "Gestion des stocks et développement des fournisseurs pour 12 magasins"],
    ["fr", "Conception d'un tableau de bord suivi par 40 commerciaux"],
    ["de", "Leitung von 3 Teams und Entwicklung neuer Lieferantenbeziehungen"],
    ["de", "Entwicklung einer Zahlungsplattform für 3 Länder"],
  ] as const)("doesn't call the noun style weak (%s): %s", (lang, text) => {
    expect(ids(text, lang)).toEqual([]);
  });

  it("runs tense and passive only for English", () => {
    const ended = (lang: ContentLang) => ({ kind: "work", ended: true, lang }) as const;
    expect(
      lintBullet("Build internal tools in React for 3 teams", ended("en")).map((i) => i.id),
    ).toEqual(["tense"]);
    expect(lintBullet("Build internal tools in React for 3 teams", ended("es"))).toEqual([]);
    expect(ids("The database was migrated to Postgres in 2022 by the team", "de")).toEqual([]);
    for (const lang of CONTENT_LANGS.filter((code) => code !== "en")) {
      expect(runs("tense", lintLanguage(lang))).toBe(false);
      expect(runs("passive", lintLanguage(lang))).toBe(false);
    }
  });

  it("runs the language-neutral checks for every language", () => {
    const long = Array.from({ length: 40 }, (_, i) => `palabra${i}`).join(" ");
    for (const lang of CONTENT_LANGS) {
      expect(ids(long, lang)).toContain("too-long");
      expect(ids("Vendí 3 cosas", lang === "en" ? "es" : lang)).toContain("too-short");
    }
  });

  it("gives each language what its checks read", () => {
    for (const lang of CONTENT_LANGS) {
      const pack = LINT_LANGUAGES[lang];
      expect(pack.lang).toBe(lang);
      for (const [id, langs] of Object.entries(CHECK_LANGS) as [LintIssueId, ContentLang[]][]) {
        if (langs.includes(lang)) expect(runs(id, pack), `${lang} ${id}`).toBe(true);
      }
    }
  });

  it("skips a check when a pack lacks its words", () => {
    const bare = { ...lintLanguage("es"), stock: undefined, result: undefined };
    expect(runs("stock-phrase", bare)).toBe(false);
    expect(runs("no-result", bare)).toBe(false);
    expect(runs("too-long", bare)).toBe(true);
  });
});

describe("French elisions", () => {
  it("matches phrases across an apostrophe, straight or curly", () => {
    for (const text of [
      "Esprit d'équipe pour livrer 3 projets",
      "Esprit d’équipe pour livrer 3 projets",
    ]) {
      const issue = lintBullet(text, work("fr")).find((i) => i.id === "stock-phrase");
      expect(issue?.match).toBe(text.slice(0, 15));
    }
  });

  it("reads past J'ai to the first real word", () => {
    expect(
      lintBullet("J'ai aidé à migrer 40 services", work("fr")).find((i) => i.id === "weak-start")
        ?.match,
    ).toBe("aidé à");
  });

  it("leaves English contractions alone", () => {
    expect(lintBullet("Didn't ship it, but cut costs 20% for 3 teams")).toEqual(
      lintBullet("Didn't ship it, but cut costs 20% for 3 teams", { kind: "work", lang: "en" }),
    );
  });
});

describe("issue ids and params", () => {
  it("rides along without changing the English shape", () => {
    const [issue] = lintBullet("Responsible for the website");
    expect(issue).toEqual({
      id: "duty",
      severity: "high",
      message: '"Responsible for" reads like a job description. Say what you did and what changed.',
      match: "Responsible for",
    });
    expect(issue?.messageId).toBe("duty");
    expect(issue?.params).toEqual({ phrase: "Responsible for" });
    expect(Object.keys(issue ?? {})).toEqual(["id", "severity", "message", "match"]);
    expect(JSON.parse(JSON.stringify(issue))).not.toHaveProperty("params");
  });

  it("lists every stock phrase for the message", () => {
    const issue = lintBullet("Results-driven team player passionate about clean code").find(
      (i) => i.id === "stock-phrase",
    );
    expect(issue?.messageId).toBe("stock");
    expect(issue?.params).toEqual({
      phrases: ["Results-driven", "team player", "passionate about"],
      count: 3,
    });
  });
});

function resumeWith(lines: string[], lang?: ContentLang): Resume {
  const job = {
    ...newExperience(),
    endDate: "2024",
    bullets: lines.map((text) => newBullet(text)),
  };
  return { ...emptyResume(0), experience: [job], ...(lang ? { lang } : {}) };
}

describe("lintResume by language", () => {
  const spanish = [
    "Desarrollé una API REST con Node.js que redujo los errores de pago",
    "Lideré la migración a la nube de 40 servicios en seis meses",
    "Responsable de la atención al cliente en la zona norte",
  ];

  it("reads the resume's own language when it has one", () => {
    const lint = lintResume(resumeWith(spanish, "es"));
    const issues = Object.values(lint.byBullet).map((list) => list.map((i) => i.id));
    expect(issues).toEqual([["no-number"], [], ["duty"]]);
  });

  it("detects the language when the resume has none", () => {
    const detected = lintResume(resumeWith(spanish));
    expect(Object.values(detected.byBullet)).toEqual(
      Object.values(lintResume(resumeWith(spanish, "es")).byBullet),
    );
  });

  it("keeps English resumes as they were", () => {
    const english = [
      "Responsible for the website",
      "Cut costs 20% by moving jobs to spot instances",
    ];
    const plain = lintResume(resumeWith(english));
    const marked = lintResume(resumeWith(english, "en"));
    expect(Object.values(plain.byBullet)).toEqual(Object.values(marked.byBullet));
    expect(plain.totals).toEqual(marked.totals);
  });

  it("treats present words in other languages as a current job", () => {
    const job = {
      ...newExperience(),
      endDate: "Actualidad",
      bullets: [newBullet("Build tools for 3 teams")],
    };
    const resume = { ...emptyResume(0), experience: [job], lang: "en" as const };
    expect(Object.values(lintResume(resume).byBullet)[0]?.map((i) => i.id)).not.toContain("tense");
  });

  it("checks the summary in the resume's language", () => {
    expect(
      lintSummary("Ingeniera proactiva y orientada a resultados", "es").map((i) => i.id),
    ).toEqual(["stock-phrase"]);
    expect(lintSummary("Ingeniera proactiva y orientada a resultados")).toEqual([]);
  });
});

describe("full stops in other languages", () => {
  it("reads French closing quotes and spaced marks", () => {
    expect(lineEnding("A reçu le « Prix de l'innovation. »", "fr")).toBe("stop");
    expect(lineEnding("A reçu le « Prix de l'innovation. »")).toBe("none");
    expect(lineEnding("Prêt pour la suite ?", "fr")).toBeNull();
    expect(lineEnding("Gestion des stocks, des achats, etc.", "fr")).toBeNull();
  });

  it("knows each language's abbreviations", () => {
    expect(lineEnding("Kosten gesenkt, Prozesse verbessert usw.", "de")).toBeNull();
    expect(lineEnding("Kosten gesenkt, Prozesse verbessert usw.")).toBe("stop");
  });

  it("flags the odd line out with an id", () => {
    const issues = punctuationIssues(
      [
        { id: "a", text: "Réduit les coûts de 20 %." },
        { id: "b", text: "Livré 3 projets." },
        { id: "c", text: "Formé 4 personnes" },
      ],
      "fr",
    );
    expect([...issues.keys()]).toEqual(["c"]);
    expect(issues.get("c")?.messageId).toBe("stopMost");
  });
});
