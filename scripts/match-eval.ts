import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { and, desc, inArray, isNull, or, sql } from "drizzle-orm";
import { jobs } from "@/db/schema";
import { checkEligibility } from "@/lib/eligibility/check";
import {
  matchJob,
  personFrom,
  unmatched,
  type EligibilityHint,
  type MatchableJob,
} from "@/lib/job-feed/match";
import { MATCH_VARIANT, rankJobs } from "@/lib/job-feed/rank";
import { CONTEXT_SKILLS, findSkills } from "@/lib/job-feed/skills";
import { lookingForOf } from "@/lib/job-feed/looking-for";
import {
  DEFAULT_FILTERS,
  MATCH_PROFILE_LIMITS,
  type JobMatch,
  type MatchProfile,
} from "@/lib/job-feed/types";
import { TECH_FIELDS, TEST_RESUMES, type TestResume } from "./match-eval/resumes";

const OUT = path.join(process.cwd(), "..", "match-eval");
const LISTS = path.join(OUT, "lists.json");
const GRADES = path.join(OUT, "grades.json");
const DAY_MS = 24 * 60 * 60 * 1_000;
const TOP = 10;
const SHOWN = 20;

const JUDGE = { model: "anthropic/claude-haiku-5.5", inputUsd: 0.1, outputUsd: 0.5 };
const POST_CHARS = 2_000;

if (!process.env.OTTO_PGLITE_DIR?.trim()) {
  console.error(
    "Set OTTO_PGLITE_DIR to the test set's own database folder; this never opens .pglite/.",
  );
  process.exit(1);
}

type Listed = {
  id: string;
  group: string;
  company: string;
  title: string;
  label: JobMatch["label"];
  postedAt: number;
};
type Lists = { at: number; variants: Record<string, Record<string, Listed[]>> };
type Grade = { grade: number; why: string };
type Grades = { model: string; spentUsd: number; grades: Record<string, Grade> };

function profileOf(resume: TestResume): MatchProfile {
  return {
    skills: findSkills(resume.text, MATCH_PROFILE_LIMITS.skills),
    titles: resume.titles,
    years: resume.years,
  };
}

function hintFor(
  resume: TestResume,
  row: { location: string; rulesText: string },
  now: number,
): EligibilityHint {
  if (!row.rulesText && !row.location) return { blocked: false, note: null };
  const blocked = checkEligibility({ location: row.location, text: row.rulesText }, resume.work, {
    now,
  }).find((finding) => finding.verdict === "blocked");
  return { blocked: Boolean(blocked), note: blocked?.note ?? null };
}

// Frozen baseline ordering: leave it unchanged, the comparison depends on it.
async function rankNewestV0(
  db: Awaited<ReturnType<typeof openDb>>,
  resume: TestResume,
  now: number,
): Promise<Listed[]> {
  const person = personFrom(profileOf(resume));
  const skills = [...person.skills];
  const reach = [];
  if (skills.length > 0) {
    reach.push(
      sql`${jobs.keywords} && array[${sql.join(
        skills.map((skill) => sql`${skill}`),
        sql`, `,
      )}]::text[]`,
    );
  }
  if (person.families.size > 0) reach.push(inArray(jobs.family, [...person.families.keys()]));
  const rows = await db
    .select({
      id: jobs.id,
      groupKey: jobs.groupKey,
      company: jobs.company,
      title: jobs.title,
      keywords: jobs.keywords,
      seniority: jobs.seniority,
      minYears: jobs.minYears,
      location: jobs.location,
      rulesText: jobs.rulesText,
      postedAt: jobs.postedAt,
    })
    .from(jobs)
    .where(and(isNull(jobs.closedAt), or(...reach)))
    .orderBy(desc(jobs.postedAt), desc(jobs.id))
    .limit(1_000);
  const ranked: (Listed & { keywords: string[]; match: JobMatch })[] = [];
  for (const row of rows) {
    const facts: MatchableJob = {
      title: row.title,
      keywords: row.keywords,
      seniority: row.seniority,
      minYears: row.minYears,
    };
    if (!matchJob(person, facts)) continue;
    const hint = hintFor(resume, row, now);
    const match = matchJob(person, facts, hint) ?? unmatched(facts, hint);
    ranked.push({
      id: row.id,
      group: row.groupKey || row.id,
      company: row.company,
      title: row.title,
      label: match.label,
      postedAt: row.postedAt,
      keywords: row.keywords,
      match,
    });
  }
  const order = { strong: 0, good: 1, stretch: 2 } as const;
  const rank = (match: JobMatch) => (match.label === null ? 3 : order[match.label]);
  const share = (item: { match: JobMatch; keywords: string[] }) =>
    item.keywords.length === 0 ? 0 : item.match.found.length / item.keywords.length;
  ranked.sort(
    (a, b) =>
      rank(a.match) - rank(b.match) ||
      b.match.found.length - a.match.found.length ||
      share(b) - share(a) ||
      b.postedAt - a.postedAt,
  );
  return ranked.slice(0, SHOWN).map((item) => ({
    id: item.id,
    group: item.group,
    company: item.company,
    title: item.title,
    label: item.label,
    postedAt: item.postedAt,
  }));
}

