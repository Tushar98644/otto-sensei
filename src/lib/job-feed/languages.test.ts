import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { listings } from "@/db/schema";
import { LOCALES } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { readWorkProfile, saveLookingFor } from "@/lib/eligibility/records";
import { matchLead } from "@/components/dashboard/jobs/view";
import { langCodes, langOfFlags, readFlags } from "./codes";
import { defaultJobLangs, jobLangsFor } from "./job-langs";
import { placeLine, regionNamesFor, roleName, searchingLine } from "./looking-for";
import { ENGLISH_MATCH_COPY, matchJob, personFrom, unmatched } from "./match";
import { poolOpenings, readStoredCounts, rebuildMatchIndex } from "./match-index";
import { postLanguage } from "./normalize";
import type { RawJob } from "./parsers";
import { rankJobs } from "./rank";
import { minYearsOf } from "./roles";
import { refreshSkillWeights, saveJobs, syncBoards } from "./store";
import { DEFAULT_FILTERS, NO_CHOICE } from "./types";

const DAY = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 25, 6);
const ACME = { source: "greenhouse" as const, board: "acme" };

describe("years asked for, in every language", () => {
  it.each([
    ["5+ años de experiencia en desarrollo backend con Go.", 5],
    ["Al menos 3 años de experiencia comprobable como desarrollador.", 3],
    ["Experiencia mínima de 2 años en roles similares.", 2],
    ["Buscamos alguien con 3 a 5 años de experiencia en Python.", 3],
    ["3 anos de experiência com Java e Spring.", 3],
    ["Pelo menos 4 anos de experiência em vendas B2B.", 4],
    ["Experiência de 2 anos com React.", 2],
    ["Vous avez 5 ans d'expérience en développement web.", 5],
    ["Au moins 3 ans d’expérience significative sur un poste similaire.", 3],
    ["Une expérience de 2 ans minimum est requise.", 2],
    ["Mindestens 5 Jahre Berufserfahrung in der Softwareentwicklung.", 5],
    ["3+ Jahre Erfahrung mit Kubernetes.", 3],
    ["Berufserfahrung von mindestens 2 Jahren im Vertrieb.", 2],
    ["2-3 Jahre einschlägige Berufserfahrung.", 2],
    // English reads exactly as before.
    ["5+ years of experience building APIs.", 5],
    ["At least 3 years of professional experience.", 3],
  ])("%s → %i", (text, years) => {
    expect(minYearsOf(text)).toBe(years);
  });

  it.each([
    "Erste Berufserfahrung ist von Vorteil.",
    "Mehrjährige Berufserfahrung im Vertrieb.",
    "Experiencia en atención al cliente.",
    "Nous sommes une équipe de 25 personnes depuis 10 ans.",
    "Empresa fundada hace 30 años.",
  ])("asks for no number of years: %s", (text) => {
    expect(minYearsOf(text)).toBeNull();
  });
});

describe("a post's language", () => {
  it.each([
    [
      "Desarrollador Backend",
      "Buscamos un desarrollador con experiencia en Go para nuestro equipo de pagos.",
      "es",
    ],
    [
      "Desenvolvedor Backend",
      "Estamos procurando uma pessoa desenvolvedora para o nosso time de pagamentos.",
      "pt",
    ],
    [
      "Développeur Backend",
      "Nous recherchons un développeur pour rejoindre notre équipe paiements à Paris.",
      "fr",
    ],
    [
      "Backend-Entwickler",
      "Wir suchen eine Entwicklerin oder einen Entwickler für unser Team in Berlin.",
      "de",
    ],
    [
      "Backend Engineer",
      "We are looking for an engineer to join our payments team and build services.",
      "en",
    ],
  ] as const)("%s reads as %s", (title, text, lang) => {
    expect(postLanguage(title, text)).toBe(lang);
  });

  it("stays unknown when there is too little to read", () => {
    expect(postLanguage("Go", "")).toBeNull();
  });

  it("is kept in three spare flag bits, null for a row read before", () => {
    const flags = readFlags({
      remote: true,
      evergreen: false,
      employmentType: "contract",
      lang: "de",
    });
    expect(langOfFlags(flags)).toBe("de");
    expect(flags & 1).toBe(1);
    expect(
      langOfFlags(readFlags({ remote: false, evergreen: false, employmentType: null })),
    ).toBeNull();
    expect(langCodes(["en"])).toEqual([0, 1]);
    expect(langCodes(["es", "pt"])).toEqual([2, 3]);
  });
});

