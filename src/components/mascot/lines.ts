import { BRAND } from "@/config/brand";
import {
  type Feature,
  FEATURE_LABELS,
  FREE_APPLICATIONS,
  FREE_JOB_MATCHES,
  PLANS,
  PRO_TRIAL,
  type ProTool,
  RESUME_LIMITS,
  type UsagePeriod,
} from "@/config/plans";
import { countClaim } from "@/lib/job-feed/counts";
import { resetSentence, thisPeriod } from "@/lib/usage-copy";
import { pluralize } from "@/lib/utils";

// Everything Otto says, in one place so his voice stays consistent. Voice rules: plain everyday
// words, at most 18 words a line, warm and lightly funny, never hype. Readers are worldwide, so no
// local idioms, holidays or currencies. lines.test.ts enforces the length limit.

type CheckCounts = { fail: number; warn: number; pass: number };
type BeforeAfter = { before: number; after: number };
type Line = string | ((...args: never[]) => string);

// Counts come from parsers and APIs; keep a stray NaN or negative from reaching the copy.
function whole(n: number) {
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function asSentence(text: string) {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

// AI help is Pro (or its free trial), so signing in is the first of two steps.
const SIGN_IN_REASONS: Record<Feature, string> = {
  fix: `Sign in, then try Pro free for ${PRO_TRIAL.days} days to fix lines with me.`,
  tailor: `Sign in, then try Pro free for ${PRO_TRIAL.days} days to tailor with me.`,
  letter: `Sign in, then try Pro free for ${PRO_TRIAL.days} days for letters and answers.`,
  import: `Sign in, then try Pro free for ${PRO_TRIAL.days} days for AI reads.`,
  draft: `Sign in, then try Pro free for ${PRO_TRIAL.days} days to build drafts with me.`,
  github: `Sign in, then try Pro free for ${PRO_TRIAL.days} days to draft from GitHub.`,
};

// What Otto says when a plan has none of a feature (Free has no AI help).
const COMES_WITH_PRO: Record<Feature, string> = {
  fix: "Line fixes come with Pro.",
  tailor: "Tailoring comes with Pro.",
  letter: "Letters, answers and interview prep come with Pro.",
  import: "AI reading of uploads comes with Pro.",
  draft: "Building drafts with me comes with Pro.",
  github: "GitHub drafts come with Pro.",
};

// The same, for the tools Free leaves out besides AI help.
const TOOL_COMES_WITH_PRO: Record<ProTool, string> = {
  resumes: `Free keeps ${pluralize(RESUME_LIMITS.free, "resume")}. Pro keeps up to ${RESUME_LIMITS.paid}.`,
  formats: "This format comes with Pro. Free has Classic and Compact.",
  word: "Word downloads come with Pro. Your PDF download stays free.",
  tracker: `Free tracks ${pluralize(FREE_APPLICATIONS, "application")}. Pro tracks every one.`,
  jobs: "Filters, saved jobs and every match come with Pro.",
  share: "Share links come with Pro.",
  eligibility: "Checking where a job can hire from comes with Pro.",
};

// FEATURE_LABELS is too long for a one-line note in the sidebar ("cover letters, answers and
// interview prep"), so the near-limit line uses these.
const SHORT_LABELS: Record<Feature, string> = {
  fix: "line fixes",
  tailor: "tailored versions",
  letter: "letters, answers and prep",
  import: "AI reads",
  draft: "drafts",
  github: "GitHub drafts",
};

const REVIEW_ALL_GOOD = "Every check passed. Hiring software can read all of it.";

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

// The screener view's headline in Otto's words. Must-haves are what an AI screener grades first,
// so they lead; nice-to-haves only get a line when the post has no must-haves.
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

// The Jobs tab's note: counts only, from the matches on screen. "at least" when one request
// looked at its full share of candidates and there may be more.
// `matching`: every open job that matches; `shown`: the best of them, the ones listed.
function jobsFound(matching: number, shown: number, strong: number, newToday: number) {
  const n = whole(matching);
  if (n === 0 || whole(shown) === 0)
    return "No open jobs match this resume yet. I check the boards every day.";
  // Kept to 18 words: "I found 4,210 matching jobs. Here are the closest 300. 120 look strong, 5 are new today."
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

// Under Free's closest few matches: how many more Pro lists, rounded down ("27,000+ more").
function jobsLocked(more: number) {
  const n = whole(more);
  if (n === 0) return "Filters and saved jobs come with Pro.";
  const shown = countClaim(n) ?? count.format(n);
  return `${shown} more ${n === 1 ? "match" : "matches"}. Filters, saved jobs and every match come with Pro.`;
}

export const OTTO = {
  landing: {
    hello: `Hi, I'm ${BRAND.mascotName}. I read resumes the way hiring software does.`,
  },
  upload: {
    idle: "Drop your resume here, PDF or Word. I'll show you what hiring software reads.",
    reading: "Glasses on. Reading your resume now.",
    // `reason` is a plain, complete sentence such as "That file isn't a PDF or Word document."
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
    // Pass the user's actual limit from their UsageSnapshot and their period from /api/me; they
    // default to Pro's limit and the calendar month. A limit of 0 (Free) is the trial pitch.
    reached: (
      feature: Feature,
      limit: number = PLANS.pro.limits[feature],
      period?: UsagePeriod | null,
    ) =>
      whole(limit) === 0
        ? `${COMES_WITH_PRO[feature]} Try it free for ${PRO_TRIAL.days} days.`
        : `You've used all ${whole(limit)} ${FEATURE_LABELS[feature]} for ${thisPeriod(period)}. ` +
          resetSentence(period),
    // On Free: the feature isn't part of the plan at all. Someone who has had the trial isn't
    // offered it again.
    none: (feature: Feature, trial = true) =>
      trial
        ? `${COMES_WITH_PRO[feature]} Try it free for ${PRO_TRIAL.days} days.`
        : COMES_WITH_PRO[feature],
    // On Free: a Pro tool (see ProTool), with the trial when it's still on offer.
    tool: (tool: ProTool, trial = true) =>
      trial
        ? `${TOOL_COMES_WITH_PRO[tool]} Try it free for ${PRO_TRIAL.days} days.`
        : TOOL_COMES_WITH_PRO[tool],
    // 80% or more of a meter used, said with his worried face: a heads-up, not a sales pitch.
    near: (feature: Feature, used: number, limit: number, period?: UsagePeriod | null) =>
      `Uh-oh, ${whole(used)} of ${whole(limit)} ${SHORT_LABELS[feature]} used. ${resetSentence(period)}`,
  },
  // What Otto is doing while someone waits on the AI. Said about him rather than by him: it's a
  // status line under his working figure, not one of his notes.
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
    // The trial's end date, written for the reader, e.g. "Nov 11".
    trialStarted: (endsOn: string) => `Your Pro trial runs until ${endsOn}. Let's get to work.`,
  },
  errors: {
    generic: "Something went wrong on my end. Mind trying that again?",
    // The server gives the unit back for these, except past a small daily cap on failed runs the
    // model may have been paid for (see runMetered), hence "most".
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
    locked: jobsLocked,
    filtered: "Nothing matches these filters. Try loosening one of them.",
    noResume: "Add a resume and I'll find open jobs that fit it.",
    noJobs: "No jobs here yet. The boards are read once a day.",
    saved: (saved: number) =>
      whole(saved) === 0
        ? "Nothing saved yet. Save a job and it waits for you here."
        : `${pluralize(whole(saved), "saved job")}. Closed ones stay here for 30 days.`,
    noSkills:
      "I couldn't find any skills in this resume. Add a skills section and I'll match again.",
    publicInvite: `Sign in free and I'll show your ${FREE_JOB_MATCHES} closest matches, with the reasons. Pro ranks them all.`,
    publicFailed: "I couldn't load the jobs just now. Try again in a minute.",
  },
  // The Cover letters page (/dashboard/letters).
  letters: {
    empty: "No letters yet. Paste a job link and I'll write one from your resume.",
    noResume: "I need a resume to write from. Add one, then come back here.",
    write: "Paste the job link. I'll write about 200 words from your resume, nothing made up.",
    answer: "Paste the question and the job link. I'll draft a short answer from your resume.",
  },
  // The Interview prep page (/dashboard/interview).
  interview: {
    empty: "No prep yet. Pick an application or paste a job link and I'll start.",
    pick: "Pick the job. A pasted link joins your Applications, marked as an interview.",
  },
  demoMode: "Demo mode: AI is off, so my suggestions are samples, not real rewrites.",
} as const satisfies Record<string, Line | Record<string, Line>>;
