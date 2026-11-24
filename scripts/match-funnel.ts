// What each matching step keeps per persona: OTTO_PGLITE_DIR=<copy> bun scripts/match-funnel.ts [--set india|global|v2] [--rebuild] [--json out.json]
import { writeFileSync } from "node:fs";
import { isNotNull, sql } from "drizzle-orm";
import { listings, skills } from "@/db/schema";
import { emptyWorkProfile, type WorkProfile } from "@/lib/eligibility/profile";
import { familyOf, FLAG, fromMinutes, unpackOccupation } from "@/lib/job-feed/codes";
import { acceptedPlaces, lookingForOf, placeFit } from "@/lib/job-feed/looking-for";
import { KIND, kindOf, personFrom } from "@/lib/job-feed/match";
import { OCCUPATIONS } from "@/lib/job-feed/occupations";
import { findSkills } from "@/lib/job-feed/skills";
import { PERSONAS, PLACES } from "./match-eval/personas";
import {
  DEFAULT_FILTERS,
  JOB_PAGE_SIZE,
  MAX_JOB_PAGE,
  NO_CHOICE,
  SENIORITIES,
  type MatchProfile,
  type PlaceChoice,
} from "@/lib/job-feed/types";

if (!process.env.OTTO_PGLITE_DIR?.trim()) {
  console.error("Set OTTO_PGLITE_DIR to a copy of the database; this never opens .pglite/.");
  process.exit(1);
}

const DAY_MS = 24 * 60 * 60 * 1_000;
const USER = "00000000-0000-4000-8000-000000000000";

type Persona = { skills: string; titles: string[]; years: number };

const INDIA_PERSONAS: Record<string, Persona> = {
  "Software engineer (mid)": {
    skills:
      "Java, Spring Boot, Python, JavaScript, TypeScript, React, Node.js, SQL, MySQL, PostgreSQL, AWS, Docker, Kubernetes, Git, REST APIs, Microservices",
    titles: ["Software Engineer", "Software Developer"],
    years: 4,
  },
  "Data analyst (junior)": {
    skills: "SQL, Excel, Python, Pandas, Tableau, Power BI, statistics, data visualization",
    titles: ["Data Analyst", "Business Analyst Intern"],
    years: 1,
  },
  "Product manager (senior)": {
    skills:
      "product management, roadmapping, Jira, SQL, A/B testing, Mixpanel, Agile, stakeholder management, Figma, user research",
    titles: ["Senior Product Manager", "Product Manager"],
    years: 8,
  },
  "UI/UX designer (mid)": {
    skills:
      "Figma, Sketch, Adobe XD, prototyping, user research, wireframing, design systems, usability testing, HTML, CSS",
    titles: ["UI/UX Designer", "Product Designer"],
    years: 4,
  },
  "Fresher (B.Tech)": {
    skills: "Java, Python, C++, data structures, algorithms, SQL, HTML, CSS, JavaScript, Git",
    titles: ["Software Engineering Intern"],
    years: 0,
  },
  "Digital marketing (mid)": {
    skills:
      "SEO, SEM, Google Ads, Google Analytics, Facebook Ads, content marketing, email marketing, social media marketing, HubSpot",
    titles: ["Digital Marketing Manager", "Digital Marketing Executive"],
    years: 4,
  },
};

const GLOBAL_PERSONAS: Record<string, Persona> = {
  "Software engineer": INDIA_PERSONAS["Software engineer (mid)"]!,
  "Data analyst": {
    skills: "SQL, Excel, Python, Pandas, Tableau, Power BI, Looker, statistics, data visualization",
    titles: ["Data Analyst"],
    years: 3,
  },
  "Product manager": {
    skills:
      "product management, roadmapping, Jira, SQL, A/B testing, Agile, stakeholder management, user research, analytics",
    titles: ["Product Manager"],
    years: 5,
  },
  "UI/UX designer": INDIA_PERSONAS["UI/UX designer (mid)"]!,
  Marketing: {
    skills:
      "content marketing, email marketing, SEO, Google Analytics, HubSpot, social media marketing, marketing automation, campaign management, Salesforce",
    titles: ["Marketing Manager", "Digital Marketing Manager"],
    years: 4,
  },
  Nurse: {
    skills:
      "patient care, BLS, ACLS, Epic, electronic health records, medication administration, care planning, triage, clinical documentation",
    titles: ["Registered Nurse"],
    years: 4,
  },
  Accountant: {
    skills:
      "accounting, GAAP, IFRS, general ledger, accounts payable, accounts receivable, reconciliation, financial reporting, Excel, QuickBooks, SAP, month-end close",
    titles: ["Accountant", "Senior Accountant"],
    years: 4,
  },
};

