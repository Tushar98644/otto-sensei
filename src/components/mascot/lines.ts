import { BRAND } from "@/config/brand";
import {
  type Feature,
  FREE_APPLICATIONS,
  PLANS,
  PRO_TRIAL,
  type ProTool,
  RESUME_LIMITS,
  type UsagePeriod,
} from "@/config/plans";
import { resetSentence, thisPeriod } from "@/lib/usage-copy";
import { pluralize } from "@/lib/utils";

type CheckCounts = { fail: number; warn: number; pass: number };
type BeforeAfter = { before: number; after: number };
type Line = string | ((...args: never[]) => string);

function whole(n: number) {
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function asSentence(text: string) {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

const SIGN_IN_REASONS: Record<Feature, string> = {
  fix: `Sign in, then try Pro free for ${PRO_TRIAL.days} days to fix lines with me.`,
  tailor: `Sign in, then try Pro free for ${PRO_TRIAL.days} days to tailor with me.`,
  letter: `Sign in, then try Pro free for ${PRO_TRIAL.days} days for letters and answers.`,
  import: `Sign in, then try Pro free for ${PRO_TRIAL.days} days for AI reads.`,
  draft: `Sign in, then try Pro free for ${PRO_TRIAL.days} days to build drafts with me.`,
  github: `Sign in, then try Pro free for ${PRO_TRIAL.days} days to draft from GitHub.`,
};

const COMES_WITH_PRO: Record<Feature, string> = {
  fix: "Line fixes come with Pro.",
  tailor: "Tailoring comes with Pro.",
  letter: "Letters, answers and interview prep come with Pro.",
  import: "AI reading of uploads comes with Pro.",
  draft: "Building drafts with me comes with Pro.",
  github: "GitHub drafts come with Pro.",
};

const TOOL_COMES_WITH_PRO: Record<ProTool, string> = {
  resumes: `Free keeps ${pluralize(RESUME_LIMITS.free, "resume")}. Pro keeps up to ${RESUME_LIMITS.paid}.`,
  formats: "This format comes with Pro. Free has Classic and Compact.",
  word: "Word downloads come with Pro. Your PDF download stays free.",
  tracker: `Free tracks ${pluralize(FREE_APPLICATIONS, "application")}. Pro tracks every one.`,
  jobs: "Filters, saved jobs and every match come with Pro.",
  share: "Share links come with Pro.",
  eligibility: "Checking where a job can hire from comes with Pro.",
};

const SHORT_LABELS: Record<Feature, string> = {
  fix: "line fixes",
  tailor: "tailored versions",
  letter: "letters, answers and prep",
  import: "AI reads",
  draft: "drafts",
  github: "GitHub drafts",
};

const REVIEW_ALL_GOOD = "Every check passed. Hiring software can read all of it.";

function reviewOverall(counts: CheckCounts, toFix: number) {
  const fail = whole(counts.fail);
  const words = whole(toFix);
  if (fail > 0 || words === 0) return reviewSummary(counts);
  const start =
    whole(counts.warn) > 0
      ? "Software can read it, with small snags."
      : "Hiring software can read it all.";
  return `${start} A recruiter would notice ${pluralize(words, "thing")} in your words first.`;
}

function reviewSummary(counts: CheckCounts) {
  const fail = whole(counts.fail);
  const warn = whole(counts.warn);
  const pass = whole(counts.pass);
  if (fail > 0) {
    const toFix = `${pluralize(fail, "check")} ${fail === 1 ? "needs" : "need"} fixing`;
    const toImprove = warn > 0 ? ` and ${warn} could be better` : "";
    const good = pass > 0 ? ` ${pass} already ${pass === 1 ? "looks" : "look"} good.` : "";
    return `${toFix}${toImprove}.${good}`;
  }
  if (warn > 0) return `Nothing's broken. ${pluralize(warn, "small thing")} could be better.`;
  return REVIEW_ALL_GOOD;
}

type ProvenCount = { proven: number; total: number };

function tailorScreener(must: ProvenCount, nice: ProvenCount) {
  const mustTotal = whole(must.total);
  const niceTotal = whole(nice.total);
  if (mustTotal === 0) {
    if (niceTotal === 0) {
      return "I couldn't find clear requirements in this post. A fuller post works better.";
    }
    const shown = Math.min(whole(nice.proven), niceTotal);
    return `This post names no must-haves. Your resume shows ${shown} of ${niceTotal} nice-to-haves.`;
  }
  const proven = Math.min(whole(must.proven), mustTotal);
  if (proven === mustTotal) {
    return mustTotal === 1
      ? "Your resume proves the one must-have. Screeners check exactly that."
      : `Your resume proves all ${mustTotal} must-haves. Screeners check them one by one.`;
  }
  if (proven === 0) {
    return `I can't find proof of the ${mustTotal} must-haves yet. Let's go through them.`;
  }
  const left = mustTotal - proven;
  const rest = left === 1 ? "the one left" : `the other ${left}`;
  return `Your resume proves ${proven} of ${mustTotal} must-haves. Let's look at ${rest}.`;
}

function downloadChecked({ before, after }: BeforeAfter) {
  const b = whole(before);
  const a = whole(after);
  if (b === 0 && a === 0) return "No problems before, none now. Clean all the way through.";
  const was = `Before: ${pluralize(b, "problem")}.`;
  if (a === 0) return `${was} After: none. Hiring software can read every line.`;
  if (a < b) return `${was} After: ${a}. Better, with a little left to fix.`;
  return `${was} After: ${a}. Let's look at what's left.`;
}

const count = new Intl.NumberFormat("en-US");

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
  upload: {
    idle: "Drop your resume here, PDF or Word. I'll show you what hiring software reads.",
    reading: "Glasses on. Reading your resume now.",
    failed: (reason: string) =>
      reason.trim()
        ? `Hmm, I couldn't read that. ${asSentence(reason)}`
        : "Hmm, I couldn't read that. Want to try another file?",
    scratch: "No resume yet? No problem. We'll build one together, a section at a time.",
    sample: "No file handy? Try a sample resume to see how it works.",
  },
  review: {
    intro: "This is exactly what hiring software reads from your file. Let's check it.",
    summary: reviewSummary,
    overall: reviewOverall,
    allGood: REVIEW_ALL_GOOD,
    scanned: "This PDF is only a picture, so hiring software sees a blank page. Let's fix that.",
  },
  fix: {
    intro: "Let's make every line count. Pick one and I'll help you sharpen it.",
    lineGood: "This line already works: a clear action and a real result.",
    asking: "Quick question first. I only use facts you give me, never made-up numbers.",
    manyIssues: (count: number) => {
      const n = whole(count);
      return n === 0
        ? "Every line reads well. Nothing to fix here."
        : `${pluralize(n, "line")} could be stronger. Start with one. It gets easier.`;
    },
    working: "Working on a stronger version. One moment.",
    suggestion: "Here's a stronger version. Keep it, edit it, or skip it.",
    signedInAgain: "You're signed in again. Try that once more and I'll take a look.",
  },
  tailor: {
    intro: "Paste a job link. I'll show what it asks for and what you already have.",
    needsPost: "Paste the job link first. If it won't open, paste the job text.",
    working: "Reading the job post. Glasses back on.",
    screener: tailorScreener,
    done: "Your tailored copy is ready. Your original stays untouched.",
  },
  download: {
    ready: "Your PDF is ready. Free, like always.",
    checking: "Checking your new PDF the way hiring software would.",
    checked: downloadChecked,
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
        ? `${COMES_WITH_PRO[feature]} Try it free for ${PRO_TRIAL.days} days.`
        : `You've used ${thisPeriod(period)}'s ${whole(limit)} ${SHORT_LABELS[feature]}. ` +
          resetSentence(period),
    none: (feature: Feature, trial = true) =>
      trial
        ? `${COMES_WITH_PRO[feature]} Try it free for ${PRO_TRIAL.days} days.`
        : COMES_WITH_PRO[feature],
    tool: (tool: ProTool, trial = true) =>
      trial
        ? `${TOOL_COMES_WITH_PRO[tool]} Try it free for ${PRO_TRIAL.days} days.`
        : TOOL_COMES_WITH_PRO[tool],
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
    trial: `Try my AI help free for ${PRO_TRIAL.days} days. Cancel before it ends and you pay nothing.`,
    trialStarted: (endsOn: string) => `Your Pro trial runs until ${endsOn}. Let's get to work.`,
  },
  errors: {
    generic: "Something went wrong on my end. Mind trying that again?",
    aiUnavailable:
      "I'm stuck on that one. Try again in a minute. Most hiccups like this won't count against you.",
    offline: "You seem to be offline. Your work is saved in this browser.",
    rateLimited: "That's a lot at once. Give me a minute to catch up.",
    notFound: "I looked everywhere, but this page isn't here.",
  },
  empty: {
    noResumes: "No resumes here yet. Upload one, or start fresh with me.",
  },
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
    empty: "No letters yet. Paste a job link and I'll write one from your resume.",
    noResume: "I need a resume to write from. Add one, then come back here.",
    write: "Paste the job link. I'll write about 200 words from your resume, nothing made up.",
    answer: "Paste the question and the job link. I'll draft a short answer from your resume.",
  },
  interview: {
    empty: "No prep yet. Pick an application or paste a job link and I'll start.",
    pick: "Pick the job. A pasted link joins your Applications, marked as an interview.",
  },
  demoMode: "Demo mode: AI is off, so my suggestions are samples, not real rewrites.",
} as const satisfies Record<string, Line | Record<string, Line>>;
