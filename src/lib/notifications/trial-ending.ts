import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { PLANS, type BillingInterval, type PaidPlanId } from "@/config/plans";
import { planPriceLabel } from "@/lib/billing/prices";
import { isTimeZone } from "@/lib/eligibility/profile";
import type { EmailMessage } from "./email";
import { escapeHtml, FONT, FOREST, INK, MUTED, RULE } from "./follow-up";
import { NOTIFICATION_LIMITS } from "./types";

// A billing notice: it goes to every trialist, whatever their reminder setting, and sells nothing.

export type TrialEnding = {
  plan: PaidPlanId;
  interval: BillingInterval;
  endsAt: number;
  // The work profile's IANA zone; anything else shows the time in UTC.
  timeZone: string | null;
};

export type TrialEndingNotice = { title: string; body: string; link: string };

export function zoneOf(timeZone: string | null): string {
  return timeZone && isTimeZone(timeZone) ? timeZone : "UTC";
}

export function trialEndDay(endsAt: number, timeZone: string | null): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: zoneOf(timeZone),
  }).format(endsAt);
}

// 24-hour time with the zone named ("14:00 UTC", "19:30 GMT+5:30"), so it reads the same everywhere.
export function trialEndLabel(endsAt: number, timeZone: string | null): string {
  const zone = zoneOf(timeZone);
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: zone,
  }).format(endsAt);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: zone,
    timeZoneName: "short",
  }).format(endsAt);
  return `${day} at ${time}`;
}

function copy(trial: TrialEnding) {
  const name = PLANS[trial.plan].name;
  return {
    name,
    when: trialEndLabel(trial.endsAt, trial.timeZone),
    price: planPriceLabel(trial.plan, trial.interval),
    subject: `Your ${name} trial ends on ${trialEndDay(trial.endsAt, trial.timeZone)}`,
  };
}

export function trialEndingNotice(trial: TrialEnding): TrialEndingNotice {
  const { name, when, price, subject } = copy(trial);
  const body = `It ends on ${when}. After that, ${name} costs ${price}. You can cancel anytime before then from your account page.`;
  return {
    title: subject.slice(0, NOTIFICATION_LIMITS.title),
    body: body.slice(0, NOTIFICATION_LIMITS.body),
    link: ROUTES.dashboardAccount,
  };
}

export type TrialEndingEmailInput = TrialEnding & {
  to: string;
  accountUrl: string;
  ottoHeadUrl: string;
};

export function trialEndingEmail(input: TrialEndingEmailInput): EmailMessage {
  const { name, when, price, subject } = copy(input);
  const lead = `A quick heads-up: your ${name} trial ends on ${when}.`;
  const charge = `After that, ${name} costs ${price} (in US dollars, plus any sales tax or VAT where you live) until you cancel. If you'd like to keep ${name}, there's nothing to do.`;
  const cancel =
    "If you don't want to continue, you can cancel anytime before then from your account page, and you won't be charged anything more.";
  const signOff = `${BRAND.mascotName}, from ${BRAND.name}`;
  const footer = `You're getting this because your ${name} trial is about to end. It's a billing notice, so it comes even if reminder emails are off.`;

  const text = [
    lead,
    "",
    charge,
    "",
    cancel,
    `Your account: ${input.accountUrl}`,
    "",
    signOff,
    "",
    "--",
    footer,
  ].join("\n");

  const html = `<div style="font-family:${FONT};font-size:16px;line-height:1.5;color:${INK};max-width:480px">
<img src="${escapeHtml(input.ottoHeadUrl)}" width="48" height="48" alt="Otto" style="display:block;margin:0 0 16px;border:0">
<p style="margin:0 0 16px">${escapeHtml(lead)}</p>
<p style="margin:0 0 16px">${escapeHtml(charge)}</p>
<p style="margin:0 0 20px">${escapeHtml(cancel)}</p>
<p style="margin:0 0 24px"><a href="${escapeHtml(input.accountUrl)}" style="display:inline-block;background:${FOREST};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px">Go to your account</a></p>
<p style="margin:0 0 24px">${escapeHtml(signOff)}</p>
<p style="margin:0;padding-top:16px;border-top:1px solid ${RULE};color:${MUTED};font-size:13px">${escapeHtml(footer)}</p>
</div>`;

  return {
    to: input.to,
    subject,
    text,
    html,
    tags: [{ name: "kind", value: "trial_ending" }],
  };
}
