import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/config";
import { escapeHtml, FONT, FOREST, INK, MUTED } from "./follow-up";
import { emailMessages } from "./locale";

// A plain page for the unsubscribe link in the footer of emails sent before these moved to the bell: mail scanners open links, so leaving takes a press.

export function unsubscribeCopy(locale: Locale) {
  return emailMessages(locale).unsubscribePage;
}

type PageInput = {
  title: string;
  message: string;
  // A form that posts back here; without one, a link to the settings.
  action: string | null;
  press: string;
  settingsUrl: string;
  ottoHeadUrl: string;
  locale: Locale;
};

export function unsubscribePage(input: PageInput): string {
  const settings = escapeHtml(emailMessages(input.locale).emailSettings);
  const button = `display:inline-block;background:${FOREST};color:#ffffff;font:inherit;font-weight:600;padding:12px 18px;border-radius:10px;border:0;cursor:pointer;text-decoration:none`;
  const control = input.action
    ? `<form method="post" action="${escapeHtml(input.action)}"><button type="submit" style="${button}">${escapeHtml(input.press)}</button></form>
<p style="margin:24px 0 0;color:${MUTED};font-size:14px"><a href="${escapeHtml(input.settingsUrl)}" style="color:${MUTED}">${settings}</a></p>`
    : `<p style="margin:0"><a href="${escapeHtml(input.settingsUrl)}" style="${button}">${settings}</a></p>`;
  return `<!doctype html>
<html lang="${input.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(`${input.title} · ${BRAND.name}`)}</title>
</head>
<body style="margin:0;background:#ffffff;color:${INK}">
<main style="font-family:${FONT};font-size:16px;line-height:1.5;max-width:480px;margin:0 auto;padding:64px 16px">
<img src="${escapeHtml(input.ottoHeadUrl)}" width="48" height="48" alt="" style="display:block;margin:0 0 16px;border:0">
<h1 style="font-size:24px;line-height:1.25;margin:0 0 12px">${escapeHtml(input.title)}</h1>
<p role="status" style="margin:0 0 24px">${escapeHtml(input.message)}</p>
${control}
</main>
</body>
</html>`;
}
