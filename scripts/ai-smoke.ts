import { fixBullet } from "@/lib/ai/fix";
import { structureResume } from "@/lib/ai/structure";
import { tailorResume } from "@/lib/ai/tailor";
import { answerQuestion, writeCoverLetter } from "@/lib/ai/writing";
import { aiEnabled, env } from "@/lib/env";
import { lintResume } from "@/lib/lint/bullets";
import { listBullets, resumeToText } from "@/lib/resume/ops";
import { createSampleResume } from "@/lib/resume/sample";
import { screenerCounts, screenerHeadline, screenerRows } from "@/lib/tailor/requirements";

const CHECKS = ["structure", "fix", "tailor", "letter", "answer"] as const;
type Check = (typeof CHECKS)[number];

const personal: string[] = [];
const spent = { calls: 0, leaks: 0, input: 0, output: 0 };
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith("https://openrouter.ai/api/v1/chat/")) return realFetch(input, init);
  const body = typeof init?.body === "string" ? init.body : "";
  const sent = personal.filter((value) => body.includes(value));
  spent.calls += 1;
  if (sent.length > 0) {
    spent.leaks += 1;
    console.log(`  ✘ sent to the AI: ${sent.join(", ")}`);
  }
  const res = await realFetch(input, init);
  const usage = (await res.clone().json().catch(() => null)) as {
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  } | null;
  spent.input += usage?.usage?.prompt_tokens ?? 0;
  spent.output += usage?.usage?.completion_tokens ?? 0;
  return res;
}) as typeof fetch;

async function priceOf(model: string): Promise<{ prompt: number; completion: number } | null> {
  try {
    const res = await realFetch("https://openrouter.ai/api/v1/models");
    const list = (await res.json()) as {
      data?: { id: string; pricing?: { prompt?: string; completion?: string } }[];
    };
    const pricing = list.data?.find((entry) => entry.id === model)?.pricing;
    return pricing ? { prompt: Number(pricing.prompt), completion: Number(pricing.completion) } : null;
  } catch {
    return null;
  }
}

const QUESTIONS = [
  "Why do you want to work at Acme Analytics?",
  "Tell us about a launch you're proud of and what you'd do differently.",
];
const STORY_ONLY = process.argv.includes("--story");

const JOB = `Senior Product Marketing Manager, Remote (US/EU)

About the role
We are hiring a Senior Product Marketing Manager to own positioning and launches for our B2B analytics platform. You will work with product, sales and customer success to bring new features to market and grow pipeline.

What you will do
- Own positioning, messaging and launch plans for 2-3 product areas
- Run customer research and win/loss interviews; turn findings into messaging
- Build sales enablement: battlecards, demo scripts, pitch decks
- Plan and measure launches with clear pipeline and adoption goals
- Partner with demand gen on campaigns, webinars and content

What you bring
- 5+ years of product marketing at a B2B SaaS company
- Proven launches that moved pipeline or adoption, with numbers
- Experience with Salesforce or HubSpot and product analytics (Amplitude or Mixpanel)
- Strong writing; comfortable presenting to executives
- Nice to have: pricing and packaging work, PLG motions`;

