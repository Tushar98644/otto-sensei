import { BRAND } from "@/config/brand";
import { formatFor } from "@/i18n/intl";
import EN_APP from "@/i18n/messages/en/app";
import EN_OTTO from "@/i18n/messages/en/otto";
import EN_SIGN_IN from "@/i18n/messages/en/sign-in";
import { pluralize } from "@/lib/utils";
import { OTTO_ERRORS } from "./error-lines";
import { ottoLines, whole, type OttoLines } from "./lines";

// Otto's lines in English, for tests and server code; the app reads them through useOtto() in the reader's language.

type Line = string | ((...args: never[]) => string);

const count = formatFor("en");

export const OTTO_EN: OttoLines = ottoLines(
  { otto: EN_OTTO, signIn: EN_SIGN_IN, usage: EN_APP.usage },
  formatFor("en"),
);

function jobsFound(matching: number, shown: number, strong: number, newToday: number) {
  const n = whole(matching);
  if (n === 0 || whole(shown) === 0)
    return "No open jobs match this resume yet. I check the boards every day.";
  const lead =
    n > whole(shown)
      ? `I found ${count.number(n)} matching jobs. Here are the closest ${count.number(whole(shown))}.`
      : `I found ${count.number(n)} ${n === 1 ? "job that matches" : "jobs that match"} your resume.`;
  const s = whole(strong);
  const fresh = whole(newToday);
  const parts = [
    s > 0 ? `${count.number(s)} ${s === 1 ? "looks" : "look"} strong` : "",
    fresh > 0 ? `${count.number(fresh)} ${fresh === 1 ? "is" : "are"} new today` : "",
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
    ...OTTO_EN.signIn,
    codeSent: "Check your email for a 6-digit code. It works for 10 minutes.",
  },
  limit: OTTO_EN.limit,
  working: EN_APP.working,
  pricing: {
    samePrinciples: "Plans change how much I help each month, never what I will or won't do.",
  },
  formats: {
    tip: "Not sure? Classic suits any job. Compact fits a long career on one page.",
  },
  upgrade: OTTO_EN.upgrade,
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
