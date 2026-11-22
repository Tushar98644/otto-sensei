import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { SNOOZE_DAYS } from "@/lib/applications/follow-up";
import { applicationHref } from "@/lib/applications/thread";
import { DAY_MS } from "@/lib/time";
import type { EmailMessage } from "./email";
import type { InterviewEmailLine } from "./interview-soon";
import { NOTIFICATION_LIMITS } from "./types";

// Company names and roles are the user's own text: escaped in HTML, capped everywhere.

export type DueApplication = {
  id: string;
  company: string;
  role: string;
  appliedAt: number;
  // Set when the follow-up comes after an interview on that day.
  interviewedAt?: number | null;
};

export type FollowUpNotice = {
  title: string;
  body: string;
  link: string;
  applicationId: string | null;
};

export const NAME_CHARS = 80;
export const EMAIL_LISTED = 10;
// Up to this many due in one run get a bell row each, with Done, Snooze and the writer; more share one row.
export const FOLLOW_UP_ROWS = 3;

const count = new Intl.NumberFormat("en-US");

export function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function oldestFirst(list: readonly DueApplication[]): DueApplication[] {
  return [...list].sort((a, b) => a.appliedAt - b.appliedAt);
}

export function followUpMessage(list: readonly DueApplication[], now: number): string {
  const due = oldestFirst(list);
  const names = [...new Set(due.map((item) => clip(item.company, NAME_CHARS)).filter(Boolean))];
  const [only] = due;
  if (due.length === 1 && only) {
    const interviewed = only.interviewedAt ?? null;
    const days = Math.max(1, Math.floor((now - (interviewed ?? only.appliedAt)) / DAY_MS));
    const ago = `${count.format(days)} ${days === 1 ? "day" : "days"}`;
    if (interviewed !== null) {
      const name = names[0] ? ` with ${names[0]}` : "";
      return `It's been ${ago} since your interview${name}. A short note keeps you in mind.`;
    }
    return `It's been ${ago} since you applied to ${names[0] ?? "that company"}. A short follow-up can help.`;
  }
  const shown = names.slice(0, 2);
  const rest = due.length - shown.length;
  const who =
    shown.length === 0
      ? `${count.format(due.length)} applications`
      : rest > 0
        ? `${shown.join(", ")} and ${count.format(rest)} more`
        : shown.join(" and ");
  return `${who} are ready for a follow-up. A short note can help.`;
}

export function followUpNotice(list: readonly DueApplication[], now: number): FollowUpNotice {
  const due = oldestFirst(list).map((item) => ({ ...item, company: clip(item.company, NAME_CHARS) }));
  const only = due.length === 1 ? due[0] : undefined;
  const title = only
    ? only.company
      ? `Time to follow up with ${only.company}?`
      : "Time to follow up?"
    : `${count.format(due.length)} applications are ready for a follow-up`;
  return {
    title: clip(title, NOTIFICATION_LIMITS.title),
    body: clip(followUpMessage(due, now), NOTIFICATION_LIMITS.body),
    link: only ? applicationHref(only.id) : ROUTES.dashboardApplications,
    applicationId: only?.id ?? null,
  };
}

