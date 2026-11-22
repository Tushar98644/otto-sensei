// The hiring systems' sending domains, then the subject words that catch a company writing for itself.
const SENDERS = [
  "greenhouse.io",
  "greenhouse-mail.io",
  "lever.co",
  "ashbyhq.com",
  "myworkday.com",
  "smartrecruiters.com",
  "icims.com",
  "taleo.net",
  "workablemail.com",
  "naukri.com",
  "jobs-noreply@linkedin.com",
  "indeedapply@indeed.com",
  "calendly.com",
] as const;

const SUBJECTS = [
  "your application",
  "thank you for applying",
  "thanks for applying",
  "application received",
  "interview",
  "assessment",
  "offer letter",
  "otto test",
] as const;

const quoted = (word: string) => (word.includes(" ") ? `"${word}"` : word);

export const GMAIL_FILTER = `from:(${SENDERS.join(" OR ")}) OR subject:(${SUBJECTS.map(quoted).join(" OR ")})`;

export const GMAIL_FORWARDING_URL = "https://mail.google.com/mail/u/0/#settings/fwdandpop";

export function gmailSearchUrl(query: string = GMAIL_FILTER): string {
  return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
}

export function testEmailHref(address: string): string {
  const body =
    "This is a test from my Gmail. Otto shows it on the Applications page when it arrives.";
  return `mailto:${address}?subject=${encodeURIComponent("Otto test")}&body=${encodeURIComponent(body)}`;
}
