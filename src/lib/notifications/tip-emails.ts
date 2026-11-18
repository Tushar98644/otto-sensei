import { FREE_APPLICATIONS, FREE_JOB_MATCHES, PLANS, PRO_TRIAL } from "@/config/plans";
import { BRAND } from "@/config/brand";
import { planPriceLabel } from "@/lib/billing/prices";
import type { EmailMessage } from "./email";
import { letterEmail, type EmailLinks } from "./layout";
import { trialEndDay } from "./trial-ending";
import type { TipEmailKind } from "./types";

export type TipEmailInput = {
  to: string;
  kind: TipEmailKind;
  // The trial's end, for trial_ended, shown in the work profile's zone (UTC without one).
  trialEndsAt: number | null;
  timeZone: string | null;
  // The UTC month the line fixes came back in, for fixes_back.
  month: number;
  urls: { resumes: string; jobs: string; plans: string };
  links: EmailLinks;
};

const REASON = `You get this because tips and reminders are on for your ${BRAND.name} account.`;

const fixes = PLANS.free.limits.fix;
const trialPlan = PLANS[PRO_TRIAL.plan].name;

function monthName(month: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(month);
}

type Copy = Pick<Parameters<typeof letterEmail>[0], "subject" | "lead" | "after" | "button">;

function copyFor(input: TipEmailInput): Copy {
  switch (input.kind) {
    case "no_resume":
      return {
        subject: "Your resume isn't in Otto Sensei yet",
        lead: [
          "You made an account a couple of days ago, but there's no resume in it yet.",
          "Upload a PDF or Word file, or start from scratch. Otto shows you what hiring software reads, helps fix weak lines, and finds open jobs that match.",
        ],
        button: { label: "Add your resume", url: input.urls.resumes },
      };
    case "fixes_back":
      return {
        subject: `Your ${fixes} free line fixes are back`,
        lead: [
          `It's ${monthName(input.month)}, so your ${fixes} free line fixes with Otto are back.`,
          "Pick a line that undersells what you did, and Otto suggests a stronger version that sticks to the facts.",
        ],
        button: { label: "Open your resumes", url: input.urls.resumes },
      };
    case "trial_ended":
      return {
        subject: `Your ${trialPlan} trial has ended`,
        lead: [
          input.trialEndsAt === null
            ? `Your ${trialPlan} trial has ended, and your account is on ${PLANS.free.name} now.`
            : `Your ${trialPlan} trial ended on ${trialEndDay(input.trialEndsAt, input.timeZone)}, and your account is on ${PLANS.free.name} now.`,
          "Everything you made is still there, and you can still open, edit and download it.",
          `${PLANS.free.name} keeps ${fixes} line fixes a month, your ${FREE_JOB_MATCHES} closest job matches and ${FREE_APPLICATIONS === 1 ? "one tracked application" : `${FREE_APPLICATIONS} tracked applications`}. If you'd like ${trialPlan} back, it's ${planPriceLabel(PRO_TRIAL.plan, "month")} (in US dollars, plus any sales tax or VAT where you live), and you can cancel anytime.`,
        ],
        button: { label: "See plans", url: input.urls.plans },
      };
    case "win_back":
      return {
        subject: "Still looking for a job?",
        lead: [
          `It's been about a month since you last used ${BRAND.name}.`,
          "If you're still looking, new jobs come in every day from companies' careers pages and public job feeds, and Otto lines them up against your resume.",
        ],
        after: [
          "If you've found one, congratulations. You can turn these emails off below, and this is the last nudge like it.",
        ],
        button: { label: "See your matches", url: input.urls.jobs },
      };
  }
}

export function tipEmail(input: TipEmailInput): EmailMessage {
  return letterEmail({
    ...copyFor(input),
    to: input.to,
    tag: input.kind,
    reason: REASON,
    links: input.links,
  });
}
