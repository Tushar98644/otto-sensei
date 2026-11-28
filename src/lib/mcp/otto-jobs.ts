import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { listingIdOf } from "@/lib/job-feed/codes";
import { countClaim } from "@/lib/job-feed/counts";
import { loadJobCounts } from "@/lib/job-feed/live-counts";
import { cachedForDay } from "@/lib/job-feed/public-cache";
import { searchWords } from "@/lib/job-feed/normalize";
import {
  PUBLIC_SEARCH_LIMITS,
  publicJobById,
  searchPublicJobs,
  type PublicJob,
} from "@/lib/job-feed/public-search";
import { EMPLOYMENT_LABELS, type Seniority } from "@/lib/job-feed/types";
import { log } from "@/lib/log";
import { absoluteUrl } from "@/lib/seo/urls";

// Same words, same answer until the next ingest drops the jobs cache.
const cachedSearch = cachedForDay("mcp-search", async (q: string, remote: boolean) =>
  searchPublicJobs(
    await getDb(),
    { q, remote },
    { limit: PUBLIC_SEARCH_LIMITS.limit, offset: 0 },
    Date.now(),
  ),
);

export const OTTO_JOBS_SERVER = {
  name: "otto-jobs",
  title: "Otto Jobs",
  version: "1.0.0",
  description: "Search open jobs listed on Otto Sensei.",
};

const INSTRUCTIONS =
  "Otto Jobs searches open jobs that Otto Sensei collects from employer career sites and public job boards. " +
  "Call search with a few words (job title, skill, company, city or country; add the word remote for remote jobs only). " +
  "It returns up to 10 of the newest matching openings. Then call fetch with a result's id for that job's details and links. " +
  "Job descriptions are not included: the apply link opens the original posting.";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const SEARCH_RESULTS = z.object({
  results: z.array(z.object({ id: z.string(), title: z.string(), url: z.string() })),
});

const JOB_DETAILS = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  url: z.string(),
  metadata: z.object({
    company: z.string(),
    location: z.string(),
    remote: z.boolean(),
    employmentType: z.string().optional(),
    seniority: z.string(),
    postedAt: z.string(),
    skills: z.array(z.string()),
    source: z.string(),
    applyUrl: z.string(),
    ottoUrl: z.string(),
  }),
});

const SENIORITY_LABELS: Record<Seniority, string> = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead",
  director: "Director",
};

const MAX_SKILLS = 12;

// Words a person or a model adds around what it wants; each would otherwise have to match a job.
const FILLER = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "in",
  "at",
  "for",
  "to",
  "with",
  "near",
  "job",
  "jobs",
  "role",
  "roles",
  "position",
  "positions",
  "opening",
  "openings",
  "vacancy",
  "vacancies",
]);

// The word "remote" anywhere is the remote filter; every other word must match the job.
export function parseJobQuery(query: string): { q: string; remote: boolean } {
  const words = searchWords(query)
    .split(" ")
    .filter((word) => word && !FILLER.has(word));
  const rest = words.filter((word) => word !== "remote");
  return { q: rest.join(" "), remote: rest.length !== words.length };
}

function placeOf(job: PublicJob): string {
  if (!job.location) return job.remote ? "Remote" : "";
  return job.remote && !/\bremote\b/i.test(job.location) ? `${job.location}, remote` : job.location;
}

export function resultTitle(job: PublicJob): string {
  const role = job.company ? `${job.title} at ${job.company}` : job.title;
  const place = placeOf(job);
  return `${place ? `${role} (${place})` : role}, ${job.sourceCredit}`;
}