type Place = { name: string; place: PlaceChoice; remote: boolean; work: WorkProfile };

const SPONSOR = {
  us: "sponsorship",
  uk: "sponsorship",
  eu: "sponsorship",
  ca: "sponsorship",
} as const;
const worker = (
  country: string,
  timeZone: string,
  rights: Partial<WorkProfile["rights"]> = {},
) => ({
  ...emptyWorkProfile(),
  country,
  timeZone,
  rights: { ...SPONSOR, ...rights },
});

const INDIA = worker("IN", "Asia/Kolkata");
const INDIA_PLACES: Place[] = [
  { name: "Remote, India", place: "c:IN", remote: true, work: INDIA },
  { name: "Remote or on-site, India", place: "c:IN", remote: false, work: INDIA },
  { name: "Anywhere", place: "anywhere", remote: false, work: INDIA },
];

const COUNTRIES = [
  { name: "US", code: "US", work: worker("US", "America/New_York", { us: "authorized" }) },
  { name: "UK", code: "GB", work: worker("GB", "Europe/London", { uk: "authorized" }) },
  { name: "Australia", code: "AU", work: worker("AU", "Australia/Sydney") },
  { name: "Brazil", code: "BR", work: worker("BR", "America/Sao_Paulo") },
  { name: "Mexico", code: "MX", work: worker("MX", "America/Mexico_City") },
];
const GLOBAL_PLACES: Place[] = COUNTRIES.flatMap(({ name, code, work }) => [
  { name: `Remote or on-site, ${name}`, place: `c:${code}` as const, remote: false, work },
  { name: `Remote, ${name}`, place: `c:${code}` as const, remote: true, work },
]);

