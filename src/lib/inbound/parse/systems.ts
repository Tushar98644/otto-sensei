import type { HiringSystem } from "../types";
import { domainIs, type Sender } from "./text";

const SENDER_DOMAINS: Record<HiringSystem, readonly string[]> = {
  greenhouse: ["greenhouse.io", "greenhouse-mail.io"],
  lever: ["lever.co"],
  ashby: ["ashbyhq.com"],
  workday: ["myworkday.com", "workday.com"],
  smartrecruiters: ["smartrecruiters.com", "smartrecruiters-mail.com"],
  icims: ["icims.com"],
  taleo: ["taleo.net"],
  workable: ["workablemail.com", "workable.com"],
  naukri: ["naukri.com", "naukrimail.com"],
  linkedin: ["linkedin.com"],
  indeed: ["indeed.com", "indeedemail.com"],
};

// Systems that also send from the company's own domain leave these in the message.
const BODY_MARKS: readonly [HiringSystem, RegExp][] = [
  ["greenhouse", /\b(?:boards|job-boards)\.greenhouse\.io\b|powered by greenhouse/i],
  ["lever", /\bjobs\.lever\.co\b/i],
  ["ashby", /\bjobs\.ashbyhq\.com\b|powered by ashby/i],
  ["workday", /\.myworkdayjobs\.com\b/i],
  ["smartrecruiters", /\bjobs\.smartrecruiters\.com\b|powered by smartrecruiters/i],
  ["icims", /\.icims\.com\b/i],
  ["taleo", /\.taleo\.net\b/i],
  ["workable", /\bapply\.workable\.com\b|powered by workable/i],
];

export const ATS_SYSTEMS: ReadonlySet<HiringSystem> = new Set([
  "greenhouse",
  "lever",
  "ashby",
  "workday",
  "smartrecruiters",
  "icims",
  "taleo",
  "workable",
]);

export const JOB_BOARDS: ReadonlySet<HiringSystem> = new Set(["naukri", "linkedin", "indeed"]);

export function systemOfSender(sender: Sender): HiringSystem | null {
  for (const [system, domains] of Object.entries(SENDER_DOMAINS) as [HiringSystem, string[]][]) {
    if (domainIs(sender.domain, domains)) return system;
  }
  return null;
}

export function systemOf(sender: Sender, body: string): HiringSystem | null {
  const bySender = systemOfSender(sender);
  if (bySender) return bySender;
  return BODY_MARKS.find(([, mark]) => mark.test(body))?.[0] ?? null;
}

const FREE_MAIL = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "yahoo.co.in",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "rediffmail.com",
  "zoho.com",
];

const SERVICE_MAIL = [
  "calendly.com",
  "google.com",
  "goodtime.io",
  "gem.com",
  "hackerrank.com",
  "hackerrankforwork.com",
  "codility.com",
  "codesignal.com",
  "hackerearth.com",
  "mettl.com",
  "testgorilla.com",
  "hirevue.com",
  "zoom.us",
  "microsoft.com",
  "sendgrid.net",
  "mailchimp.com",
];

// A company's own domain, when the email didn't come through a hiring system or a mail service.
export function ownDomainName(sender: Sender): string {
  if (!sender.domain || systemOfSender(sender)) return "";
  if (domainIs(sender.domain, FREE_MAIL) || domainIs(sender.domain, SERVICE_MAIL)) return "";
  const labels = sender.domain.split(".");
  const second = /^(?:co|com|org|net|ac|gov)$/.test(labels.at(-2) ?? "")
    ? labels.at(-3)
    : labels.at(-2);
  return second && second.length > 1 ? second : "";
}