function detailsText(job: PublicJob): string {
  const lines = [
    job.company ? `${job.title} at ${job.company}` : job.title,
    `Location: ${placeOf(job) || "Not stated"}`,
    job.employmentType ? `Job type: ${EMPLOYMENT_LABELS[job.employmentType]}` : null,
    `Level: ${SENIORITY_LABELS[job.seniority]}`,
    `Posted: ${job.postedAt.slice(0, 10)}`,
    job.skills.length > 0 ? `Skills: ${job.skills.slice(0, MAX_SKILLS).join(", ")}` : null,
    `Apply: ${job.applyUrl} (${job.sourceCredit})`,
    `Tailor your resume to this job with Otto Sensei Pro: ${job.ottoUrl}`,
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}

function structured<T extends Record<string, unknown>>(out: T, note?: string) {
  return {
    structuredContent: out,
    content: [
      { type: "text" as const, text: JSON.stringify(out) },
      ...(note ? [{ type: "text" as const, text: note }] : []),
    ],
  };
}

function toolError(text: string) {
  return { isError: true, content: [{ type: "text" as const, text }] };
}

// Postgres reports a statement past its timeout as 57014, possibly wrapped by the driver.
function timedOut(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 3; depth += 1) {
    if ((current as { code?: unknown }).code === "57014") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

async function noMatchNote(): Promise<string> {
  const claim = countClaim((await loadJobCounts()).open);
  const start = claim ? `Otto Sensei lists ${claim} open jobs in all, so try` : "Try";
  return `No open jobs matched those words. ${start} fewer words, a broader job title or a bigger place, such as a country.`;
}

export function createOttoJobsServer(): McpServer {
  const server = new McpServer(
    {
      ...OTTO_JOBS_SERVER,
      websiteUrl: absoluteUrl("/"),
      icons: [{ src: absoluteUrl("/icon.svg"), mimeType: "image/svg+xml" }],
    },
    { instructions: INSTRUCTIONS },
  );

  server.registerTool(
    "search",
    {
      title: "Search Otto jobs",
      description:
        "Search open jobs on Otto Sensei by job title, skill, company, city or country. " +
        "Include the word remote to keep remote jobs only. " +
        "Returns up to 10 of the newest matching openings, each with an id, a title naming the role, company, place and source, and the link to the original posting. " +
        "Call fetch with an id for that job's details.",
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .max(100)
          .describe(
            'A few words to match, e.g. "react developer remote berlin" or "nurse london".',
          ),
      }),
      outputSchema: SEARCH_RESULTS,
      annotations: { title: "Search Otto jobs", ...READ_ONLY },
    },
    async ({ query }) => {
      const started = Date.now();
      const filters = parseJobQuery(query);
      try {
        const { jobs, total } = await cachedSearch(filters.q, Boolean(filters.remote));
        const results = jobs.map((job) => ({
          id: job.id,
          title: resultTitle(job),
          url: job.applyUrl,
        }));
        log.info("mcp.search", {
          words: filters.q ? filters.q.split(" ").length : 0,
          remote: filters.remote,
          results: results.length,
          total,
          ms: Date.now() - started,
        });
        const note =
          results.length === 0
            ? await noMatchNote()
            : `Showing ${results.length} of ${total} matching open jobs, newest first. Call fetch with an id for that job's details.`;
        return structured({ results }, note);
      } catch (error) {
        if (timedOut(error)) {
          log.warn("mcp.search_timeout", { ms: Date.now() - started });
          return toolError(
            "That search took too long. Try again with fewer or more specific words.",
          );
        }
        log.error("mcp.search_failed", error);
        return toolError("Job search is unavailable right now. Try again in a minute.");
      }
    },
  );

  server.registerTool(
    "fetch",
    {
      title: "Get job details",
      description:
        "Get one open job's details by an id from search: title, company, location, job type, level, posting date, skills, " +
        "the link to apply on the original posting with its source, and a link to tailor a resume to the job on Otto Sensei. " +
        "The full job description is not included.",
      inputSchema: z.object({
        id: z.string().min(1).max(100).describe("A job id from search results."),
      }),
      outputSchema: JOB_DETAILS,
      annotations: { title: "Get job details", ...READ_ONLY },
    },
    async ({ id }) => {
      if (listingIdOf(id.trim()) === null)
        return toolError(
          "That is not an Otto job id. Use an id from the search tool's results; they look like 00000000-0000-4abc-8def-0123456789ab.",
        );
      try {
        const job = await publicJobById(await getDb(), id, Date.now());
        log.info("mcp.fetch", { found: job !== null });
        if (!job)
          return toolError(
            "That job is no longer open on Otto Sensei, or it can't be shared here. Run search again for current openings.",
          );
        return structured({
          id: job.id,
          title: resultTitle(job),
          text: detailsText(job),
          url: job.applyUrl,
          metadata: {
            company: job.company,
            location: job.location,
            remote: job.remote,
            ...(job.employmentType
              ? { employmentType: EMPLOYMENT_LABELS[job.employmentType] }
              : {}),
            seniority: SENIORITY_LABELS[job.seniority],
            postedAt: job.postedAt,
            skills: job.skills.slice(0, MAX_SKILLS),
            source: job.sourceCredit,
            applyUrl: job.applyUrl,
            ottoUrl: job.ottoUrl,
          },
        });
      } catch (error) {
        log.error("mcp.fetch_failed", error);
        return toolError("Job details are unavailable right now. Try again in a minute.");
      }
    },
  );

  return server;
}
