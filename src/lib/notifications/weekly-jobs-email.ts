import { FREE_JOB_MATCHES, PLANS } from "@/config/plans";
import { sourceCredit } from "@/lib/job-feed/sources";
import type { JobSourceId } from "@/lib/job-feed/types";
import type { EmailMessage } from "./email";
import { escapeHtml, INK, MUTED } from "./follow-up";
import { letterEmail, type EmailLinks } from "./layout";

// Titles, companies and places come from job posts: capped, and escaped by the layout or here.

export type DigestJob = {
  title: string;
  company: string;
  location: string;
  remote: boolean;
  source: JobSourceId;
  url: string;
};

export type WeeklyJobsEmailInput = {
  to: string;
  found: number;
  jobs: readonly DigestJob[];
  free: boolean;
  jobsUrl: string;
  links: EmailLinks;
};

const count = new Intl.NumberFormat("en-US");
const TEXT_CHARS = 120;

function clip(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > TEXT_CHARS ? `${clean.slice(0, TEXT_CHARS - 1).trimEnd()}…` : clean;
}

function detailOf(job: DigestJob): string {
  const place = clip(job.location);
  const remote = job.remote && !/\bremote\b/i.test(place) ? "Remote" : "";
  return [clip(job.company), remote, place, sourceCredit(job.source)].filter(Boolean).join(" · ");
}

function weeklyJobsSubject(found: number): string {
  return found === 1
    ? "A new job matches your resume"
    : `${count.format(found)} new jobs match your resume`;
}

function leadOf(found: number, shown: number): string {
  if (found <= shown) {
    return found === 1
      ? "One job posted in the past week matches your resume."
      : `${count.format(found)} jobs posted in the past week match your resume.`;
  }
  const closest =
    shown === 1 ? "Here's the closest." : `Here are the closest ${count.format(shown)}.`;
  return `${count.format(found)} jobs posted in the past week match your resume. ${closest}`;
}

export function weeklyJobsEmail(input: WeeklyJobsEmailInput): EmailMessage {
  const found = Math.max(input.found, input.jobs.length);
  const items = input.jobs.map((job) => ({
    title: clip(job.title),
    detail: detailOf(job),
    url: job.url,
  }));
  const text = items.map((item) => `- ${item.title}\n  ${item.detail}\n  ${item.url}`).join("\n");
  const html = `<ul style="margin:0 0 16px;padding-left:20px">${items
    .map(
      (item) =>
        `<li style="margin:0 0 12px"><a href="${escapeHtml(item.url)}" style="color:${INK};font-weight:600">${escapeHtml(item.title)}</a><br><span style="color:${MUTED};font-size:14px">${escapeHtml(item.detail)}</span></li>`,
    )
    .join("")}</ul>`;
  const upsell =
    input.free && found > FREE_JOB_MATCHES
      ? [
          `On ${PLANS.free.name}, the Jobs tab shows your closest ${FREE_JOB_MATCHES}. ${PLANS.pro.name} shows every match.`,
        ]
      : [];
  return letterEmail({
    to: input.to,
    subject: weeklyJobsSubject(found),
    tag: "weekly_jobs",
    lead: [leadOf(found, items.length)],
    middle: { text, html },
    after: ["Each link opens the original post.", ...upsell],
    button: { label: input.free ? "Open Jobs" : "See all your matches", url: input.jobsUrl },
    reason: "You get this because you turned on the weekly jobs email.",
    links: input.links,
  });
}
