import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import { personFrom } from "@/lib/job-feed/match";
import { poolOpenings, readStoredCounts, rebuildMatchIndex } from "@/lib/job-feed/match-index";
import { rankJobs } from "@/lib/job-feed/rank";
import { jobCounts, skillWeights } from "@/lib/job-feed/records";
import { DEFAULT_FILTERS, type MatchProfile, type RoleFamily } from "@/lib/job-feed/types";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Set DATABASE_URL.");
  process.exit(1);
}

const PROFILES: Record<string, MatchProfile> = {
  go: {
    skills: ["Go", "PostgreSQL", "Kubernetes", "gRPC", "Kafka", "AWS", "Docker", "Terraform"],
    titles: ["Backend Engineer", "Software Engineer"],
    years: 4,
  },
  data: {
    skills: [
      "Python",
      "SQL",
      "AWS",
      "Machine learning",
      "LLMs",
      "Spark",
      "Airflow",
      "dbt",
      "Snowflake",
      "Pandas",
    ],
    titles: ["Senior Data Engineer", "Data Engineer"],
    years: 7,
  },
  sales: { skills: ["Salesforce", "CRM", "HubSpot"], titles: ["Account Executive"], years: 4 },
  pm: {
    skills: ["Jira", "SQL", "Mixpanel", "Figma"],
    titles: ["Product Manager", "Business Analyst"],
    years: 4,
  },
  frontend: {
    skills: [
      "JavaScript",
      "TypeScript",
      "React",
      "Next.js",
      "CSS",
      "HTML",
      "Node.js",
      "GraphQL",
      "Jest",
      "Tailwind CSS",
    ],
    titles: ["Senior Frontend Engineer"],
    years: 7,
  },
};

function flag(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

async function timed(runs: number, work: () => Promise<unknown>): Promise<number[]> {
  await work();
  const out: number[] = [];
  for (let i = 0; i < runs; i++) {
    const started = performance.now();
    await work();
    out.push(performance.now() - started);
  }
  return out;
}

const fmt = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return `median ${Math.round(sorted[Math.floor(sorted.length / 2)]!)} ms, max ${Math.round(sorted.at(-1)!)} ms`;
};

async function main() {
  const runs = Number(flag("--runs") ?? 5);
  const client = postgres(url!, { max: 4, prepare: false });
  const db = drizzle(client, { schema }) as unknown as Db;
  const now = Date.now();
  if (process.argv.includes("--rebuild")) {
    const started = performance.now();
    console.log({
      indexed: await rebuildMatchIndex(db, now),
      ms: Math.round(performance.now() - started),
    });
  }
  const counts = await readStoredCounts(db);
  if (!counts) throw new Error("No job_counts row: run with --rebuild first.");
  const weights = await skillWeights(db);
  console.log(
    `counts per request (count distinct): ${fmt(await timed(runs, () => jobCounts(db, now)))}`,
  );
  console.log(
    `counts stored (job_counts row):       ${fmt(await timed(runs, () => readStoredCounts(db)))}`,
  );
  for (const [name, profile] of Object.entries(PROFILES)) {
    const person = personFrom(profile);
    const families = [...person.families];
    const query = {
      skills: [...person.skills],
      families: families.filter(([, w]) => w >= 1).map(([f]) => f) as RoleFamily[],
      pastFamilies: families.filter(([, w]) => w < 1).map(([f]) => f) as RoleFamily[],
      seniority: person.seniority,
      filters: DEFAULT_FILTERS,
      weights,
      places: null,
    };
    const onJobs = await timed(runs, () => poolOpenings(db, query, null, now));
    const onIndex = await timed(runs, () => poolOpenings(db, query, counts, now));
    const request = {
      userId: "00000000-0000-4000-8000-000000000000",
      view: "matches" as const,
      profile,
      filters: DEFAULT_FILTERS,
      page: 1,
      workProfile: {
        ...emptyWorkProfile(),
        country: "US",
        rights: { us: "authorized" as const, uk: null, eu: null, ca: null },
      },
      deviceTimeZone: "America/New_York",
      now,
    };
    const scoring = await timed(runs, () => poolOpenings(db, { ...query, limit: 1 }, counts, now));
    const whole = await timed(runs, () => rankJobs(db, request));
    const noRules = await timed(runs, () => rankJobs(db, { ...request, workProfile: null }));
    const free = await timed(runs, () =>
      rankJobs(db, { ...request, workProfile: null, free: true }),
    );
    console.log(`${name}:`);
    console.log(`  pool on jobs (scoring + reading rows and copies):      ${fmt(onJobs)}`);
    console.log(`  pool on job_match (scoring + reading rows and copies): ${fmt(onIndex)}`);
    console.log(`  job_match scoring statement alone:                     ${fmt(scoring)}`);
    console.log(`  whole request, Pro with work-rights rules:             ${fmt(whole)}`);
    console.log(`  whole request, no work profile:                        ${fmt(noRules)}`);
    console.log(`  whole request, Free (60 ranked):                       ${fmt(free)}`);
  }
  await client.end();
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
