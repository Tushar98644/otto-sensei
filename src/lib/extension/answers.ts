import type { WorkProfile, WorkRegion } from "@/lib/eligibility/profile";

// The answers Fill with Otto puts into application forms. Pure, so the extension bundles it too.

export const PAY_PERIODS = ["year", "month", "hour"] as const;
export type PayPeriod = (typeof PAY_PERIODS)[number];
export type Pay = { amount: number; currency: string; period: PayPeriod };

// Per country (ISO code) or "EU": whether they may work there now, and whether they'd need a visa sponsored.
export type WorkRightAnswer = { authorized: boolean | null; sponsorship: boolean | null };

// A question a form asked that has no field of its own here, answered once in the panel.
export type CustomAnswer = { question: string; answer: string; at: number };

export type ApplyAnswers = {
  noticePeriod: string;
  currentPay: Pay | null;
  expectedPay: Pay | null;
  workRights: Record<string, WorkRightAnswer>;
  relocate: boolean | null;
  startDate: string;
  heardFrom: string;
  custom: CustomAnswer[];
};

export type ApplyAnswersPatch = Partial<Omit<ApplyAnswers, "custom">> & {
  // Upserted by question; an empty answer forgets it.
  custom?: { question: string; answer: string }[];
};

export const ANSWER_LIMITS = {
  textChars: 120,
  customAnswers: 60,
  questionChars: 300,
  answerChars: 1_000,
  places: 30,
  maxAmount: 1_000_000_000_000,
} as const;

export const DEFAULT_HEARD_FROM = "Company website";

export const PLACE_KEY = /^(?:[A-Z]{2}|EU)$/;

export function emptyAnswers(): ApplyAnswers {
  return {
    noticePeriod: "",
    currentPay: null,
    expectedPay: null,
    workRights: {},
    relocate: null,
    startDate: "",
    heardFrom: DEFAULT_HEARD_FROM,
    custom: [],
  };
}

// Two wordings of one question share a key: case, punctuation and the "*" of a required field don't count.
export function questionKey(question: string): string {
  return question
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, ANSWER_LIMITS.questionChars);
}

export function customAnswer(answers: ApplyAnswers, question: string): string | null {
  const key = questionKey(question);
  if (!key) return null;
  return answers.custom.find((item) => questionKey(item.question) === key)?.answer ?? null;
}

const REGION_KEYS: Record<WorkRegion, string> = { us: "US", uk: "GB", eu: "EU", ca: "CA" };

// What the work profile already says fills any country the person hasn't answered for.
export function withWorkProfile(answers: ApplyAnswers, profile: WorkProfile | null): ApplyAnswers {
  if (!profile) return answers;
  const rights: Record<string, WorkRightAnswer> = {};
  const home = profile.country.toUpperCase();
  if (PLACE_KEY.test(home)) rights[home] = { authorized: true, sponsorship: false };
  for (const [region, key] of Object.entries(REGION_KEYS) as [WorkRegion, string][]) {
    const right = profile.rights[region];
    if (right === "authorized") rights[key] = { authorized: true, sponsorship: false };
    else if (right === "sponsorship") rights[key] = { authorized: false, sponsorship: true };
  }
  return { ...answers, workRights: { ...rights, ...answers.workRights } };
}

export function mergeAnswers(
  current: ApplyAnswers,
  patch: ApplyAnswersPatch,
  now: number,
): ApplyAnswers {
  const { custom, workRights, ...rest } = patch;
  const next: ApplyAnswers = {
    ...current,
    ...rest,
    workRights: { ...current.workRights, ...workRights },
  };
  if (custom) {
    const list = [...current.custom];
    for (const item of custom) {
      const key = questionKey(item.question);
      if (!key) continue;
      const at = list.findIndex((entry) => questionKey(entry.question) === key);
      if (at >= 0) list.splice(at, 1);
      if (item.answer.trim())
        list.unshift({ question: item.question, answer: item.answer, at: now });
    }
    next.custom = list.slice(0, ANSWER_LIMITS.customAnswers);
  }
  return next;
}

const CURRENCY_SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

// "18 LPA" where a form counts in lakhs, the bare number where it wants digits, else "₹18,00,000 a year".
export function payText(pay: Pay, hint: { lakhs?: boolean; digits?: boolean } = {}): string {
  if (hint.lakhs && pay.currency === "INR") {
    const yearly = pay.period === "month" ? pay.amount * 12 : pay.amount;
    return String(Math.round((yearly / 100_000) * 100) / 100);
  }
  if (hint.digits) return String(pay.amount);
  const locale = pay.currency === "INR" ? "en-IN" : "en-US";
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(pay.amount);
  const symbol = CURRENCY_SYMBOLS[pay.currency];
  const amount = symbol ? `${symbol}${number}` : `${pay.currency} ${number}`;
  return `${amount} a ${pay.period}`;
}
