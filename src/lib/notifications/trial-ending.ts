import { ROUTES } from "@/components/site/routes";
import { PLANS, PRICES_USD, type BillingInterval, type PaidPlanId } from "@/config/plans";
import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { formatFor } from "@/i18n/intl";
import { isTimeZone } from "@/lib/eligibility/profile";
import type { EmailMessage } from "./email";
import { escapeHtml, FONT, FOREST, INK, MUTED, RULE } from "./follow-up";
import { emailMessages, signOff as signOffIn } from "./locale";
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

export function trialEndDay(endsAt: number, timeZone: string | null, locale: Locale): string {
  return formatFor(locale).date(endsAt, {
    month: "long",
    day: "numeric",
    timeZone: zoneOf(timeZone),
  });
}

// 24-hour time with the zone named ("14:00 UTC", "19:30 GMT+5:30"), so it reads the same everywhere.
export function trialEndLabel(endsAt: number, timeZone: string | null, locale: Locale): string {
  const zone = zoneOf(timeZone);
  const format = formatFor(locale);
  const day = format.date(endsAt, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: zone,
  });
  const time = format.date(endsAt, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: zone,
    timeZoneName: "short",
  });
  return fmt(emailMessages(locale).trialEnding.at, { day, time });
}

// Prices stay in US dollars, written the reader's way ("$278/year", "US$ 278 por ano").
export function trialPriceLabel(
  plan: PaidPlanId,
  interval: BillingInterval,
  locale: Locale,
): string {
  const price = formatFor(locale).currency(PRICES_USD[plan][interval], "USD", {
    trailingZeroDisplay: "stripIfInteger",
  });
  return fmt(emailMessages(locale).trialEnding.price[interval], { price });
}

function copy(trial: TrialEnding, locale: Locale) {
  const t = emailMessages(locale).trialEnding;
  const plan = PLANS[trial.plan].name;
  return {
    t,
    plan,
    when: trialEndLabel(trial.endsAt, trial.timeZone, locale),
    price: trialPriceLabel(trial.plan, trial.interval, locale),
    subject: fmt(t.subject, { plan, day: trialEndDay(trial.endsAt, trial.timeZone, locale) }),
  };
}

export function trialEndingNotice(trial: TrialEnding, locale: Locale): TrialEndingNotice {
  const { t, plan, when, price, subject } = copy(trial, locale);
  const body = fmt(t.noticeBody, { when, plan, price });
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
  locale: Locale;
};

export function trialEndingEmail(input: TrialEndingEmailInput): EmailMessage {
  const { locale } = input;
  const { t, plan, when, price, subject } = copy(input, locale);
  const lead = fmt(t.lead, { plan, when });
  const charge = fmt(t.charge, { plan, price });
  const cancel = t.cancel;
  const signOff = signOffIn(locale);
  const footer = fmt(t.footer, { plan });
  const account = fmt(emailMessages(locale).linkLine, { label: t.account, url: input.accountUrl });

  const text = [lead, "", charge, "", cancel, account, "", signOff, "", "--", footer].join("\n");

  const html = `<div style="font-family:${FONT};font-size:16px;line-height:1.5;color:${INK};max-width:480px">
<img src="${escapeHtml(input.ottoHeadUrl)}" width="48" height="48" alt="Otto" style="display:block;margin:0 0 16px;border:0">
<p style="margin:0 0 16px">${escapeHtml(lead)}</p>
<p style="margin:0 0 16px">${escapeHtml(charge)}</p>
<p style="margin:0 0 20px">${escapeHtml(cancel)}</p>
<p style="margin:0 0 24px"><a href="${escapeHtml(input.accountUrl)}" style="display:inline-block;background:${FOREST};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px">${escapeHtml(t.button)}</a></p>
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
