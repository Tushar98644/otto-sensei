import { BRAND } from "@/config/brand";
import { type Feature, FEATURE_LABELS, PLANS, type UsagePeriod } from "@/config/plans";
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

const SIGN_IN_REASONS: Record<Feature, string> = {
  fix: "Fixing lines needs a free account.",
  tailor: "Tailoring needs a free account.",
  letter: "Cover letters and answers need a free account.",
  import: "Sign in for more AI reads of your uploads each month.",
  draft: "Sign in to keep building drafts with me.",
  github: "Sign in to keep drafting projects from GitHub.",
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

const REVIEW_ALL_GOOD ="Every check passed. Hiring software can read all of it.";

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
    // default to the free plan's limit and the calendar month.
    reached: (feature: Feature, limit: number = PLANS.free.limits[feature], period?: UsagePeriod | null) =>
      `You've used all ${whole(limit)} ${FEATURE_LABELS[feature]} for ${thisPeriod(period)}. ` +
      resetSentence(period),
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
  },
  errors: {
    generic: "Something went wrong on my end. Mind trying that again?",
    // The server gives the unit back for these, except past a small daily cap on failed runs the
    // model may have been paid for (see runMetered), hence "most".
    aiUnavailable: "I'm stuck on that one. Try again in a minute. Most hiccups like this won't count against you.",
    offline: "You seem to be offline. Your work is saved in this browser.",
    rateLimited: "That's a lot at once. Give me a minute to catch up.",
    notFound: "I looked everywhere, but this page isn't here.",
  },
  empty: {
    noResumes: "No resumes here yet. Upload one, or start fresh with me.",
  },
  demoMode: "Demo mode: AI is off, so my suggestions are samples, not real rewrites.",
} as const satisfies Record<string, Line | Record<string, Line>>;