export function followUpNotices(list: readonly DueApplication[], now: number): FollowUpNotice[] {
  const due = oldestFirst(list);
  if (due.length === 0) return [];
  return due.length <= FOLLOW_UP_ROWS
    ? due.map((item) => followUpNotice([item], now))
    : [followUpNotice(due, now)];
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function daysAgo(item: DueApplication, now: number): string {
  const interviewed = item.interviewedAt ?? null;
  const days = Math.floor((now - (interviewed ?? item.appliedAt)) / DAY_MS);
  return `${interviewed === null ? "applied" : "interviewed"} ${count.format(days)} days ago`;
}

function line(item: DueApplication, now: number): { name: string; detail: string } {
  const name = clip(item.company, NAME_CHARS) || "A company";
  const role = clip(item.role, NAME_CHARS);
  return { name, detail: [role, daysAgo(item, now)].filter(Boolean).join(" · ") };
}

// Write is null for an account without Pro tools: the writer is a Pro tool, and this email sells nothing.
export type FollowUpActionUrls = { done: string | null; snooze: string | null; write: string | null };

export type FollowUpEmailInput = {
  to: string;
  applications: readonly DueApplication[];
  interviews?: readonly InterviewEmailLine[];
  now: number;
  applicationsUrl: string;
  settingsUrl: string;
  actionUrls: (applicationId: string) => FollowUpActionUrls;
  unsubscribeUrl: string | null;
  unsubscribePageUrl: string | null;
  ottoHeadUrl: string;
};

// PNG: email clients don't show inline SVG. Drawn at 2x (96px), shown at 48px.
export const OTTO_HEAD_EMAIL_PATH = "/email/otto-head.png";

export const INK = "#12241d";
export const MUTED = "#475850";
export const FOREST = "#0e3b2e";
export const RULE = "#dbe4de";
export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const SNOOZE_LABEL = `Snooze ${SNOOZE_DAYS} days`;
const WRITE_LABEL = "Write it for me";
const PREP_LABEL = "Open your prep";
const PREP_ADVICE = "Go over the likely questions in your prep before you go.";
const DOT = ` <span style="color:${MUTED}">·</span> `;

type Part = { text: string[]; html: string };
type Action = { label: string; url: string | null };
type Item = { name: string; detail: string; actions: Action[] };

function actionLink(action: Action): string {
  return action.url
    ? `<a href="${escapeHtml(action.url)}" style="color:${INK};font-weight:600">${escapeHtml(action.label)}</a>`
    : "";
}

function listPart(
  lead: string,
  items: readonly Item[],
  { more = 0, after = [] }: { more?: number; after?: readonly string[] } = {},
): Part {
  const andMore = `and ${count.format(more)} more`;
  const text = [
    lead,
    "",
    ...items.flatMap((item) => [
      `- ${item.name}${item.detail ? ` (${item.detail})` : ""}`,
      ...item.actions.flatMap((action) => (action.url ? [`  ${action.label}: ${action.url}`] : [])),
    ]),
    ...(more > 0 ? [`- ${andMore}`] : []),
    "",
    ...after.flatMap((paragraph) => [paragraph, ""]),
  ];
  const rows = items
    .map((item) => {
      const actions = item.actions.map(actionLink).filter(Boolean);
      return `<li style="margin:0 0 10px"><strong>${escapeHtml(item.name)}</strong>${item.detail ? ` <span style="color:${MUTED}">· ${escapeHtml(item.detail)}</span>` : ""}${actions.length ? `<br><span style="font-size:14px">${actions.join(DOT)}</span>` : ""}</li>`;
    })
    .join("");
  const rest = more > 0 ? `<li style="margin:0;color:${MUTED}">${andMore}</li>` : "";
  const paragraphs = after.map((paragraph) => `<p style="margin:0 0 20px">${escapeHtml(paragraph)}</p>\n`);
  return {
    text,
    html: `<p style="margin:0 0 16px">${escapeHtml(lead)}</p>\n<ul style="margin:0 0 16px;padding-left:20px">${rows}${rest}</ul>\n${paragraphs.join("")}`,
  };
}

// One interview and nothing else gets the main button; beside follow-ups it gets its own link.
function interviewPart(interviews: readonly InterviewEmailLine[], linked: boolean): Part | null {
  const [only, ...rest] = interviews;
  if (!only) return null;
  if (rest.length > 0) {
    const items = interviews.map((item) => ({
      name: item.title,
      detail: item.detail,
      actions: [{ label: PREP_LABEL, url: item.prepUrl }],
    }));
    return listPart(
      `You have ${count.format(interviews.length)} interviews coming up. ${PREP_ADVICE}`,
      items,
    );
  }
  const lead = `${only.title}. ${PREP_ADVICE}`;
  const prep = { label: PREP_LABEL, url: only.prepUrl };
  return {
    text: [lead, "", ...(linked ? [`${PREP_LABEL}: ${only.prepUrl}`, ""] : [])],
    html: `<p style="margin:0 0 16px">${escapeHtml(lead)}</p>\n${linked ? `<p style="margin:0 0 20px;font-size:14px">${actionLink(prep)}</p>\n` : ""}`,
  };
}

function followUpPart(input: FollowUpEmailInput, due: readonly DueApplication[]): Part | null {
  if (due.length === 0) return null;
  const listed = due.slice(0, EMAIL_LISTED).map((item) => ({ item, urls: input.actionUrls(item.id) }));
  const shown = listed.map(({ item, urls }) => ({
    ...line(item, input.now),
    actions: [
      { label: WRITE_LABEL, url: urls.write },
      { label: "Done", url: urls.done },
      { label: SNOOZE_LABEL, url: urls.snooze },
    ],
  }));
  const writes = listed.some(({ urls }) => urls.write !== null);
  const advice = `If you still want the job, a short, friendly note to the recruiter is enough.${writes ? ` Press ${WRITE_LABEL} and Otto drafts one from your resume.` : ""} Press Done once you've followed up, or snooze it for ${SNOOZE_DAYS} days.`;
  return listPart(followUpMessage(due, input.now), shown, {
    more: due.length - shown.length,
    after: [advice],
  });
}

function subjectOf(input: FollowUpEmailInput, interviews: readonly InterviewEmailLine[]): string {
  const [only] = interviews;
  if (only && interviews.length === 1) return only.title;
  if (interviews.length > 1) return `You have ${count.format(interviews.length)} interviews coming up`;
  return followUpNotice(input.applications, input.now).title;
}

// At most one email a day: the interviews coming up first, then the follow-ups that came due.
export function followUpEmail(input: FollowUpEmailInput): EmailMessage {
  const interviews = input.interviews ?? [];
  const due = oldestFirst(input.applications);
  const parts = [interviewPart(interviews, due.length > 0), followUpPart(input, due)].filter(
    (part): part is Part => part !== null,
  );
  const [only] = interviews;
  const button =
    due.length === 0 && only && interviews.length === 1
      ? { label: PREP_LABEL, url: only.prepUrl }
      : { label: "Open your applications", url: input.applicationsUrl };
  const optOut = input.unsubscribePageUrl ?? input.settingsUrl;

  const text = [
    ...parts.flatMap((part) => part.text),
    `${button.label}: ${button.url}`,
    "",
    `${BRAND.mascotName}, from ${BRAND.name}`,
    "",
    "--",
    `You get this because you turned on reminder emails. Unsubscribe in one click: ${optOut}`,
    `Change when reminders come: ${input.settingsUrl}`,
  ].join("\n");

  const html = `<div style="font-family:${FONT};font-size:16px;line-height:1.5;color:${INK};max-width:480px">
<img src="${escapeHtml(input.ottoHeadUrl)}" width="48" height="48" alt="Otto" style="display:block;margin:0 0 16px;border:0">
${parts.map((part) => part.html).join("")}<p style="margin:0 0 24px"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:${FOREST};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px">${escapeHtml(button.label)}</a></p>
<p style="margin:0 0 24px">${escapeHtml(`${BRAND.mascotName}, from ${BRAND.name}`)}</p>
<p style="margin:0;padding-top:16px;border-top:1px solid ${RULE};color:${MUTED};font-size:13px">You get this because you turned on reminder emails. <a href="${escapeHtml(optOut)}" style="color:${MUTED}">Unsubscribe</a> · <a href="${escapeHtml(input.settingsUrl)}" style="color:${MUTED}">Change when reminders come</a></p>
</div>`;

  const headers: Record<string, string> = input.unsubscribeUrl
    ? {
        "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      }
    : {};
  return {
    to: input.to,
    subject: subjectOf(input, interviews),
    text,
    html,
    headers,
    tags: [{ name: "kind", value: due.length > 0 ? "application_follow_up" : "interview_soon" }],
  };
}
