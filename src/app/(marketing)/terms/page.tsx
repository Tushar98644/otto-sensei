import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import {
  AI_TOKEN_BUDGETS,
  FEATURE_LABELS,
  FEATURES,
  FREE_JOB_MATCHES,
  PLAN_ORDER,
  PLANS,
  PRICES_USD,
  PRO_TRIAL,
  RESUME_LIMITS,
} from "@/config/plans";
import { tokensInWords } from "@/lib/ai-budget-copy";
import { TRANSCRIBE_LIMITS } from "@/app/api/transcribe/limits";
import { LegalPage, type LegalSection } from "../_components/legal-page";
import { MERCHANT } from "../_components/merchant";
import { formatUsd } from "../_components/plan-features";

export const metadata: Metadata = pageMetadata({
  title: "Terms of service: plans, limits and cancelling",
  description: `The rules for using ${BRAND.name}, in plain English: your content stays yours, what each plan includes and costs, its monthly limits and how to cancel.`,
  path: ROUTES.terms,
});

const count = new Intl.NumberFormat("en-US");

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Limit({ value }: { value: number }) {
  if (value > 0) return count.format(value);
  return (
    <>
      <span aria-hidden>–</span>
      <span className="sr-only">None</span>
    </>
  );
}

function LimitsTable() {
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">Each month</th>
          {PLAN_ORDER.map((plan) => (
            <th key={plan} scope="col">
              {PLANS[plan].name}
            </th>
          ))}
          {/* No-break spaces: on phones the header may break only after the comma. */}
          <th scope="col" className="sm:whitespace-nowrap">
            {"Pro\u00a0trial, in\u00a0total"}
          </th>
        </tr>
      </thead>
      <tbody>
        {FEATURES.map((feature) => (
          <tr key={feature}>
            <th scope="row">{sentenceCase(FEATURE_LABELS[feature])}</th>
            {PLAN_ORDER.map((plan) => (
              <td key={plan}>
                <Limit value={PLANS[plan].limits[feature]} />
              </td>
            ))}
            <td>
              <Limit value={PRO_TRIAL.limits[feature]} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const SUMMARY = [
  "Your resumes and anything you write or upload stay yours.",
  "Otto's checks and suggestions are guidance, not a guarantee of an interview or a job.",
  `Pro costs ${formatUsd(PRICES_USD.pro.month)} a month or ${formatUsd(PRICES_USD.pro.year)} a year. New accounts can try it for ${PRO_TRIAL.days} days for ${formatUsd(PRO_TRIAL.priceUsd)}, once per person.`,
  "Cancel anytime from your account page, and you keep your plan until the end of the period you paid for.",
  "If a paid plan ends, nothing you made is deleted.",
];

const MAILTO = `mailto:${BRAND.supportEmail}`;

const SECTIONS: readonly LegalSection[] = [
  {
    title: "Who we are",
    body: (
      <p>
        {BRAND.name} is the business that runs this site and sells its plans, and the party these
        terms are with. You can reach us at <a href={MAILTO}>{BRAND.supportEmail}</a>.
      </p>
    ),
  },
  {
    title: "The service",
    body: (
      <>
        <p>
          {BRAND.name} lets you check, edit and tailor your resume and download it as a PDF. We
          provide it as is. We work hard to keep it accurate and online, but we can&apos;t promise
          it will always be error-free or available.
        </p>
        <p>
          Otto&apos;s checks and suggestions are guidance, not a guarantee. Hiring software differs
          between employers, and no tool can promise you an interview or a job. You decide what goes
          on your resume, so read every suggestion before you keep it.
        </p>
      </>
    ),
  },
  {
    title: "Your account",
    body: (
      <p>
        You sign in with a code sent to your email. Keep your email account secure, since anyone who
        can read it can sign in as you. You must be at least 16 to use {BRAND.name}.
      </p>
    ),
  },
  {
    title: "Your content is yours",
    body: (
      <>
        <p>
          Your resumes and anything you write or upload stay yours. You give us permission to store
          and process them only to run the service for you, for example to check a file, back up
          your resumes, or send text to our AI provider when you ask Otto for help. Our{" "}
          <Link href={ROUTES.privacy}>privacy policy</Link> explains how.
        </p>
        <p>Only upload content you have the right to use.</p>
      </>
    ),
  },
  {
    title: "Don't misuse it",
    body: (
      <>
        <ul>
          <li>
            Don&apos;t try to break, overload or get around the service or its limits, for example
            with scripts, bots or many accounts.
          </li>
          <li>Don&apos;t copy, resell or scrape the service.</li>
          <li>Don&apos;t upload anything illegal, harmful, or someone else&apos;s private data.</li>
          <li>Don&apos;t use it to pretend to be someone else.</li>
        </ul>
        <p>We may suspend or close accounts that break these rules.</p>
      </>
    ),
  },
  {
    title: "The AI writing tools",
    body: (
      <>
        <p>
          The AI tools (line fixes, tailoring, summaries, cover letters, outreach messages, answers
          to application questions, interview prep and Build with Otto) are for job-search writing
          only.
        </p>
        <ul>
          <li>
            Don&apos;t use them to create sexual, sexually explicit or other NSFW (not safe for
            work) content of any kind.
          </li>
          <li>
            Don&apos;t use them to create hateful, harassing, violent, illegal or deceptive content.
          </li>
        </ul>
        <p>
          The AI is set up to refuse such requests and leave such material out. Automated safety
          checks also block sexual or explicit content in what Otto writes and on pages you publish.
          We may remove content that breaks this rule and suspend or close the account that asked
          for it. Our <Link href={ROUTES.acceptableUse}>acceptable use policy</Link> has the full
          list.
        </p>
      </>
    ),
  },
  {
    title: "Plans and their limits",
    body: (
      <>
        <h3>What each plan includes</h3>
        <ul>
          <li>
            <strong>Free:</strong> the basic reader for uploads, the recruiter view, editing by
            hand, {PLANS.free.limits.fix} line fixes a month with Otto (summary help counts as one),{" "}
            {RESUME_LIMITS.free} resume, the Classic and Compact formats, PDF downloads, the{" "}
            {FREE_JOB_MATCHES} closest job matches and one tracked application with its reminder.
          </li>
          <li>
            <strong>Pro and Max</strong> add more line fixes and the rest of Otto&apos;s AI help
            (tailoring, letters, answers, interview prep, Build with Otto, GitHub drafts and AI
            reading of uploads), the other formats, up to {RESUME_LIMITS.paid} resumes, Word
            downloads, every job match with filters and saved jobs, tracking more than one
            application, share links, the work-rights check and portfolios.
          </li>
          <li>
            <strong>If a paid plan ends,</strong> nothing you made is deleted. You can still open,
            edit and download it, and links you shared stay up, but you can&apos;t add more until
            you upgrade again.
          </li>
        </ul>
        <h3>When limits reset</h3>
        <p>Each plan has a limit for each thing Otto does with AI, shown in the table below.</p>
        <ul>
          <li>
            <strong>Free:</strong> line fixes reset at the start of each calendar month (UTC).
          </li>
          <li>
            <strong>Monthly plans:</strong> the limits run from one renewal to the next and reset
            when your plan renews.
          </li>
          <li>
            <strong>Yearly plans:</strong> the same limits per month, reset on the day of the month
            the plan started. In a shorter month they reset on its last day: a plan started on the
            31st resets on the 30th of a 30-day month.
          </li>
          <li>
            <strong>The Pro trial:</strong> its own smaller limits for the whole trial.
          </li>
          <li>Unused limits don&apos;t carry over.</li>
          <li>
            <strong>Invite extras</strong> add to the current month or trial. On Free, the extra
            line fixes count that calendar month; the extra tailored versions count once you start a
            trial or upgrade that month, and extras you haven&apos;t used move with you when you do.
          </li>
        </ul>
        <p>Your account page shows the date your limits next reset.</p>
        <LimitsTable />
        <h3>At a limit</h3>
        <p>
          That feature pauses until your limits reset (on Free, at the start of the next month; on a
          monthly plan, at your next renewal; on a yearly plan, on the next monthly reset day; on
          the trial, until Pro starts), or until you move to a bigger plan. Moving up from Pro to
          Max between renewals doesn&apos;t reset a limit: what you used this month counts on the
          new plan. Uploads never stop: past the AI reads, the basic reader reads your file instead.
          Editing, recruiter checks and PDF downloads have no limit on any plan.
        </p>
        <p>
          Each paid plan also has a monthly AI budget ({tokensInWords(AI_TOKEN_BUDGETS.pro)} tokens
          on {PLANS.pro.name}, {tokensInWords(AI_TOKEN_BUDGETS.max)} on {PLANS.max.name},{" "}
          {tokensInWords(AI_TOKEN_BUDGETS.trial)} on the trial) that covers full use of the limits
          above and only stops automated or abusive use.
        </p>
        <h3>Voice typing</h3>
        <p>
          Voice typing is free and unlimited in browsers with built-in speech (Chrome, Edge and
          Safari). In other browsers, like Brave and Firefox, it uses our speech service: up to{" "}
          {TRANSCRIBE_LIMITS.daily.calls.free} clips a day on Free,{" "}
          {TRANSCRIBE_LIMITS.daily.calls.pro} on {PLANS.pro.name} and the trial, and{" "}
          {TRANSCRIBE_LIMITS.daily.calls.max} on {PLANS.max.name}, each up to 2 minutes.
        </p>
      </>
    ),
  },
  {
    title: "Payments and cancelling",
    body: (
      <ul>
        <li>
          Pro costs {formatUsd(PRICES_USD.pro.month)} a month or {formatUsd(PRICES_USD.pro.year)} a
          year. Max costs {formatUsd(PRICES_USD.max.month)} a month or{" "}
          {formatUsd(PRICES_USD.max.year)} a year. Prices are in US dollars, plus any taxes where
          you live.
        </li>
        <li>
          New accounts can have a {PRO_TRIAL.days}-day Pro trial for {formatUsd(PRO_TRIAL.priceUsd)}
          , once per person. You add a card at checkout, and the {formatUsd(PRO_TRIAL.priceUsd)}{" "}
          (plus any taxes) is charged when the trial starts. When the trial ends, Pro starts at{" "}
          {formatUsd(PRICES_USD.pro.month)} a month unless you cancel before then. During the trial
          a portfolio can be built and previewed, but it goes public only on a paid plan.
        </li>
        <li>
          {MERCHANT.disclosure} Its <a href={MERCHANT.buyerTermsUrl}>buyer terms</a> also apply to
          the purchase.
        </li>
        <li>
          A paid plan renews every period you picked until you cancel. Cancel anytime from your{" "}
          <Link href={ROUTES.account}>account page</Link>, and you keep it until the end of the
          period you paid for. You can move up from Pro to Max on the billing period you already
          have: your subscription changes in place, so you&apos;re never billed twice, and the
          difference for the rest of the period is charged right away. During the Pro trial you can
          start Max instead: the trial ends at once, the full Max price for the period you pick
          (plus any taxes) is charged right away to your card on file, and the{" "}
          {formatUsd(PRO_TRIAL.priceUsd)} trial charge isn&apos;t taken off. To move to Pro, or
          between monthly and yearly, cancel and pick the new plan once your current period ends. If
          you drop to Free, your published portfolio goes offline, and its data is kept in case you
          come back.
        </li>
        <li>
          If a payment fails when your plan renews or your trial ends, you keep the plan for a few
          days while the payment is tried again. If it still fails, your account moves to Free until
          you update your card from your account page and the payment goes through.
        </li>
        <li>
          Prices and limits may change. If your plan&apos;s price or limits change, we&apos;ll email
          you before the change applies to you, so you can cancel first if you prefer.
        </li>
        <li>
          Refund requests are handled by {MERCHANT.name} under its{" "}
          <a href={MERCHANT.buyerTermsUrl}>buyer terms</a>. Our{" "}
          <Link href={ROUTES.refunds}>refund page</Link> explains how to ask.
        </li>
      </ul>
    ),
  },
  {
    title: "Ending things",
    body: (
      <p>
        You can stop using {BRAND.name} and delete your account at any time. We may suspend or close
        an account that breaks these terms, and we&apos;ll tell you why when we can. We may also
        change or stop parts of the service over time.
      </p>
    ),
  },
  {
    title: "Limits on our liability",
    body: (
      <p>
        As far as the law allows, {BRAND.name} isn&apos;t liable for indirect losses, such as a
        missed job opportunity or lost income. Our total liability to you is limited to what you
        paid us in the 12 months before the claim. Nothing in these terms limits rights you have
        under consumer protection laws where you live.
      </p>
    ),
  },
  {
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms. When we do, we&apos;ll change the date at the top, and for
        important changes we&apos;ll email signed-in users before they take effect. Using{" "}
        {BRAND.name} after a change means you accept the new terms.
      </p>
    ),
  },
  {
    title: "Contact",
    body: (
      <p>
        Questions about these terms? Email <a href={MAILTO}>{BRAND.supportEmail}</a>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      intro={
        <p>
          These terms are the agreement between you and {BRAND.name} when you use this site. By
          using it, you agree to them. We kept them short and plain on purpose.
        </p>
      }
      summary={SUMMARY}
      sections={SECTIONS}
    />
  );
}