async function timed<T>(label: string, run: () => Promise<T>): Promise<T | null> {
  const started = Date.now();
  try {
    const result = await run();
    console.log(`\n✔ ${label} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
    return result;
  } catch (error) {
    console.log(`\n✘ ${label} (${((Date.now() - started) / 1000).toFixed(1)} s):`, error);
    return null;
  }
}

async function main() {
  if (!aiEnabled()) throw new Error("OPENROUTER_API_KEY is not set (put it in .env.local)");
  const { AI_MODEL, AI_STRUCTURE_MODEL } = env();
  console.log(`Models: fix/tailor/letter = ${AI_MODEL}, structure = ${AI_STRUCTURE_MODEL}`);
  const asked = process.argv.slice(2).filter((arg): arg is Check => CHECKS.includes(arg as Check));
  const runs = (check: Check) => asked.length === 0 || asked.includes(check);

  const sample = createSampleResume();
  const { basics } = sample;
  personal.push(basics.name, basics.email, basics.phone, ...basics.links.map((link) => link.url));
  const job = { jobText: JOB, jobTitle: "Senior Product Marketing Manager", company: "Acme Analytics" };

  if (runs("structure")) await structureCheck(sample);
  if (runs("fix")) await fixCheck(sample);
  if (runs("tailor")) await tailorCheck(sample, job);
  if (runs("letter")) {
    const letter = await timed("cover letter", () => writeCoverLetter(sample, job));
    if (letter) {
      console.log(`  ${letter.words} words, warnings: ${letter.warnings.join(" | ") || "(none)"}`);
      console.log(`\n${letter.letter}\n`);
    }
  }
  if (runs("answer")) {
    for (const question of STORY_ONLY ? QUESTIONS.slice(1) : QUESTIONS) {
      const answer = await timed(`answer: "${question}"`, () => answerQuestion(sample, job, question));
      if (answer) {
        console.log(`  ${answer.words} words, warnings: ${answer.warnings.join(" | ") || "(none)"}`);
        console.log(`\n${answer.answer}\n`);
      }
    }
  }

  const price = AI_MODEL === AI_STRUCTURE_MODEL ? await priceOf(AI_MODEL) : null;
  const cost = price ? spent.input * price.prompt + spent.output * price.completion : null;
  console.log(
    `\n${spent.calls} AI calls, ${spent.leaks} with personal details; ` +
      `${spent.input} input + ${spent.output} output tokens` +
      (cost === null ? "" : `, about $${cost.toFixed(4)}`),
  );
}

type Sample = ReturnType<typeof createSampleResume>;

async function structureCheck(sample: Sample) {
  const structured = await timed("structure (import)", () => structureResume(resumeToText(sample)));
  if (structured) {
    const jobs = structured.resume.experience;
    const got = structured.resume.basics;
    console.log(
      `  usedAI=${structured.usedAI}, name="${got.name}", ${jobs.length} jobs, ` +
        `${jobs.reduce((n, job) => n + job.bullets.length, 0)} job lines, ${structured.resume.skills.length} skill groups`,
    );
    const want = sample.basics;
    const same =
      got.name === want.name &&
      got.email === want.email &&
      got.phone === want.phone &&
      got.links.map((link) => link.url).join() === want.links.map((link) => link.url).join();
    console.log(`  contact: ${got.email} | ${got.phone} | ${got.links.map((l) => `${l.label} ${l.url}`).join(", ")}`);
    console.log(`  contact restored exactly: ${same ? "yes" : "NO"}`);
  }
}

async function fixCheck(sample: Sample) {
  const lint = lintResume(sample);
  const weak = listBullets(sample)
    .filter((ref) => (lint.byBullet[ref.bulletId] ?? []).length > 0)
    .slice(0, 4);
  for (const ref of weak) {
    const role = { title: ref.roleTitle, company: ref.company };
    const first = await timed(`fix: "${ref.text}"`, () =>
      fixBullet({ bullet: ref.text, role, answers: [] }),
    );
    if (!first) continue;
    console.log(`  issues: ${first.issues.join(" | ")}`);
    console.log(`  questions: ${first.questions.join(" | ") || "(none)"}`);
    console.log(`  suggestion: ${first.suggestion}`);
    if (ref === weak[0] && first.questions.length > 0) {
      const answers = first.questions.map((question) => ({ question, answer: "About 30%, over 6 months, for 1,200 customers" }));
      const second = await timed("fix with answers", () =>
        fixBullet({ bullet: ref.text, role, answers }),
      );
      if (second) console.log(`  final line: ${second.suggestion}`);
    }
  }
}

async function tailorCheck(sample: Sample, job: Parameters<typeof tailorResume>[1]) {
  const tailored = await timed("tailor", () => tailorResume(sample, job));
  if (!tailored) return;
  const rows = screenerRows(sample, tailored.requirements);
  console.log(`  ${screenerHeadline(screenerCounts(rows))}`);
  for (const row of rows) {
    const how = row.terms.length ? `terms: ${row.terms.join(", ")}` : `quote: "${row.quote}"`;
    const proof = row.proof.line ? ` <- ${row.proof.line.place}: "${row.proof.line.text}"` : "";
    console.log(`  [${row.importance}/${row.source}] ${row.status.padEnd(7)} ${row.text} (${how})${proof}`);
    if (row.status !== "proven") console.log(`      asks: ${row.ask}`);
  }
  const moved = tailored.bulletOrder.map((order) => order.bulletIds.slice(0, 2).join(", "));
  console.log(`  bullet orders: ${tailored.bulletOrder.length} (${moved.join(" | ")})`);
  console.log(`  summary: ${tailored.summary}`);
  console.log(`  notes: ${tailored.notes.join(" | ")}`);
}

await main();
