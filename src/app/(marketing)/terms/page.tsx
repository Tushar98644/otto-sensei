import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { FEATURE_LABELS, FEATURES, PAID_PLANS, PLANS, PRICES_USD, PRO_TRIAL } from "@/config/plans";
import { LegalPage } from "../_components/legal-page";
import { formatUsd } from "../_components/plan-features";

export const metadata: Metadata = pageMetadata({
  title: "Terms of service",
  description: `The rules for using ${BRAND.name}, in plain English: your content stays yours, each plan's limits, prices and cancelling.`,
  path: ROUTES.terms,
});

const count = new Intl.NumberFormat("en-US");

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function TermsPage() {
  const mailto = `mailto:${BRAND.supportEmail}`;
  return (
    <LegalPage title="Terms of service">
      <p>
        These terms are the agreement between you and {BRAND.name} when you use this site. By using
        it, you agree to them. We kept them short and plain on purpose.
      </p>

      <h2>The service</h2>
      <p>
        {BRAND.name} lets you check, edit and tailor your resume and download it as a PDF. We
        provide it as is. We work hard to keep it accurate and online, but we can&apos;t promise it
        will always be error-free or available.
      </p>
      <p>
        Otto&apos;s checks and suggestions are guidance, not a guarantee. Hiring software differs
        between employers, and no tool can promise you an interview or a job. You decide what goes
        on your resume, so read every suggestion before you keep it.
      </p>

      <h2>Your account</h2>
      <p>
        You sign in with a code sent to your email. Keep your email account secure, since anyone who
        can read it can sign in as you. You must be at least 16 to use {BRAND.name}.
      </p>

      <h2>Your content is yours</h2>
      <p>
        Your resumes and anything you write or upload stay yours. You give us permission to store
        and process them only to run the service for you, for example to check a file, back up your
        resumes, or send text to our AI provider when you ask Otto for help. Our{" "}
        <Link href={ROUTES.privacy}>privacy policy</Link> explains how.
      </p>
      <p>Only upload content you have the right to use.</p>

      <h2>Don&apos;t misuse it</h2>
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

      <h2>The AI writing tools</h2>
      <p>
        The AI tools (line fixes, tailoring, summaries, cover letters, answers to application
        questions, interview prep and Build with Otto) are for job-search writing only.
      </p>
      <ul>
        <li>
          Don&apos;t use them to create sexual, sexually explicit or other NSFW (not safe for work)
          content of any kind.
        </li>
        <li>
          Don&apos;t use them to create hateful, harassing, violent, illegal or deceptive content.
        </li>
      </ul>
      <p>
        The AI is set up to refuse such requests and leave such material out. We may remove content
        that breaks this rule and suspend or close the account that asked for it. Our{" "}
        <Link href={ROUTES.acceptableUse}>acceptable use policy</Link> has the full list.
      </p>

      <h2>Plans and their limits</h2>
      <p>
        Free includes the basic reader for uploads, the recruiter view, editing by hand, 1 resume,
        the Classic and Compact formats, PDF downloads, the 5 closest job matches and one tracked
        application with its reminder. Otto&apos;s AI help (line fixes, summaries, tailoring,
        letters, answers, interview prep, Build with Otto, GitHub drafts and AI reading of uploads),
        the other formats, up to 50 resumes, Word downloads, every job match with filters and saved
        jobs, tracking more than one application, share links, the work-rights check and portfolios
        come with Pro and Max. If a paid plan ends, nothing you made is deleted: you can still open,
        edit and download it, and links you shared stay up, but you can&apos;t add more until you
        upgrade again.
      </p>
      <p>
        Pro and Max have a limit for each thing Otto does with AI. On monthly plans the limits run
        from one renewal to the next and reset when your plan renews. Yearly plans have the same
        limits per month, reset on the day of the month the plan started (in a shorter month, on its
        last day: a plan started on the 31st resets on the 30th of a 30-day month). Weekly plans
        have smaller limits per billing week, the 7 days up to each renewal. The Pro trial has its
        own smaller limits for the whole trial. Unused ones don&apos;t carry over. Invite extras add
        to the current month, week or trial, on Pro and Max. Your account page shows the date your
        limits next reset.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Each month, on monthly and yearly plans</th>
            {PAID_PLANS.map((plan) => (
              <th key={plan} scope="col">
                {PLANS[plan].name}
              </th>
            ))}
            <th scope="col">Pro trial, in total</th>
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((feature) => (
            <tr key={feature}>
              <th scope="row">{sentenceCase(FEATURE_LABELS[feature])}</th>
              {PAID_PLANS.map((plan) => (
                <td key={plan}>{count.format(PLANS[plan].limits[feature])}</td>
              ))}
              <td>{count.format(PRO_TRIAL.limits[feature])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th scope="col">Each week, on weekly plans</th>
            {PAID_PLANS.map((plan) => (
              <th key={plan} scope="col">
                {PLANS[plan].name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((feature) => (
            <tr key={feature}>
              <th scope="row">{sentenceCase(FEATURE_LABELS[feature])}</th>
              {PAID_PLANS.map((plan) => (
                <td key={plan}>{count.format(PLANS[plan].weeklyLimits[feature])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        At a limit that feature pauses until your limits reset (on a monthly or weekly plan, at your
        next renewal; on a yearly plan, on the next monthly reset day; on the trial, until Pro
        starts), or until you move to a bigger plan. Moving between Pro and Max, or to another
        billing option, between renewals doesn&apos;t reset a limit: what you used this month counts
        on the new plan, and a week keeps its count until its 7 days are up. Uploads never stop:
        past the AI reads, the basic reader reads your file instead. Editing, recruiter checks and
        PDF downloads have no limit on any plan.
      </p>

      <h2>Payments and cancelling</h2>
      <ul>
        <li>
          Pro costs {formatUsd(PRICES_USD.pro.month)} a month, {formatUsd(PRICES_USD.pro.year)} a
          year or {formatUsd(PRICES_USD.pro.week)} a week. Max costs{" "}
          {formatUsd(PRICES_USD.max.month)} a month, {formatUsd(PRICES_USD.max.year)} a year or{" "}
          {formatUsd(PRICES_USD.max.week)} a week. Prices are in US dollars, plus any taxes where
          you live. Only the options shown on the pricing page are on sale.
        </li>
        <li>
          New accounts can try Pro free for {PRO_TRIAL.days} days, once per person. You add a card
          at checkout and nothing is charged during the trial. When it ends, Pro starts at{" "}
          {formatUsd(PRICES_USD.pro.month)} a month unless you cancel before then. During the trial
          a portfolio can be built and previewed, but it goes public only on a paid plan.
        </li>
        <li>
          Payments are processed by Creem, our merchant of record, and their checkout terms apply to
          the purchase.
        </li>
        <li>
          A paid plan renews every period you picked until you cancel. Cancel anytime from your{" "}
          <Link href={ROUTES.account}>account page</Link>, and you keep it until the end of the
          period you paid for. Moving between Pro and Max changes your subscription in place, with
          the difference charged or refunded. If you drop to Free, your published portfolio goes
          offline, and its data is kept in case you come back.
        </li>
        <li>
          Prices and limits may change. If your plan&apos;s price or limits change, we&apos;ll email
          you before the change applies to you, so you can cancel first if you prefer.
        </li>
        <li>
          Refunds are covered by our <Link href={ROUTES.refunds}>refund policy</Link>.
        </li>
      </ul>

      <h2>Ending things</h2>
      <p>
        You can stop using {BRAND.name} and delete your account at any time. We may suspend or close
        an account that breaks these terms, and we&apos;ll tell you why when we can. We may also
        change or stop parts of the service over time.
      </p>

      <h2>Limits on our liability</h2>
      <p>
        As far as the law allows, {BRAND.name} isn&apos;t liable for indirect losses, such as a
        missed job opportunity or lost income. Our total liability to you is limited to what you
        paid us in the 12 months before the claim. Nothing in these terms limits rights you have
        under consumer protection laws where you live.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms. When we do, we&apos;ll change the date at the top, and for
        important changes we&apos;ll email signed-in users before they take effect. Using{" "}
        {BRAND.name} after a change means you accept the new terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email <a href={mailto}>{BRAND.supportEmail}</a>.
      </p>
    </LegalPage>
  );
}