describe("the job languages a list keeps", () => {
  it("keeps every language until the setting is live, unless the account chose", () => {
    expect(jobLangsFor(null, "es")).toBeNull();
    expect(jobLangsFor(undefined, "en")).toBeNull();
    expect(jobLangsFor(["de", "en"], "en")).toEqual(["en", "de"]);
    expect(jobLangsFor(["en", "es", "pt", "fr", "de"], "en")).toBeNull();
  });

  it("defaults to the app's language and English once live", () => {
    expect(defaultJobLangs("pt-BR")).toEqual(["pt", "en"]);
    expect(defaultJobLangs("en")).toEqual(["en"]);
    expect(jobLangsFor(null, "fr", true)).toEqual(["en", "fr"]);
  });
});

function raw(id: string, overrides: Partial<RawJob> = {}): RawJob {
  return {
    externalId: id,
    company: "Acme",
    title: `Backend Engineer ${id}`,
    location: "Remote - Germany",
    remote: true,
    employmentType: "full_time",
    postedAt: NOW - DAY,
    validThrough: null,
    url: `https://job-boards.greenhouse.io/acme/jobs/${id}`,
    text: `We build services in Go and PostgreSQL on Kubernetes for our customers. Job ${id}.`,
    ...overrides,
  };
}

const POSTS = [
  raw("en", { title: "Backend Engineer" }),
  raw("es", {
    title: "Desarrollador Backend",
    text: "Buscamos un desarrollador con 5+ años de experiencia en Go, PostgreSQL y Kubernetes para nuestro equipo.",
  }),
  raw("pt", {
    title: "Desenvolvedor Backend",
    text: "Estamos procurando uma pessoa desenvolvedora com experiência em Go, PostgreSQL e Kubernetes para o nosso time.",
  }),
  raw("de", {
    title: "Backend-Entwickler",
    text: "Wir suchen dich mit mindestens 5 Jahre Berufserfahrung in Go, PostgreSQL und Kubernetes für unser Team.",
  }),
];

const QUERY = {
  skills: ["Go", "PostgreSQL", "Kubernetes"],
  families: ["engineering" as const],
  seniority: "mid" as const,
  filters: DEFAULT_FILTERS,
  weights: new Map<string, number>(),
  places: null,
};

describe("posts in other languages in the match index", () => {
  beforeEach(async () => {
    await resetDb();
    await syncBoards(await getDb(), [{ ats: "greenhouse", token: "acme", company: "Acme" }]);
  });

  async function ingest(list: RawJob[]) {
    const db = await getDb();
    await saveJobs(db, ACME, list, NOW, { snapshot: true });
    await refreshSkillWeights(db, NOW);
    await rebuildMatchIndex(db, NOW);
    return db;
  }

  it("stores each post's language and keeps it through the rebuild", async () => {
    const db = await ingest(POSTS);
    const rows = await db
      .select({ ext: listings.ext, flags: listings.flags, occ: listings.occ })
      .from(listings);
    const byExt = new Map(rows.map((row) => [row.ext, row]));
    expect(Object.fromEntries(rows.map((row) => [row.ext, langOfFlags(row.flags)]))).toEqual({
      en: "en",
      es: "es",
      pt: "pt",
      de: "de",
    });
    // The rebuild reads every title, so the Spanish, Portuguese and German ones get their occupation too.
    for (const ext of ["en", "es", "pt", "de"]) expect(byExt.get(ext)?.occ).toBeGreaterThan(0);
  });

  it("keeps the languages asked for, reading a row of no known language as English", async () => {
    const db = await ingest(POSTS);
    await db.update(listings).set({ flags: 4 }).where(eq(listings.ext, "en"));
    const counts = await readStoredCounts(db);
    const titles = async (langs: ("en" | "es" | "pt" | "fr" | "de")[] | null) =>
      (await poolOpenings(db, { ...QUERY, langs }, counts, NOW)).openings
        .map((item) => item.row.title)
        .sort();
    expect(await titles(null)).toHaveLength(4);
    expect(await titles(["en"])).toEqual(["Backend Engineer"]);
    expect(await titles(["es", "pt"])).toEqual(["Desarrollador Backend", "Desenvolvedor Backend"]);
    expect(await titles(["en", "de"])).toEqual(["Backend Engineer", "Backend-Entwickler"]);
  });

  it("leaves out Spanish and German posts asking for more years than an entry-level role allows", async () => {
    const db = await ingest(POSTS);
    const counts = await readStoredCounts(db);
    const titles = async (seniority: "junior" | "senior") =>
      (await poolOpenings(db, { ...QUERY, seniority }, counts, NOW)).openings
        .map((item) => item.row.title)
        .sort();
    expect(await titles("junior")).toEqual(["Backend Engineer", "Desenvolvedor Backend"]);
    expect(await titles("senior")).toHaveLength(4);
  });

  it("writes the reasons in the reader's language and keeps English as it was", async () => {
    await ingest(POSTS);
    const db = await getDb();
    const user = await createUser("ana@example.com");
    const request = {
      userId: user.id,
      view: "matches" as const,
      profile: { skills: ["Go", "PostgreSQL"], titles: ["Desarrollador Backend"], years: 6 },
      filters: DEFAULT_FILTERS,
      page: 1,
      workProfile: null,
      deviceTimeZone: "",
      now: NOW,
    };
    const english = await rankJobs(db, request);
    expect(english.jobs).toHaveLength(4);
    expect(english.jobs[0]?.match.reason).toMatch(
      /^Found in your resume: Go, PostgreSQL\. Not found: Kubernetes\.$/,
    );
    const spanish = await rankJobs(db, {
      ...request,
      copy: { words: await loadMessages("es", "matchReasons"), locale: "es" },
      langs: ["es", "en"],
    });
    expect(spanish.jobs.map((job) => job.title).sort()).toEqual([
      "Backend Engineer",
      "Desarrollador Backend",
    ]);
    expect(spanish.jobs[0]?.match.reason).toBe(
      "Está en tu currículum: Go, PostgreSQL. No está en tu currículum: Kubernetes.",
    );
  });
});

