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

export const GMAIL_FILTERS_URL = "https://mail.google.com/mail/u/0/#settings/filters";

export const GMAIL_FILTER_FILE = "mailFilters.xml";

const attr = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The file Gmail's Import filters takes: one filter that forwards these emails to the Otto address.
export function gmailFilterFile(address: string, now: Date = new Date()): string {
  const updated = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:apps="http://schemas.google.com/apps/2006">`,
    `  <title>Mail Filters</title>`,
    `  <id>tag:mail.google.com,2008:filters:otto</id>`,
    `  <updated>${updated}</updated>`,
    `  <entry>`,
    `    <category term="filter"></category>`,
    `    <title>Mail Filter</title>`,
    `    <id>tag:mail.google.com,2008:filter:otto</id>`,
    `    <updated>${updated}</updated>`,
    `    <content></content>`,
    `    <apps:property name="hasTheWord" value="${attr(GMAIL_FILTER)}"/>`,
    `    <apps:property name="forwardTo" value="${attr(address)}"/>`,
    `  </entry>`,
    `</feed>`,
    ``,
  ].join("\n");
}

export function gmailSearchUrl(query: string = GMAIL_FILTER): string {
  return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
}

export function testEmailHref(address: string): string {
  const body =
    "This is a test from my Gmail. Otto shows it on the Applications page when it arrives.";
  return `mailto:${address}?subject=${encodeURIComponent("Otto test")}&body=${encodeURIComponent(body)}`;
}