async function rankNew(
  db: Awaited<ReturnType<typeof openDb>>,
  resume: TestResume,
  now: number,
): Promise<Listed[]> {
  const profile = profileOf(resume);
  const result = await rankJobs(db, {
    userId: "00000000-0000-4000-8000-000000000000",
    view: "matches",
    profile,
    filters: DEFAULT_FILTERS,
    page: 1,
    workProfile: resume.work,
    lookingFor: lookingForOf(profile, resume.work),
    deviceTimeZone: resume.work.timeZone,
    now,
  });
  const ids = result.jobs.map((job) => job.id);
  const groups = ids.length
    ? await db
        .select({ id: jobs.id, groupKey: jobs.groupKey })
        .from(jobs)
        .where(inArray(jobs.id, ids))
    : [];
  const groupOf = new Map(groups.map((row) => [row.id, row.groupKey || row.id]));
  return result.jobs.map((job) => ({
    id: job.id,
    group: groupOf.get(job.id) ?? job.id,
    company: job.company,
    title: job.title,
    label: job.match.label,
    postedAt: job.postedAt,
  }));
}

async function openDb() {
  const { openLocalDb } = await import("@/db/local");
  return openLocalDb();
}

function readJson<T>(file: string, fallback: T): T {
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback;
}

function writeJson(file: string, value: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function rankAll() {
  const db = await openDb();
  const now = Date.now();
  const saved = readJson<Lists | null>(LISTS, null);
  const name = flag("--as") ?? MATCH_VARIANT;
  const missingOnly = process.argv.includes("--missing");
  const variants: Lists["variants"] = {
    ...(saved?.variants ?? {}),
    [name]: missingOnly ? { ...(saved?.variants[name] ?? {}) } : {},
  };
  const withV0 = process.argv.includes("--with-v0") || !saved;
  if (withV0) variants["newest-v0"] = {};
  for (const resume of TEST_RESUMES) {
    if (missingOnly && variants[name]![resume.id]) continue;
    const started = Date.now();
    if (withV0) variants["newest-v0"]![resume.id] = await rankNewestV0(db, resume, now);
    const oldMs = Date.now() - started;
    variants[name]![resume.id] = await rankNew(db, resume, now);
    console.log(
      `${resume.id}: ${withV0 ? `old ${oldMs} ms, ` : ""}new ${Date.now() - started - oldMs} ms`,
    );
  }
  writeJson(LISTS, { at: saved?.at ?? now, variants } satisfies Lists);
  console.log(`Saved ${LISTS}`);
}

async function refresh() {
  const db = await openDb();
  const { refreshSkillWeights } = await import("@/lib/job-feed/store");
  const { rebuildMatchIndex } = await import("@/lib/job-feed/match-index");
  const { brandName, searchWords } = await import("@/lib/job-feed/normalize");
  const { seniorityOf } = await import("@/lib/job-feed/roles");
  const { readTitle } = await import("@/lib/job-feed/occupations");
  const rows = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      description: jobs.description,
      keywords: jobs.keywords,
      family: jobs.family,
      occupation: jobs.occupation,
      seniority: jobs.seniority,
    })
    .from(jobs);
  const contextual = new Set(CONTEXT_SKILLS);
  const added = new Set(["C", "Elm"]);
  let changed = 0;
  const dropped = new Map<string, number>();
  for (const row of rows) {
    const kind = readTitle(row.title);
    if (!row.description) {
      if (kind.family === row.family && kind.occupation === row.occupation) continue;
      changed += 1;
      await db
        .update(jobs)
        .set({ family: kind.family, occupation: kind.occupation })
        .where(sql`${jobs.id} = ${row.id}`);
      continue;
    }
    const found = new Set(findSkills(`${row.title}\n${row.description}`));
    const brand = brandName(row.company);
    const text = `${row.title}\n${row.description}`;
    const shown = (skill: string) =>
      new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(skill)}(?![\\p{L}\\p{N}+#])`, "u").test(text);
    const next = row.keywords.filter(
      (skill) =>
        (!contextual.has(skill) || found.has(skill) || !shown(skill)) &&
        searchWords(skill) !== brand,
    );
    for (const skill of found) if (added.has(skill) && !next.includes(skill)) next.push(skill);
    for (const skill of row.keywords)
      if (!next.includes(skill)) dropped.set(skill, (dropped.get(skill) ?? 0) + 1);
    const { family, occupation } = kind;
    const fromTitle = seniorityOf(row.title);
    const seniority = fromTitle === "mid" ? row.seniority : fromTitle;
    if (
      family === row.family &&
      occupation === row.occupation &&
      seniority === row.seniority &&
      next.length === row.keywords.length &&
      next.every((skill, i) => skill === row.keywords[i])
    )
      continue;
    changed += 1;
    await db
      .update(jobs)
      .set({ keywords: next, family, occupation, seniority })
      .where(sql`${jobs.id} = ${row.id}`);
  }
  console.log(
    `Rewrote keywords, kind, occupation or level on ${changed} of ${rows.length} jobs. Dropped per skill:`,
  );
  console.log(Object.fromEntries([...dropped].sort((a, b) => b[1] - a[1]).slice(0, 25)));
  const now = Date.now();
  console.log({ skills: await refreshSkillWeights(db, now) });
  const started = Date.now();
  console.log({ indexed: await rebuildMatchIndex(db, now), ms: Date.now() - started });
}