describe("the words of a match", () => {
  const person = personFrom(
    { skills: ["Go"], titles: ["Backend Engineer"], years: 1 },
    { family: "engineering", level: "junior" },
  );
  const job = {
    title: "Senior Backend Engineer",
    keywords: ["Go", "Rust", "Kafka", "Redis", "gRPC"],
    seniority: "lead" as const,
    minYears: 5,
    family: "engineering" as const,
  };

  it("reads as before in English", () => {
    expect(matchJob(person, job)).toMatchObject({
      reason: "Found in your resume: Go. Not found: Rust, Kafka, Redis and 1 more.",
      notes: [
        "This is a lead or staff role, a step up from your latest title.",
        "Asks for 5+ years; your resume shows about 1 year.",
      ],
    });
    expect(matchJob(person, job, undefined, ENGLISH_MATCH_COPY)).toEqual(matchJob(person, job));
    expect(unmatched({ ...job, keywords: [] }).reason).toBe(
      "This resume and this post have nothing in common that I can check.",
    );
  });

  it.each(LOCALES.filter((locale) => locale !== "en"))("reads in %s", async (locale) => {
    const words = await loadMessages(locale, "matchReasons");
    const match = matchJob(person, job, undefined, { words, locale })!;
    expect(match.reason).not.toMatch(/Found in your resume|Not found/);
    expect(match.notes).toHaveLength(2);
    expect(match.notes.join(" ")).toContain("5+");
  });

  it.each(LOCALES)(
    "leaves the card's lead without the %s list of skills not found",
    async (locale) => {
      const words = await loadMessages(locale, "matchReasons");
      const { card } = await loadMessages(locale, "jobs");
      expect(words.notFound.startsWith(card.notFound)).toBe(true);
      const noSkills = { ...job, keywords: ["Rust"], seniority: "junior" as const, minYears: null };
      const match = matchJob(person, noSkills, undefined, { words, locale })!;
      const lead = matchLead(match, card.notFound);
      expect(lead).toBeTruthy();
      expect(lead).not.toContain("Rust");
    },
  );
});

describe("Looking for, in other words", () => {
  it("reads as before in English", () => {
    const value = { title: "", family: "data" as const, level: "junior" as const };
    expect(searchingLine(value, null, false)).toBe("Looking for entry-level data and AI jobs…");
    expect(roleName(value, null, false)).toBe("Any data and AI role");
    expect(placeLine({ place: "c:GB", remote: true })).toBe("Remote, UK");
  });

  it("uses the reader's words and country names", async () => {
    const words = await loadMessages("es", "jobsShared");
    const value = { title: "", family: "data" as const, level: "junior" as const };
    expect(searchingLine(value, null, false, words)).toBe(
      "Buscando empleos de datos e IA de nivel inicial…",
    );
    expect(roleName(value, null, false, words)).toBe("Cualquier puesto de datos e IA");
    expect(placeLine({ place: "c:DE", remote: false }, words, regionNamesFor("es"))).toBe(
      "Remoto o presencial, Alemania",
    );
  });
});

describe("the saved job languages", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("are kept with Looking for, left as they are when a choice doesn't name them", async () => {
    const user = await createUser("lena@example.com");
    expect((await readWorkProfile(user.id)).lookingFor).toEqual(NO_CHOICE);
    await saveLookingFor(user.id, { ...NO_CHOICE, langs: ["de", "en"] });
    expect((await readWorkProfile(user.id)).lookingFor.langs).toEqual(["de", "en"]);
    await saveLookingFor(user.id, { ...NO_CHOICE, remote: true });
    expect((await readWorkProfile(user.id)).lookingFor).toMatchObject({
      remote: true,
      langs: ["de", "en"],
    });
    await saveLookingFor(user.id, { ...NO_CHOICE, langs: null });
    expect((await readWorkProfile(user.id)).lookingFor).toEqual(NO_CHOICE);
  });
});
