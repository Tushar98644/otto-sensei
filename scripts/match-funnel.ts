// What each matching step keeps for India-based personas: OTTO_PGLITE_DIR=<copy> bun scripts/match-funnel.ts [--rebuild] [--json out.json]
import { writeFileSync } from "node:fs";
import { and, isNull, eq, sql } from "drizzle-orm";
import { jobMatch, jobs, matchSkills } from "@/db/schema";
import { emptyWorkProfile, type WorkProfile } from "@/lib/eligibility/profile";
import { acceptedPlaces, lookingForOf, placeFit } from "@/lib/job-feed/looking-for";
import { KIND, kindOf, personFrom } from "@/lib/job-feed/match";
import { OCCUPATIONS } from "@/lib/job-feed/occupations";
import { findSkills } from "@/lib/job-feed/skills";
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

const PERSONAS: Record<string, { skills: string; titles: string[]; years: number }> = {
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

const PLACES: Array<{ name: string; place: PlaceChoice; remote: boolean }> = [
  { name: "Remote, India", place: "c:IN", remote: true },
  { name: "Remote or on-site, India", place: "c:IN", remote: false },
  { name: "Anywhere", place: "anywhere", remote: false },
];

const INDIA: WorkProfile = {
  ...emptyWorkProfile(),
  country: "IN",
  timeZone: "Asia/Kolkata",
  rights: { us: "sponsorship", uk: "sponsorship", eu: "sponsorship", ca: "sponsorship" },
};

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
    .select({
      n: sql<number>`count(distinct coalesce(nullif(${jobs.groupKey}, ''), ${jobs.id}::text))::int`,
    })
    .from(jobs)
    .where(and(isNull(jobs.closedAt), eq(jobs.evergreen, false)));
  const rows = await db.select().from(jobMatch);
  const sidSkill = new Map(
    (await db.select().from(matchSkills)).map((row) => [row.sid, row.skill]),
  );
  console.log(
    `${MATCH_VARIANT}: ${open?.n ?? 0} open openings, ${rows.length} in the index, fresh for ${fresh / DAY_MS} days, public count ${counts?.openJobs ?? "?"}`,
  );

  const out: Record<string, Record<string, Record<string, number>>> = {};
  for (const [name, persona] of Object.entries(PERSONAS)) {
    const profile: MatchProfile = {
      skills: findSkills(persona.skills),
      titles: persona.titles,
      years: persona.years,
    };
    out[name] = {};
    for (const choice of PLACES) {
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
        const skills = row.sids.flatMap((sid) => sidSkill.get(sid) ?? []);
        const found = skills.filter((skill) => person.skills.has(skill)).length;
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
        deviceTimeZone: "Asia/Kolkata",
        now,
        counts,
      };
      const eligible = await rankJobs(db, {
        ...request,
        workProfile: INDIA,
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
    console.log(["place".padEnd(26), ...columns.map((c) => c.padStart(8))].join(""));
    for (const [place, stage] of Object.entries(byPlace))
      console.log(
        [place.padEnd(26), ...columns.map((c) => String(stage[c] ?? "").padStart(8))].join(""),
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