const key = (resumeId: string, jobId: string) => `${resumeId}|${jobId}`;

function pairsToGrade(lists: Lists, grades: Grades): { resume: TestResume; jobId: string }[] {
  const out: { resume: TestResume; jobId: string }[] = [];
  const seen = new Set<string>();
  for (const resume of TEST_RESUMES) {
    for (const variant of Object.values(lists.variants)) {
      for (const job of (variant[resume.id] ?? []).slice(0, TOP)) {
        const id = key(resume.id, job.id);
        if (seen.has(id) || grades.grades[id]) continue;
        seen.add(id);
        out.push({ resume, jobId: job.id });
      }
    }
  }
  return out;
}

const SYSTEM = `You grade how well one job posting fits one job seeker, as a careful recruiter would.
Grades:
3 = would clearly apply: the same kind of role, a level within one step of theirs, a place and work rights that work, and most must-have skills present.
2 = a good fit worth applying to, with small gaps.
1 = related but weak: a neighbouring kind of role, a level two or more steps away, or many must-haves missing.
0 = wrong: a different kind of role, far off in level, or the person can't work where the job requires.
Judge only from what is given. Reply with JSON only: {"grade": <0-3>, "why": "<at most 12 words>"}`;

function seekerText(resume: TestResume): string {
  const profile = profileOf(resume);
  return [
    `Titles, newest first: ${resume.titles.join("; ")}`,
    `Years of experience: ${resume.years}`,
    `Location and work rights: ${resume.place}`,
    `Resume summary: ${resume.text}`,
    `Skills found: ${profile.skills.join(", ") || "none"}`,
  ].join("\n");
}

type JobText = {
  title: string;
  company: string;
  location: string;
  remote: boolean;
  description: string;
};