function flag(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

async function main() {
  const { openLocalDb } = await import("@/db/local");
  const { rebuildMatchIndex, readStoredCounts } = await import("@/lib/job-feed/match-index");
  const { MATCH_VARIANT, rankJobs, withOccupation } = await import("@/lib/job-feed/rank");
  const records = (await import("@/lib/job-feed/records")) as Record<string, unknown>;
  const db = await openLocalDb();
  const now = Number(flag("--now") ?? Date.now());
  if (process.argv.includes("--rebuild")) {
    const started = performance.now();
    const indexed = await rebuildMatchIndex(db, now);
    console.log(
      `Rebuilt the index: ${indexed} openings in ${Math.round(performance.now() - started)} ms`,
    );
  }
  const fresh = Number(records.FRESH_FOR_MS ?? records.EVERGREEN_AFTER_MS);
  const counts = await readStoredCounts(db);
  const [open] = await db
    .select({ n: sql<number>`count(distinct (${listings.board}, ${listings.grp}))::int` })
    .from(listings)
    .where(sql`(${listings.flags} & ${FLAG.evergreen}) = 0`);
  // The openings the last rebuild marked, as the index query reads them.
  const rows = (
    await db
      .select()
      .from(listings)
      .where(sql`(${listings.flags} & ${FLAG.lead}) <> 0`)
  ).map((row) => {
    const occ = unpackOccupation(row.occ);
    return {
      seenAt: fromMinutes(Math.min(row.posted, row.seen)),
      places: (row.oplaces || row.places).split(" ").filter(Boolean),
      remote: (row.flags & FLAG.openingRemote) !== 0,
      sids: row.skills,
      family: familyOf(row.family),
      occ,
      occMinor: occ?.slice(0, 4) ?? null,
      level: row.level,
    };
  });
  const sidSkill = new Map(
    (
      await db
        .select({ sid: skills.sid, skill: skills.skill })
        .from(skills)
        .where(isNotNull(skills.sid))
    ).map((row) => [row.sid, row.skill]),
  );
  console.log(
    `${MATCH_VARIANT}: ${open?.n ?? 0} open openings, ${rows.length} in the index, fresh for ${fresh / DAY_MS} days, public count ${counts?.openJobs ?? "?"}`,
  );

  const set = flag("--set");
  // v2: the labelled personas and places of scripts/match-eval/personas.ts.
  const personas =
    set === "v2"
      ? Object.fromEntries(
          PERSONAS.map((p) => [p.name, { skills: p.skills, titles: p.titles, years: p.years }]),
        )
      : set === "global"
        ? GLOBAL_PERSONAS
        : INDIA_PERSONAS;
  const places: Place[] =
    set === "v2"
      ? PLACES.map((p) => ({ name: p.id, place: p.place, remote: false, work: p.work }))
      : set === "global"
        ? GLOBAL_PLACES
        : INDIA_PLACES;
  const out: Record<string, Record<string, Record<string, number>>> = {};
  for (const [name, persona] of Object.entries(personas)) {
    const profile: MatchProfile = {
      skills: findSkills(persona.skills),
      titles: persona.titles,
      years: persona.years,
    };
    out[name] = {};
    for (const choice of places) {
      const lookingFor = withOccupation(
        lookingForOf(profile, null, { ...NO_CHOICE, place: choice.place, remote: choice.remote }),
      );
      const person = personFrom(profile, lookingFor, OCCUPATIONS);
      const accepted = acceptedPlaces(lookingFor.place);
      const level = person.seniority === null ? null : SENIORITIES.indexOf(person.seniority);
      const reachFamilies = new Set([...person.families.keys()]);
      const stage: Record<string, number> = { open: open?.n ?? 0 };
      let list = rows.filter((row) => row.seenAt >= now - fresh);
      stage.fresh = list.length;
      list = list.filter((row) => placeFit(row.places, accepted) !== "miss");
      stage.place = list.length;
      if (choice.remote) list = list.filter((row) => row.remote);
      stage.remote = list.length;
      const scored = list.flatMap((row) => {
        const named = row.sids.flatMap((sid) => sidSkill.get(sid) ?? []);
        const found = named.filter((skill) => person.skills.has(skill)).length;
        const reach =
          found > 0 ||
          (row.family !== null && reachFamilies.has(row.family)) ||
          (row.occ !== null && person.occupations.has(row.occ)) ||
          (row.occMinor !== null && person.minors.has(row.occMinor));
        if (!reach) return [];
        const kind = kindOf(person, { title: "", family: row.family, occupation: row.occ }).weight;
        return [{ found, kind, near: level === null || Math.abs(row.level - level) <= 1 }];
      });
      stage.kind = scored.filter((item) => item.kind >= KIND.same).length;
      const gate = scored.filter((item) => item.kind >= KIND.same || item.found >= 2);
      stage.skills = gate.length;
      const near = gate.filter((item) => item.near).length;
      stage.level = near > 0 ? near : gate.length;

      const request = {
        userId: USER,
        view: "matches" as const,
        profile,
        filters: { ...DEFAULT_FILTERS, remote: choice.remote },
        page: 1,
        workProfile: null,
        lookingFor,
        deviceTimeZone: choice.work.timeZone,
        now,
        counts,
      };
      const eligible = await rankJobs(db, {
        ...request,
        workProfile: choice.work,
        filters: { ...request.filters, eligibleOnly: true },
      });
      const started = performance.now();
      const ranked = await rankJobs(db, request);
      const ms = Math.round(performance.now() - started);
      stage.eligibility = eligible.total;
      stage.ranked = ranked.total;
      stage.shown = Math.min(ranked.total, MAX_JOB_PAGE * JOB_PAGE_SIZE);
      stage.matching = ranked.matching;
      stage.ms = ms;
      out[name][choice.name] = stage;
    }
  }

  const columns = [
    "open",
    "fresh",
    "place",
    "remote",
    "kind",
    "skills",
    "level",
    "eligibility",
    "ranked",
    "shown",
    "matching",
    "ms",
  ];
  for (const [name, byPlace] of Object.entries(out)) {
    console.log(`\n${name}`);
    console.log(["place".padEnd(30), ...columns.map((c) => c.padStart(8))].join(""));
    for (const [place, stage] of Object.entries(byPlace))
      console.log(
        [place.padEnd(30), ...columns.map((c) => String(stage[c] ?? "").padStart(8))].join(""),
      );
  }
  const file = flag("--json");
  if (file) writeFileSync(file, JSON.stringify({ variant: MATCH_VARIANT, now, out }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
