import { BRAND } from "@/config/brand";
import { senderPostalAddress, type EmailMessage } from "@/lib/notifications/email";
import { escapeHtml, FONT, FOREST, INK, MUTED, RULE } from "@/lib/notifications/follow-up";
import { listUnsubscribeHeaders } from "@/lib/notifications/unsubscribe";
import { PROMPTS } from "./entry";
import { monthName } from "./month";
import { ENTRY_FIELDS, type Month } from "./types";

// The one email Otto still sends on its own: opt-in, at most once a month, everything else is in the bell.

export type CheckinNotice = { title: string; body: string };

export function checkinNotice(month: Month): CheckinNotice {
  return {
    title: `Your ${monthName(month)} check-in`,
    body: "One minute: what you shipped, any numbers, and anything you learned or led.",
  };
}

export type CheckinEmailInput = {
  to: string;
  month: Month;
  url: string;
  links: { ottoHeadUrl: string; settingsUrl: string; unsubscribeUrl: string | null };
};

const paragraph = (text: string, bottom = 16) =>
  `<p style="margin:0 0 ${bottom}px">${escapeHtml(text)}</p>`;

export function checkinEmail(input: CheckinEmailInput): EmailMessage {
  const { links } = input;
  const name = monthName(input.month);
  const prompts = ENTRY_FIELDS.map((field) => PROMPTS[field]);
  const lead = `One minute for ${name}? Three quick questions, by voice or text. Skip any you like.`;
  const after = [
    "Nothing new this month? That's one tap on the page.",
    "Your notes stay free on every plan. When you look for your next job, Pro turns them into resume lines that quote your own facts.",
  ];
  const reason = "You get this because you turned on the career log check-in. Once a month.";
  const optOut = links.unsubscribeUrl ?? links.settingsUrl;
  const signOff = `${BRAND.mascotName}, from ${BRAND.name}`;
  const address = senderPostalAddress();
  const sender = address ? `${BRAND.name}, ${address}` : null;

  const text = [
    lead,
    "",
    ...prompts.map((prompt) => `- ${prompt.label} ${prompt.hint}`),
    "",
    ...after.flatMap((line) => [line, ""]),
    `Write my check-in: ${input.url}`,
    "",
    signOff,
    "",
    "--",
    `${reason} Unsubscribe in one click: ${optOut}`,
    `Email settings: ${links.settingsUrl}`,
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
${after.map((line) => paragraph(line)).join("\n")}
<p style="margin:4px 0 24px"><a href="${escapeHtml(input.url)}" style="display:inline-block;background:${FOREST};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px">Write my check-in</a></p>
${paragraph(signOff, 24)}
<p style="margin:0;padding-top:16px;border-top:1px solid ${RULE};color:${MUTED};font-size:13px">${escapeHtml(reason)} <a href="${escapeHtml(optOut)}" style="color:${MUTED}">Unsubscribe</a> · <a href="${escapeHtml(links.settingsUrl)}" style="color:${MUTED}">Email settings</a></p>
${sender ? `<p style="margin:8px 0 0;color:${MUTED};font-size:13px">${escapeHtml(sender)}</p>` : ""}
</div>`;

  return {
    to: input.to,
    subject: `Your one-minute ${name} check-in`,
    text,
    html,
    headers: listUnsubscribeHeaders(links.unsubscribeUrl),
    tags: [{ name: "kind", value: "career_checkin" }],
  };
}