function postText(job: JobText): string {
  const text =
    job.description.length > POST_CHARS
      ? `${job.description.slice(0, POST_CHARS)}…`
      : job.description;
  return [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location || "not stated"}${job.remote ? " (remote)" : ""}`,
    `Post:\n${text}`,
  ].join("\n");
}

const tokensOf = (text: string) => Math.ceil(text.length / 3.6);

async function loadPosts(ids: readonly string[]): Promise<Map<string, JobText>> {
  const db = await openDb();
  const out = new Map<string, JobText>();
  for (let i = 0; i < ids.length; i += 500) {
    const rows = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        company: jobs.company,
        location: jobs.location,
        remote: jobs.remote,
        description: jobs.description,
      })
      .from(jobs)
      .where(inArray(jobs.id, ids.slice(i, i + 500)));
    for (const row of rows) out.set(row.id, row);
  }
  return out;
}

async function estimate() {
  const lists = readJson<Lists | null>(LISTS, null);
  if (!lists) throw new Error("Run `rank` first.");
  const grades = readJson<Grades>(GRADES, { model: JUDGE.model, spentUsd: 0, grades: {} });
  const pairs = pairsToGrade(lists, grades);
  const posts = await loadPosts([...new Set(pairs.map((pair) => pair.jobId))]);
  let input = 0;
  for (const pair of pairs) {
    const post = posts.get(pair.jobId);
    input +=
      tokensOf(SYSTEM) +
      tokensOf(seekerText(pair.resume)) +
      (post
        ? tokensOf(postText(post)) + (post.description ? 0 : tokensOf("x".repeat(POST_CHARS)))
        : 0) +
      20;
  }
  const output = pairs.length * 40;
  const usd = (input * JUDGE.inputUsd + output * JUDGE.outputUsd) / 1e6;
  console.log(
    `${pairs.length} pairs to grade with ${JUDGE.model}: about ${Math.round(input / 1000)}K input and ${Math.round(output / 1000)}K output tokens, about $${usd.toFixed(3)}. Spent so far: $${grades.spentUsd.toFixed(3)}.`,
  );
  return { pairs, posts, grades, usd };
}

function flag(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

type BunRuntime = {
  plugin: (plugin: {
    name: string;
    setup: (build: {
      onLoad: (options: { filter: RegExp }, load: () => { contents: string; loader: "js" }) => void;
    }) => void;
  }) => void;
};

// Bun can't make the app's pinned connection: swap the transport before importing the reader.
async function fillLiveText(posts: Map<string, JobText>, ids: readonly string[]) {
  const missing = ids.filter((id) => posts.get(id) && !posts.get(id)!.description);
  if (missing.length === 0) return;
  const bun = (globalThis as { Bun?: BunRuntime }).Bun;
  bun?.plugin({
    name: "dev-job-transport",
    setup(build) {
      build.onLoad({ filter: /\/src\/lib\/jobs\/transport\.ts$/ }, () => ({
        contents: readFileSync(new URL("./dev-transport.mjs", import.meta.url), "utf8"),
        loader: "js",
      }));
    },
  });
  const { fullPostText } = await import("@/lib/job-feed/full-post");
  const db = await openDb();
  const rows = await db
    .select({
      id: jobs.id,
      source: jobs.source,
      board: jobs.board,
      externalId: jobs.externalId,
      url: jobs.url,
      description: jobs.description,
      closedAt: jobs.closedAt,
    })
    .from(jobs)
    .where(inArray(jobs.id, missing));
  let read = 0;
  for (const row of rows) {
    // Politely: Workable answers 429 at about one request a second.
    await new Promise((resolve) => setTimeout(resolve, row.source === "workable" ? 3_000 : 400));
    const text = await fullPostText({ ...row, closed: false });
    if (text) read += 1;
    posts.set(row.id, { ...posts.get(row.id)!, description: text });
  }
  console.log(`Read ${read} of ${rows.length} posts again from their source for the judge.`);
}

async function judge() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY isn't set (bun reads it from .env.local).");
  const maxUsd = Number(flag("--max-usd") ?? 4);
  const { pairs, posts, grades } = await estimate();
  await fillLiveText(posts, [...new Set(pairs.map((pair) => pair.jobId))]);
  let next = 0;
  let failed = 0;
  const worker = async () => {
    for (;;) {
      if (grades.spentUsd >= maxUsd) return;
      const pair = pairs[next++];
      if (!pair) return;
      const post = posts.get(pair.jobId);
      if (!post) continue;
      const body = {
        model: JUDGE.model,
        max_tokens: 120,
        // Haiku thinks by default, and the thinking alone can use up max_tokens.
        reasoning: { enabled: false },
        usage: { include: true },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `JOB SEEKER\n${seekerText(pair.resume)}\n\nJOB POSTING\n${postText(post)}`,
          },
        ],
      };
      for (let attempt = 0; attempt < 4; attempt++) {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
            "x-title": "Otto match eval",
          },
          body: JSON.stringify(body),
        }).catch(() => null);
        if (!res || res.status === 429 || res.status >= 500) {
          await new Promise((resolve) => setTimeout(resolve, 2_000 * (attempt + 1)));
          continue;
        }
        const data = (await res.json().catch(() => null)) as {
          choices?: { message?: { content?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
        } | null;
        const usage = data?.usage;
        grades.spentUsd +=
          usage?.cost ??
          ((usage?.prompt_tokens ?? 0) * JUDGE.inputUsd +
            (usage?.completion_tokens ?? 0) * JUDGE.outputUsd) /
            1e6;
        const content = data?.choices?.[0]?.message?.content ?? "";
        const grade = /"grade"\s*:\s*([0-3])/.exec(content)?.[1];
        const why = /"why"\s*:\s*"([^"]*)"/.exec(content)?.[1] ?? "";
        if (grade === undefined) {
          failed += 1;
          console.log(`  no grade for ${pair.resume.id} / ${post.title} (HTTP ${res.status})`);
          break;
        }
        grades.grades[key(pair.resume.id, pair.jobId)] = { grade: Number(grade), why };
        break;
      }
      const done = Object.keys(grades.grades).length;
      if (done % 50 === 0) {
        writeJson(GRADES, grades);
        console.log(`  ${done} graded, $${grades.spentUsd.toFixed(3)} spent`);
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  writeJson(GRADES, grades);
  console.log(`Graded. ${failed} failed. Spent in all: $${grades.spentUsd.toFixed(3)}.`);
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function skillsCheck() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY isn't set (bun reads it from .env.local).");
  const maxUsd = Number(flag("--max-usd") ?? 0.2);
  const db = await openDb();
  const rows = await db
    .select({ id: jobs.id, title: jobs.title, description: jobs.description })
    .from(jobs)
    .where(isNull(jobs.closedAt));
  const order = (id: string) =>
    [...id].reduce((hash, ch) => (hash * 31 + ch.charCodeAt(0)) >>> 0, 7);
  rows.sort((a, b) => order(a.id) - order(b.id));
  type Tally = {
    kept: number;
    keptRight: number;
    dropped: number;
    droppedRight: number;
    seenKept: number;
    seenDropped: number;
  };
  const out: Record<string, Tally> = {};
  let spent = 0;
  for (const skill of CONTEXT_SKILLS) {
    const word = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(skill)}(?![\\p{L}\\p{N}+#])`, "u");
    const kept: string[] = [];
    const dropped: string[] = [];
    let seenKept = 0;
    let seenDropped = 0;
    for (const row of rows) {
      const text = `${row.title}\n${row.description}`;
      if (!word.test(text)) continue;
      const lines = text
        .split("\n")
        .filter((line) => word.test(line))
        .slice(0, 3)
        .map((line) => {
          const at = line.search(word);
          return line.slice(Math.max(0, at - 90), at + 90).trim();
        })
        .join(" | ");
      if (findSkills(text).includes(skill)) {
        seenKept += 1;
        if (kept.length < 20) kept.push(lines);
      } else {
        seenDropped += 1;
        if (dropped.length < 20) dropped.push(lines);
      }
    }
    const ask = async (items: string[]): Promise<number> => {
      if (items.length === 0 || spent >= maxUsd) return 0;
      const prompt = items.map((item, i) => `${i + 1}. ${item}`).join("\n");
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: JUDGE.model,
          max_tokens: 300,
          reasoning: { enabled: false },
          usage: { include: true },
          messages: [
            {
              role: "system",
              content: `For each numbered excerpt from a job post, say whether "${skill}" there means the software technology, programming language or tool called ${skill} (yes), or something else such as an ordinary word, a person, a place or a company (no). Reply with JSON only: {"answers": ["yes" or "no", ...]}, one per excerpt, in order.`,
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        choices?: { message?: { content?: string } }[];
        usage?: { cost?: number };
      } | null;
      spent += data?.usage?.cost ?? 0;
      const answers = (data?.choices?.[0]?.message?.content ?? "").match(/"(yes|no)"/g) ?? [];
      return answers.filter((answer) => answer === '"yes"').length;
    };
    const keptRight = await ask(kept);
    const droppedRight = await ask(dropped);
    out[skill] = {
      kept: kept.length,
      keptRight,
      dropped: dropped.length,
      droppedRight,
      seenKept,
      seenDropped,
    };
    console.log(skill, out[skill]);
  }
  writeJson(path.join(OUT, "skills-check.json"), {
    at: new Date().toISOString(),
    model: JUDGE.model,
    spentUsd: spent,
    skills: out,
  });
  console.log(`Spent $${spent.toFixed(3)}.`);
}

