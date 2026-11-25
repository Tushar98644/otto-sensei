import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { formatFor } from "@/i18n/intl";
import { senderPostalAddress, type EmailMessage } from "@/lib/notifications/email";
import { escapeHtml, FONT, FOREST, INK, MUTED, RULE } from "@/lib/notifications/follow-up";
import { emailMessages, signOff as signOffIn } from "@/lib/notifications/locale";
import { listUnsubscribeHeaders } from "@/lib/notifications/unsubscribe";
import { splitMonth } from "./month";
import { ENTRY_FIELDS, type Month } from "./types";

// The one email Otto still sends on its own: opt-in, at most once a month, everything else is in the bell.

export type CheckinNotice = { title: string; body: string };

// "November", "noviembre", "November".
function monthIn(month: Month, locale: Locale): string {
  const { year, month: index } = splitMonth(month);
  return formatFor(locale).date(Date.UTC(year, index - 1, 1), { month: "long", timeZone: "UTC" });
}

export function checkinNotice(month: Month, locale: Locale): CheckinNotice {
  const t = emailMessages(locale).checkin;
  return { title: fmt(t.noticeTitle, { month: monthIn(month, locale) }), body: t.noticeBody };
}

export type CheckinEmailInput = {
  to: string;
  month: Month;
  url: string;
  links: { ottoHeadUrl: string; settingsUrl: string; unsubscribeUrl: string | null };
  locale: Locale;
};

const paragraph = (text: string, bottom = 16) =>
  `<p style="margin:0 0 ${bottom}px">${escapeHtml(text)}</p>`;

export function checkinEmail(input: CheckinEmailInput): EmailMessage {
  const { links, locale } = input;
  const words = emailMessages(locale);
  const t = words.checkin;
  const name = monthIn(input.month, locale);
  const prompts = ENTRY_FIELDS.map((field) => t.prompts[field]);
  const lead = fmt(t.lead, { month: name });
  const after = [t.nothingNew, t.free];
  const reason = t.reason;
  const optOut = links.unsubscribeUrl ?? links.settingsUrl;
  const signOff = signOffIn(locale);
  const address = senderPostalAddress();
  const sender = address ? `${BRAND.name}, ${address}` : null;
  const line = (label: string, url: string) => fmt(words.linkLine, { label, url });

  const text = [
    lead,
    "",
    ...prompts.map((prompt) => `- ${prompt.label} ${prompt.hint}`),
    "",
    ...after.flatMap((text) => [text, ""]),
    line(t.button, input.url),
    "",
    signOff,
    "",
    "--",
    `${reason} ${fmt(words.unsubscribeLine, { url: optOut })}`,
    line(words.emailSettings, links.settingsUrl),
    ...(sender ? [sender] : []),
  ].join("\n");

  const list = `<ul style="margin:0 0 16px;padding-left:20px">${prompts
    .map(
      (prompt) =>
        `<li style="margin:0 0 10px"><span style="color:${INK};font-weight:600">${escapeHtml(prompt.label)}</span><br><span style="color:${MUTED};font-size:14px">${escapeHtml(prompt.hint)}</span></li>`,
    )
    .join("")}</ul>`;
  const html = `<div style="font-family:${FONT};font-size:16px;line-height:1.5;color:${INK};max-width:480px">
<img src="${escapeHtml(links.ottoHeadUrl)}" width="48" height="48" alt="Otto" style="display:block;margin:0 0 16px;border:0">
${paragraph(lead)}
${list}
${after.map((text) => paragraph(text)).join("\n")}
<p style="margin:4px 0 24px"><a href="${escapeHtml(input.url)}" style="display:inline-block;background:${FOREST};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px">${escapeHtml(t.button)}</a></p>
${paragraph(signOff, 24)}
<p style="margin:0;padding-top:16px;border-top:1px solid ${RULE};color:${MUTED};font-size:13px">${escapeHtml(reason)} <a href="${escapeHtml(optOut)}" style="color:${MUTED}">${escapeHtml(words.unsubscribe)}</a> · <a href="${escapeHtml(links.settingsUrl)}" style="color:${MUTED}">${escapeHtml(words.emailSettings)}</a></p>
${sender ? `<p style="margin:8px 0 0;color:${MUTED};font-size:13px">${escapeHtml(sender)}</p>` : ""}
</div>`;

  return {
    to: input.to,
    subject: fmt(t.subject, { month: name }),
    text,
    html,
    headers: listUnsubscribeHeaders(links.unsubscribeUrl),
    tags: [{ name: "kind", value: "career_checkin" }],
  };
}
