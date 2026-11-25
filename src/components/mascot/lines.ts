import { BRAND } from "@/config/brand";
import {
  applicationLimit,
  type Feature,
  type PaidPlanId,
  PLANS,
  type ProTool,
  resumeLimit,
  type UsagePeriod,
} from "@/config/plans";
import { trialHeadline, trialOffer, trialPrice } from "@/lib/billing/prices";
import { planFullText, type KeptTool } from "@/lib/plan-limits-copy";
import { resetSentence, thisPeriod } from "@/lib/usage-copy";
import { pluralize } from "@/lib/utils";
import { OTTO_ERRORS } from "./error-lines";

type Line = string | ((...args: never[]) => string);

function whole(n: number) {
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

const count = new Intl.NumberFormat("en-US");

const SIGN_IN_REASONS: Record<Feature, string> = {
  fix: `Sign in to fix lines with me. On Free you get ${PLANS.free.limits.fix} a month.`,
  tailor: `Sign in, then try ${trialOffer()} to tailor with me.`,
  letter: `Sign in, then try ${trialOffer()} for letters, messages and answers.`,
  import: `Sign in, then try ${trialOffer()} for AI reads.`,
  draft: `Sign in, then try ${trialOffer()} to build drafts with me.`,
  github: `Sign in, then try ${trialOffer()} to draft from GitHub.`,
};

const COMES_WITH_PRO: Record<Feature, string> = {
  fix: "More line fixes come with Pro.",
  tailor: "Tailoring comes with Pro.",
  letter: "Letters, outreach messages, answers and interview prep come with Pro.",
  import: "AI reading of uploads comes with Pro.",
  draft: "Building drafts with me comes with Pro.",
  github: "GitHub drafts come with Pro.",
};

const TOOL_COMES_WITH_PRO: Record<ProTool, string> = {
  resumes: `Free keeps ${pluralize(resumeLimit("free"), "resume")}. ${PLANS.pro.name} keeps ${count.format(resumeLimit("pro"))}, ${PLANS.max.name} ${count.format(resumeLimit("max"))}.`,
  formats: "This format comes with Pro. Free has Classic and Compact.",
  word: "Word downloads come with Pro. Your PDF download stays free.",
  tracker: `Free tracks ${pluralize(applicationLimit("free"), "application")}. ${PLANS.pro.name} tracks ${count.format(applicationLimit("pro"))}, ${PLANS.max.name} ${count.format(applicationLimit("max"))}.`,
  jobs: "Filters, saved jobs and every match come with Pro.",
  share: "Share links come with Pro.",
  eligibility: "Checking where a job can hire from comes with Pro.",
  portfolio: "A portfolio site at your own link comes with Pro.",
};

const SHORT_LABELS: Record<Feature, string> = {
  fix: "line fixes",
  tailor: "tailored versions",
  letter: "letters, answers and prep",
  import: "AI reads",
  draft: "drafts",
  github: "GitHub drafts",
};

function jobsFound(matching: number, shown: number, strong: number, newToday: number) {
  const n = whole(matching);
  if (n === 0 || whole(shown) === 0)
    return "No open jobs match this resume yet. I check the boards every day.";
  const lead =
    n > whole(shown)
      ? `I found ${count.format(n)} matching jobs. Here are the closest ${count.format(whole(shown))}.`
      : `I found ${count.format(n)} ${n === 1 ? "job that matches" : "jobs that match"} your resume.`;
  const s = whole(strong);
  const fresh = whole(newToday);
  const parts = [
    s > 0 ? `${count.format(s)} ${s === 1 ? "looks" : "look"} strong` : "",
    fresh > 0 ? `${count.format(fresh)} ${fresh === 1 ? "is" : "are"} new today` : "",
  ].filter(Boolean);
  return parts.length > 0 ? `${lead} ${parts.join(", ")}.` : lead;
}

export const OTTO = {
  landing: {
    hello: `Hi, I'm ${BRAND.mascotName}. I read resumes the way hiring software does.`,
  },
  home: {
    first: "Upload your resume and I'll show you what hiring software reads.",
    sampleOnly: "That's the sample. Now drop in yours.",
    returning: "Pick up where you left off, or tailor a resume to a new job.",
  },
  signIn: {
    reason: (feature: Feature) => SIGN_IN_REASONS[feature],
    codeSent: "Check your email for a 6-digit code. It works for 10 minutes.",
    done: "You're in. Let's pick up where you left off.",
  },
  limit: {
    reached: (
      feature: Feature,
      limit: number = PLANS.pro.limits[feature],
      period?: UsagePeriod | null,
    ) =>
      whole(limit) === 0
        ? `${COMES_WITH_PRO[feature]} ${trialHeadline()}.`
        : `You've used ${thisPeriod(period)}'s ${whole(limit)} ${SHORT_LABELS[feature]}. ` +
          resetSentence(period),
    freeUsed: (feature: Feature, limit: number = PLANS.free.limits[feature]) =>
      `You've used this month's ${count.format(limit)} ${SHORT_LABELS[feature]}. ` +
      `${PLANS.pro.name} has ${count.format(PLANS.pro.limits[feature])} a month.`,
    none: (feature: Feature, trial = true) =>
      trial ? `${COMES_WITH_PRO[feature]} ${trialHeadline()}.` : COMES_WITH_PRO[feature],
    tool: (tool: ProTool, trial = true) =>
      trial ? `${TOOL_COMES_WITH_PRO[tool]} ${trialHeadline()}.` : TOOL_COMES_WITH_PRO[tool],
    full: (tool: KeptTool, plan: PaidPlanId, held?: number, offerNext = true) =>
      planFullText(tool, plan, held, offerNext),
    near: (feature: Feature, used: number, limit: number, period?: UsagePeriod | null) =>
      `Uh-oh, ${whole(used)} of ${whole(limit)} ${SHORT_LABELS[feature]} used. ${resetSentence(period)}`,
  },
  working: {
    import: "Otto is reading your file.",
    job: "Otto is reading the job post.",
    tailor: "Otto is reading the job post and your resume.",
    fix: "Otto is thinking up a stronger line.",
    line: "Otto is writing your line.",
    summary: "Otto is thinking up a summary.",
    letter: "Otto is writing your cover letter.",
    answer: "Otto is drafting your answer.",
    outreach: "Otto is writing your message.",
    interview: "Otto is building your interview prep.",
    draft: "Otto is writing your first draft.",
    githubLookup: "Otto is looking up your public work on GitHub.",
    github: "Otto is turning your GitHub work into project lines.",
  },
  pricing: {
    samePrinciples: "Plans change how much I help each month, never what I will or won't do.",
  },
  formats: {
    tip: "Not sure? Classic suits any job. Compact fits a long career on one page.",
  },
  upgrade: {
    done: (plan: string) => `You're on ${plan} now. Your new limits apply straight away.`,
    trial: `Try all my AI help: ${trialOffer()}, ${trialPrice()}. Cancel before it ends to pay nothing more.`,
    trialStarted: (endsOn: string) => `Your Pro trial runs until ${endsOn}. Let's get to work.`,
  },
  errors: OTTO_ERRORS,
  jobs: {
    found: jobsFound,
    filtered: "Nothing matches these filters. Try loosening one of them.",
    noResume: "Add a resume and I'll find open jobs that fit it.",
    noJobs: "No jobs here yet. The boards are read once a day.",
    saved: (saved: number) =>
      whole(saved) === 0
        ? "Nothing saved yet. Save a job and it waits for you here."
        : `${pluralize(whole(saved), "saved job")}. Closed ones stay here for 30 days.`,
    noSkills:
      "I couldn't find any skills in this resume. Add a skills section and I'll match again.",
  },
  letters: {
    empty:
      "Nothing written yet. Pick a job and I'll write a letter, an answer or an outreach message.",
    noResume: "I need a resume to write from. Add one, then come back here.",
    write: "I'll write about 200 words from your resume and this job, nothing made up.",
    answer: "Paste the question. I'll draft a short answer from your resume and this job.",
    outreach: "I'll write a short email and a LinkedIn note from your resume and this job.",
    locked:
      "With Pro, I write cover letters, answers and outreach messages from your resume. Here's an example.",
    lockedKept:
      "Writing new ones comes with Pro. What you wrote before stays here to read, copy and edit.",
  },
  interview: {
    empty: "No prep yet. Pick an application or paste a job link and I'll start.",
    pick: "Pick the job. A pasted link joins your Applications, marked as an interview.",
    locked:
      "With Pro, I prep you for each interview from your own resume lines. Here's an example.",
    lockedKept: "Making new prep comes with Pro. The prep you made before stays here to read.",
  },
} as const satisfies Record<string, Line | Record<string, Line>>;