function dcg(gains: readonly number[]): number {
  return gains
    .slice(0, TOP)
    .reduce((sum, grade, index) => sum + (2 ** grade - 1) / Math.log2(index + 2), 0);
}

const mean = (values: readonly number[]) =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length === 0 ? 0 : sorted[Math.floor(sorted.length / 2)]!;
};

type Scores = {
  ndcg: number;
  ndcgNovel: number;
  precision: number;
  bad: number;
  ungraded: number;
  companies: number;
  ageDays: number;
  openings: number;
};

type Ideal = { items: number; openings: number };

function score(
  resumeId: string,
  list: readonly Listed[],
  grades: Grades,
  ideal: Ideal,
  at: number,
): Scores {
  const top = list.slice(0, TOP);
  const gradeOf = (job: Listed) => grades.grades[key(resumeId, job.id)]?.grade;
  const gains = top.map((job) => gradeOf(job) ?? 0);
  const seen = new Set<string>();
  const novel = top.map((job, index) => {
    const repeat = seen.has(job.group);
    seen.add(job.group);
    return repeat ? 0 : gains[index]!;
  });
  return {
    ndcg: ideal.items === 0 ? 0 : (100 * dcg(gains)) / ideal.items,
    ndcgNovel: ideal.openings === 0 ? 0 : (100 * dcg(novel)) / ideal.openings,
    precision: (100 * gains.filter((grade) => grade >= 2).length) / TOP,
    bad: top.filter((job) => gradeOf(job) === 0).length + (TOP - top.length),
    ungraded: top.filter((job) => gradeOf(job) === undefined).length,
    companies: new Set(list.slice(0, SHOWN).map((job) => job.company.toLowerCase())).size,
    ageDays: median(list.slice(0, SHOWN).map((job) => (at - job.postedAt) / DAY_MS)),
    openings: seen.size,
  };
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function report() {
  const lists = readJson<Lists | null>(LISTS, null);
  if (!lists) throw new Error("Run `rank` first.");
  const grades = readJson<Grades>(GRADES, { model: JUDGE.model, spentUsd: 0, grades: {} });
  const names = Object.keys(lists.variants);
  const perResume: Record<string, Record<string, Scores>> = {};
  for (const resume of TEST_RESUMES) {
    const items = new Map<string, number>();
    const openings = new Map<string, number>();
    for (const name of names) {
      for (const job of (lists.variants[name]![resume.id] ?? []).slice(0, TOP)) {
        const grade = grades.grades[key(resume.id, job.id)]?.grade;
        if (grade === undefined) continue;
        items.set(job.id, grade);
        openings.set(job.group, Math.max(openings.get(job.group) ?? 0, grade));
      }
    }
    const best = (values: Iterable<number>) => dcg([...values].sort((a, b) => b - a));
    const ideal = { items: best(items.values()), openings: best(openings.values()) };
    perResume[resume.id] = Object.fromEntries(
      names.map((name) => [
        name,
        score(resume.id, lists.variants[name]![resume.id] ?? [], grades, ideal, lists.at),
      ]),
    );
  }
  const summary = Object.fromEntries(
    names.map((name) => {
      const all = TEST_RESUMES.map((resume) => perResume[resume.id]![name]!);
      const pick = (field: keyof Scores) => Math.round(mean(all.map((s) => s[field])) * 10) / 10;
      return [
        name,
        {
          ndcg10: pick("ndcg"),
          ndcg10Novel: pick("ndcgNovel"),
          precision10: pick("precision"),
          badInTop10: pick("bad"),
          ungraded: pick("ungraded"),
          companiesTop20: pick("companies"),
          medianAgeDaysTop20: pick("ageDays"),
          openingsTop10: pick("openings"),
        },
      ];
    }),
  );
  const [askedNew, askedOld] = (flag("--compare") ?? "").split(",");
  const newName =
    askedNew && names.includes(askedNew)
      ? askedNew
      : names.includes(MATCH_VARIANT)
        ? MATCH_VARIANT
        : names[names.length - 1]!;
  const oldName =
    askedOld && names.includes(askedOld)
      ? askedOld
      : (names[names.indexOf(newName) - 1] ?? names[0]!);
  const wins = { better: 0, same: 0, worse: 0 };
  const byField: Record<string, { old: number[]; new: number[] }> = {};
  for (const resume of TEST_RESUMES) {
    const a = perResume[resume.id]![oldName]!.ndcg;
    const b = perResume[resume.id]![newName]!.ndcg;
    if (Math.abs(a - b) < 0.5) wins.same += 1;
    else if (b > a) wins.better += 1;
    else wins.worse += 1;
    const field = (byField[resume.field] ??= { old: [], new: [] });
    field.old.push(a);
    field.new.push(b);
  }
  const fields = Object.fromEntries(
    Object.entries(byField).map(([field, values]) => [
      field,
      {
        old: Math.round(mean(values.old)),
        new: Math.round(mean(values.new)),
        n: values.old.length,
      },
    ]),
  );
  const listed = [
    ...new Set(
      Object.values(lists.variants).flatMap((variant) =>
        Object.values(variant).flatMap((list) => list.slice(0, TOP).map((job) => job.id)),
      ),
    ),
  ];
  const open = new Set<string>();
  const ceilingDb = await openDb();
  for (let i = 0; i < listed.length; i += 500) {
    const rows = await ceilingDb
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(inArray(jobs.id, listed.slice(i, i + 500)), isNull(jobs.closedAt)));
    for (const row of rows) open.add(row.id);
  }
  const goodFor = (resumeId: string, variantNames: readonly string[], openOnly: boolean) =>
    new Set(
      variantNames.flatMap((variant) =>
        (lists.variants[variant]?.[resumeId] ?? [])
          .slice(0, TOP)
          .filter((job) => (grades.grades[key(resumeId, job.id)]?.grade ?? 0) >= 2)
          .filter((job) => !openOnly || open.has(job.id))
          .map((job) => job.id),
      ),
    ).size;
  const before = names.slice(0, names.indexOf(oldName) + 1);
  const ceiling: Record<string, { before: number[]; now: number[] }> = {};
  for (const resume of TEST_RESUMES) {
    const entry = (ceiling[resume.field] ??= { before: [], now: [] });
    entry.before.push(goodFor(resume.id, before, false));
    entry.now.push(goodFor(resume.id, names, true));
  }
  const ceilingByField = Object.fromEntries(
    Object.entries(ceiling).map(([field, values]) => [
      field,
      {
        before: Math.round(mean(values.before) * 10) / 10,
        now: Math.round(mean(values.now) * 10) / 10,
        underTenBefore: values.before.filter((n) => n < 10).length,
        underTenNow: values.now.filter((n) => n < 10).length,
        n: values.now.length,
      },
    ]),
  );
  const precisionByField = Object.fromEntries(
    Object.keys(byField).map((field) => {
      const ids = TEST_RESUMES.filter((resume) => resume.field === field).map((r) => r.id);
      const p = (variant: string) =>
        Math.round(mean(ids.map((id) => perResume[id]![variant]!.precision)));
      return [field, { old: p(oldName), new: p(newName) }];
    }),
  );
  const techIds = new Set(
    TEST_RESUMES.filter((resume) => (TECH_FIELDS as readonly string[]).includes(resume.field)).map(
      (resume) => resume.id,
    ),
  );
  const sets: Record<string, TestResume[]> = {
    tech: TEST_RESUMES.filter((resume) => techIds.has(resume.id)),
    nonTech: TEST_RESUMES.filter((resume) => !techIds.has(resume.id)),
    all: [...TEST_RESUMES],
  };
  const bySet = Object.fromEntries(
    Object.entries(sets).map(([set, members]) => [
      set,
      {
        n: members.length,
        goodAvailable: Math.round(mean(members.map((r) => goodFor(r.id, names, true))) * 10) / 10,
        variants: Object.fromEntries(
          names
            .filter((name) => members.every((r) => lists.variants[name]?.[r.id] !== undefined))
            .map((name) => {
              const all = members.map((r) => perResume[r.id]![name]!);
              const avg = (field: keyof Scores) =>
                Math.round(mean(all.map((item) => item[field])) * 10) / 10;
              const good = members.map((r) => goodFor(r.id, [name], true));
              return [
                name,
                {
                  ndcg10: avg("ndcg"),
                  precision10: avg("precision"),
                  badInTop10: avg("bad"),
                  goodInTop10: Math.round(mean(good) * 10) / 10,
                  emptyLists: members.filter(
                    (r) => (lists.variants[name]![r.id] ?? []).length === 0,
                  ).length,
                },
              ];
            }),
        ),
      },
    ]),
  );
  const result = {
    at: new Date().toISOString(),
    judge: grades.model,
    spentUsd: Math.round(grades.spentUsd * 1000) / 1000,
    graded: Object.keys(grades.grades).length,
    bySet,
    summary,
    newVsOld: wins,
    byField: fields,
    precisionByField,
    ceilingByField,
    perResume,
  };
  writeJson(path.join(OUT, "results.json"), result);
  const watched = ["product-pm-mid", "eng-backend-go-mid"].map((id) => ({
    id,
    ...Object.fromEntries(names.map((name) => [name, Math.round(perResume[id]![name]!.ndcg)])),
  }));
  const worse = TEST_RESUMES.map((resume) => ({
    id: resume.id,
    old: Math.round(perResume[resume.id]![oldName]!.ndcg),
    new: Math.round(perResume[resume.id]![newName]!.ndcg),
  })).filter((item) => item.new < item.old - 0.5);
  console.log(
    JSON.stringify(
      {
        compared: `${newName} vs ${oldName}`,
        bySet,
        newVsOld: wins,
        watched,
        worse,
        byField: fields,
        precisionByField,
        ceilingByField,
        spentUsd: result.spentUsd,
        graded: result.graded,
      },
      null,
      2,
    ),
  );

  const posts = await loadPosts([
    ...new Set(Object.keys(grades.grades).map((id) => id.split("|")[1]!)),
  ]);
  const byGrade = new Map<number, string[]>();
  for (const [id, grade] of Object.entries(grades.grades))
    byGrade.set(grade.grade, [...(byGrade.get(grade.grade) ?? []), id]);
  const shuffled = (ids: string[]) =>
    ids
      .map((id) => ({
        id,
        at: [...id].reduce((hash, ch) => (hash * 31 + ch.charCodeAt(0)) >>> 0, 7),
      }))
      .sort((a, b) => a.at - b.at)
      .map((item) => item.id);
  const picked: string[] = [];
  const queues = [3, 2, 1, 0].map((grade) => shuffled(byGrade.get(grade) ?? []));
  while (picked.length < 150 && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues)
      if (picked.length < 150 && queue.length > 0) picked.push(queue.shift()!);
  }
  const resumes = new Map(TEST_RESUMES.map((resume) => [resume.id, resume]));
  const rows = [
    [
      "resume_id",
      "seeker",
      "job_title",
      "company",
      "location",
      "job_url",
      "judge_grade",
      "judge_why",
      "your_grade_0_to_3",
      "agree_good_or_not",
    ],
  ];
  const urls = new Map(
    (picked.length
      ? await (
          await openDb()
        )
          .select({ id: jobs.id, url: jobs.url })
          .from(jobs)
          .where(
            inArray(
              jobs.id,
              picked.map((id) => id.split("|")[1]!),
            ),
          )
      : []
    ).map((row) => [row.id, row.url]),
  );
  for (const id of picked) {
    const [resumeId, jobId] = id.split("|") as [string, string];
    const resume = resumes.get(resumeId)!;
    const post = posts.get(jobId);
    const grade = grades.grades[id]!;
    rows.push([
      resumeId,
      `${resume.titles[0]}, ${resume.years} yrs, ${resume.place}`,
      post?.title ?? "",
      post?.company ?? "",
      post?.location ?? "",
      urls.get(jobId) ?? "",
      String(grade.grade),
      grade.why,
      "",
      "",
    ]);
  }
  // Never overwrite a file the owner was handed (graded or not); write a dated one instead.
  let file = path.join(OUT, "hand-check-150.csv");
  const day = new Date().toISOString().slice(0, 10);
  for (let n = 1; existsSync(file); n++)
    file = path.join(OUT, `hand-check-150-${day}${n === 1 ? "" : `-${n}`}.csv`);
  writeFileSync(file, `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`);
  console.log(`Saved ${path.join(OUT, "results.json")} and ${file} (${picked.length} pairs).`);
}

