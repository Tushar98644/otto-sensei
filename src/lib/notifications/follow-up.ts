import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { SNOOZE_DAYS } from "@/lib/applications/follow-up";
import { DAY_MS } from "@/lib/time";
import type { EmailMessage } from "./email";
import { NOTIFICATION_LIMITS } from "./types";

// Company names and roles are the user's own text: escaped in HTML, capped everywhere.

export type DueApplication = { id: string; company: string; role: string; appliedAt: number };

export type FollowUpNotice = { title: string; body: string; link: string };

const NAME_CHARS = 80;
export const EMAIL_LISTED = 10;

const count = new Intl.NumberFormat("en-US");

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function oldestFirst(list: readonly DueApplication[]): DueApplication[] {
  return [...list].sort((a, b) => a.appliedAt - b.appliedAt);
}

export function followUpMessage(list: readonly DueApplication[], now: number): string {
  const due = oldestFirst(list);
  const names = [...new Set(due.map((item) => clip(item.company, NAME_CHARS)).filter(Boolean))];
  if (due.length === 1) {
    const days = Math.max(1, Math.floor((now - (due[0]?.appliedAt ?? now)) / DAY_MS));
    const name = names[0] ?? "that company";
    return `It's been ${count.format(days)} ${days === 1 ? "day" : "days"} since you applied to ${name}. A short follow-up can help.`;
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
  const first = due[0]?.company;
  const title =
    due.length === 1
      ? first
        ? `Time to follow up with ${first}?`
        : "Time to follow up?"
      : `${count.format(due.length)} applications are ready for a follow-up`;
  return {
    title: clip(title, NOTIFICATION_LIMITS.title),
    body: clip(followUpMessage(due, now), NOTIFICATION_LIMITS.body),
    link: ROUTES.dashboardApplications,
  };
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function daysAgo(appliedAt: number, now: number): string {
  const days = Math.floor((now - appliedAt) / DAY_MS);
  return `applied ${count.format(days)} days ago`;
}

function line(item: DueApplication, now: number): { name: string; detail: string } {
  const name = clip(item.company, NAME_CHARS) || "A company";
  const role = clip(item.role, NAME_CHARS);
  return { name, detail: [role, daysAgo(item.appliedAt, now)].filter(Boolean).join(" · ") };
}

export type FollowUpActionUrls = { done: string | null; snooze: string | null };

export type FollowUpEmailInput = {
  to: string;
  applications: readonly DueApplication[];
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

export function followUpEmail(input: FollowUpEmailInput): EmailMessage {
  const notice = followUpNotice(input.applications, input.now);
  const due = oldestFirst(input.applications);
  const listed = due.slice(0, EMAIL_LISTED);
  const shown = listed.map((item) => ({ ...line(item, input.now), urls: input.actionUrls(item.id) }));
  const more = due.length - shown.length;
  const lead = followUpMessage(due, input.now);
  const advice = `If you still want the job, a short, friendly note to the recruiter is enough. Press Done once you've followed up, or snooze it for ${SNOOZE_DAYS} days.`;
  const optOut = input.unsubscribePageUrl ?? input.settingsUrl;

  const text = [
    lead,
    "",
    ...shown.flatMap((item) => [
      `- ${item.name} (${item.detail})`,
      ...(item.urls.done ? [`  Done: ${item.urls.done}`] : []),
      ...(item.urls.snooze ? [`  ${SNOOZE_LABEL}: ${item.urls.snooze}`] : []),
    ]),
    ...(more > 0 ? [`- and ${count.format(more)} more`] : []),
    "",
    advice,
    "",
    `Open your applications: ${input.applicationsUrl}`,
    "",
    `${BRAND.mascotName}, from ${BRAND.name}`,
    "",
    "--",
    `You get this because you turned on reminder emails. Unsubscribe in one click: ${optOut}`,
    `Change when reminders come: ${input.settingsUrl}`,
  ].join("\n");

  const actionLink = (href: string, label: string) =>
    `<a href="${escapeHtml(href)}" style="color:${INK};font-weight:600">${label}</a>`;
  const items = shown
    .map((item) => {
      const actions = [
        item.urls.done ? actionLink(item.urls.done, "Done") : "",
        item.urls.snooze ? actionLink(item.urls.snooze, SNOOZE_LABEL) : "",
      ].filter(Boolean);
      return `<li style="margin:0 0 10px"><strong>${escapeHtml(item.name)}</strong> <span style="color:${MUTED}">· ${escapeHtml(item.detail)}</span>${actions.length ? `<br><span style="font-size:14px">${actions.join(` <span style="color:${MUTED}">·</span> `)}</span>` : ""}</li>`;
    })
    .join("");
  const html = `<div style="font-family:${FONT};font-size:16px;line-height:1.5;color:${INK};max-width:480px">
<img src="${escapeHtml(input.ottoHeadUrl)}" width="48" height="48" alt="Otto" style="display:block;margin:0 0 16px;border:0">
<p style="margin:0 0 16px">${escapeHtml(lead)}</p>
<ul style="margin:0 0 16px;padding-left:20px">${items}${more > 0 ? `<li style="margin:0;color:${MUTED}">and ${count.format(more)} more</li>` : ""}</ul>
<p style="margin:0 0 20px">${escapeHtml(advice)}</p>
<p style="margin:0 0 24px"><a href="${escapeHtml(input.applicationsUrl)}" style="display:inline-block;background:${FOREST};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px">Open your applications</a></p>
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
    subject: notice.title,
    text,
    html,
    headers,
    tags: [{ name: "kind", value: "application_follow_up" }],
  };
}
