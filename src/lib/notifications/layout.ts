import { BRAND } from "@/config/brand";
import { senderPostalAddress, type EmailMessage } from "./email";
import { escapeHtml, FONT, FOREST, INK, MUTED, RULE } from "./follow-up";
import { listUnsubscribeHeaders } from "./unsubscribe";

// The weekly jobs email and the tips share one plain layout; it escapes all text, and a middle block brings its own escaped HTML.

export type EmailLinks = {
  ottoHeadUrl: string;
  settingsUrl: string;
  unsubscribeUrl: string | null;
};

type EmailBlock = { text: string; html: string };

type LetterInput = {
  to: string;
  subject: string;
  tag: string;
  lead: readonly string[];
  middle?: EmailBlock;
  after?: readonly string[];
  button: { label: string; url: string };
  reason: string;
  links: EmailLinks;
};

const paragraph = (text: string, bottom = 16) =>
  `<p style="margin:0 0 ${bottom}px">${escapeHtml(text)}</p>`;

export function letterEmail(input: LetterInput): EmailMessage {
  const { links } = input;
  const optOut = links.unsubscribeUrl ?? links.settingsUrl;
  const signOff = `${BRAND.mascotName}, from ${BRAND.name}`;
  const after = input.after ?? [];
  const address = senderPostalAddress();
  const sender = address ? `${BRAND.name}, ${address}` : null;

  const text = [
    ...input.lead.flatMap((line) => [line, ""]),
    ...(input.middle ? [input.middle.text, ""] : []),
    ...after.flatMap((line) => [line, ""]),
    `${input.button.label}: ${input.button.url}`,
    "",
    signOff,
    "",
    "--",
    `${input.reason} Unsubscribe in one click: ${optOut}`,
    `Email settings: ${links.settingsUrl}`,
    ...(sender ? [sender] : []),
  ].join("\n");

  const html = `<div style="font-family:${FONT};font-size:16px;line-height:1.5;color:${INK};max-width:480px">
<img src="${escapeHtml(links.ottoHeadUrl)}" width="48" height="48" alt="Otto" style="display:block;margin:0 0 16px;border:0">
${input.lead.map((line) => paragraph(line)).join("\n")}
${input.middle ? input.middle.html : ""}
${after.map((line) => paragraph(line)).join("\n")}
<p style="margin:4px 0 24px"><a href="${escapeHtml(input.button.url)}" style="display:inline-block;background:${FOREST};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px">${escapeHtml(input.button.label)}</a></p>
${paragraph(signOff, 24)}
<p style="margin:0;padding-top:16px;border-top:1px solid ${RULE};color:${MUTED};font-size:13px">${escapeHtml(input.reason)} <a href="${escapeHtml(optOut)}" style="color:${MUTED}">Unsubscribe</a> · <a href="${escapeHtml(links.settingsUrl)}" style="color:${MUTED}">Email settings</a></p>
${sender ? `<p style="margin:8px 0 0;color:${MUTED};font-size:13px">${escapeHtml(sender)}</p>` : ""}
</div>`;

  return {
    to: input.to,
    subject: input.subject,
    text,
    html,
    headers: listUnsubscribeHeaders(links.unsubscribeUrl),
    tags: [{ name: "kind", value: input.tag }],
  };
}