async function stats() {
  const db = await openDb();
  const { jobCounts } = await import("@/lib/job-feed/records");
  const query = async (statement: string) => {
    const result: unknown = await db.execute(sql.raw(statement));
    return Array.isArray(result) ? result : (result as { rows: unknown[] }).rows;
  };
  const old = Date.now() - 120 * DAY_MS;
  console.log({ counts: await jobCounts(db) });
  console.log(
    await query(`select count(*)::int as rows, count(*) filter (where closed_at is null)::int as open,
      count(*) filter (where evergreen and closed_at is null)::int as filler,
      count(*) filter (where least(posted_at, first_seen_at) < ${old} and closed_at is null)::int as open_120_days,
      count(distinct nullif(group_key, '')) filter (where closed_at is null)::int as groups,
      (pg_total_relation_size('jobs') / greatest(count(*), 1))::int as bytes_per_row,
      (pg_total_relation_size('jobs') / 1048576)::int as mb from jobs`),
  );
  console.log(
    await query(`select board, count(*)::int as open, count(distinct group_key)::int as openings from jobs
      where closed_at is null and board <> '' group by board order by 2 desc limit 8`),
  );
  console.log(
    await query(`select count(*)::int as boards_at_200 from (select board from jobs where closed_at is null
      and board <> '' group by board having count(*) >= 200) full_boards`),
  );
  console.log(await query(`select title from jobs where evergreen and closed_at is null limit 15`));
  console.log(
    await query(`select coalesce(family, 'none') as family, count(*)::int as open from jobs
      where closed_at is null group by 1 order by 2 desc`),
  );
  console.log(
    await query(`select source, count(*)::int as open, count(distinct board)::int as boards from jobs
      where closed_at is null group by 1 order by 2 desc`),
  );
  console.log(
    await query(`select count(*)::int as open,
      count(*) filter (where occupation is null)::int as no_occupation,
      count(*) filter (where family is null)::int as no_family,
      count(*) filter (where occupation is null and family is null)::int as neither,
      round(100.0 * count(*) filter (where occupation is null) / count(*), 1) as no_occupation_pct,
      round(100.0 * count(*) filter (where occupation is null and family is null) / count(*), 1) as neither_pct
      from jobs where closed_at is null`),
  );
  console.log(
    await query(`select left(occupation, 2) as major, count(*)::int as open from jobs
      where closed_at is null group by 1 order by 2 desc`),
  );
}

