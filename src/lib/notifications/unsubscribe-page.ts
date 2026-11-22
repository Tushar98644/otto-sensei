import { BRAND } from "@/config/brand";
import { escapeHtml, FONT, FOREST, INK, MUTED } from "./follow-up";
import type { EmailList } from "./types";

// A plain page for the unsubscribe link in the footer of emails sent before these moved to the bell: mail scanners open links, so leaving takes a press.

type ListCopy = { name: string; ask: string; press: string; done: string };

export const UNSUBSCRIBE_COPY: Record<EmailList, ListCopy> = {
  reminders: {
    name: "Follow-up reminder emails",
    ask: "Turn off follow-up reminder emails? Your reminders stay in the bell on your dashboard.",
    press: "Turn off reminder emails",
    done: "Done. You won't get follow-up reminder emails any more. The bell on your dashboard keeps them.",
  },
  jobs: {
    name: "The weekly jobs email",
    ask: "Stop the weekly email about new jobs that match your resume? The Jobs tab still shows them.",
    press: "Stop the weekly email",
    done: "Done. You won't get the weekly jobs email any more. New matches show in the bell on your dashboard.",
  },
  tips: {
    name: "Tips and reminders",
    ask: "Stop tips and reminder emails, like the note when Free's line fixes come back? Billing notices about a trial still come.",
    press: "Stop tips and reminders",
    done: "Done. You won't get tips and reminder emails any more.",
  },
  views: {
    name: "Views emails",
    ask: "Stop the emails about people opening your resume links and portfolio? The bell on your dashboard still shows them.",
    press: "Stop views emails",
    done: "Done. You won't get views emails any more. The bell on your dashboard keeps them.",
  },
  career: {
    name: "Career log check-in emails",
    ask: "Stop the monthly career log email? Your log stays, free, and the bell on your dashboard still asks once a month.",
    press: "Stop check-in emails",
    done: "Done. You won't get career log emails any more. Your log stays, and you can turn the email back on in your account settings.",
  },
};

export const INVALID_LINK =
  "That link isn't valid any more. Otto no longer sends these emails; your reminders are in the bell on your dashboard.";

type PageInput = {
  title: string;
  message: string;
  // A form that posts back here; without one, a link to the settings.
  action: string | null;
  press: string;
  settingsUrl: string;
  ottoHeadUrl: string;
};

export function unsubscribePage(input: PageInput): string {
  const button = `display:inline-block;background:${FOREST};color:#ffffff;font:inherit;font-weight:600;padding:12px 18px;border-radius:10px;border:0;cursor:pointer;text-decoration:none`;
  const control = input.action
    ? `<form method="post" action="${escapeHtml(input.action)}"><button type="submit" style="${button}">${escapeHtml(input.press)}</button></form>
<p style="margin:24px 0 0;color:${MUTED};font-size:14px"><a href="${escapeHtml(input.settingsUrl)}" style="color:${MUTED}">Email settings</a></p>`
    : `<p style="margin:0"><a href="${escapeHtml(input.settingsUrl)}" style="${button}">Email settings</a></p>`;
  return `<!doctype html>
<html lang="en">
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