async function tidy() {
  const db = await openDb();
  const { tidyJobs, refreshSkillWeights } = await import("@/lib/job-feed/store");
  const { rebuildMatchIndex } = await import("@/lib/job-feed/match-index");
  const now = Date.now();
  console.log({ tidy: await tidyJobs(db, now) });
  console.log({
    skills: await refreshSkillWeights(db, now),
    indexed: await rebuildMatchIndex(db, now),
  });
}

async function shrink() {
  const db = await openDb();
  const { SOURCE_INFO } = await import("@/lib/job-feed/sources");
  const live = Object.entries(SOURCE_INFO)
    .filter(([, info]) => info.liveText)
    .map(([source]) => source as (typeof jobs.$inferSelect)["source"]);
  const emptied = await db
    .update(jobs)
    .set({ description: "" })
    .where(and(inArray(jobs.source, live), sql`${jobs.description} <> ''`))
    .returning({ id: jobs.id });
  console.log(`Emptied the stored text of ${emptied.length} jobs.`);
}

async function sizes() {
  const db = await openDb();
  const query = async (statement: string) => {
    const result: unknown = await db.execute(sql.raw(statement));
    return Array.isArray(result) ? result : (result as { rows: unknown[] }).rows;
  };
  if (process.argv.includes("--vacuum")) {
    await query("vacuum full analyze jobs");
    await query("vacuum full analyze job_match");
  }
  const columns = (await query(`select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'jobs' order by ordinal_position`)) as {
    column_name: string;
  }[];
  const averages = columns
    .map((c) => `round(avg(pg_column_size("${c.column_name}")))::int as "${c.column_name}"`)
    .join(", ");
  console.log("Average stored bytes per column:");
  console.log((await query(`select count(*)::int as rows, ${averages} from jobs`))[0]);
  console.log(
    await query(`select relname as table,
      pg_relation_size(c.oid) / 1024 as heap_kb,
      coalesce(pg_total_relation_size(nullif(c.reltoastrelid, 0)), 0) / 1024 as toast_kb,
      pg_indexes_size(c.oid) / 1024 as indexes_kb,
      pg_total_relation_size(c.oid) / 1024 as total_kb
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by pg_total_relation_size(c.oid) desc limit 8`),
  );
  console.log(
    await query(`select indexrelname as index, pg_relation_size(indexrelid) / 1024 as kb
      from pg_stat_user_indexes where relname in ('jobs', 'job_match')
      order by pg_relation_size(indexrelid) desc`),
  );
  console.log({
    databaseMb: (
      await query(`select (pg_database_size(current_database()) / 1048576)::int as mb`)
    )[0],
  });
  console.log(
    await query(`select round(avg(pg_column_size(search)))::int as search_now,
      round(avg(pg_column_size(to_tsvector('simple', title || ' ' || company || ' ' || location || ' ' ||
        array_to_string(keywords, ' ') || ' ' || left(description, 1500)))))::int as search_with_text,
      round(avg(pg_column_size(left(description, 1500))))::int as description_1500_raw
      from jobs`),
  );
}

const step = process.argv[2];
const steps: Record<string, () => Promise<unknown>> = {
  sizes,
  tidy,
  shrink,
  refresh,
  "skills-check": skillsCheck,
  rank: rankAll,
  estimate,
  judge,
  report,
  stats,
};
const run = step ? steps[step] : undefined;
if (!run) {
  console.error("Say which step: rank, estimate, judge or report.");
  process.exit(1);
}
run()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
