import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { LegalPage, type LegalSection } from "../_components/legal-page";
import { MERCHANT } from "../_components/merchant";

export const metadata: Metadata = pageMetadata({
  title: "Privacy policy: where your resume is stored",
  description: `What ${BRAND.name} collects, where your resume is stored and who else processes it, in plain English. No ads, no tracking cookies, no selling your data.`,
  path: ROUTES.privacy,
});

const MAILTO = `mailto:${BRAND.supportEmail}`;

const SUMMARY = [
  "We don't sell your data or share it for advertising, and we don't use ads or tracking cookies.",
  "Your resumes are saved in your browser. If you sign in, we also keep a backup so you can open them on other devices.",
  "Each AI feature sends only the text it needs, when you use it. We tell OpenRouter to use only providers that don't train on it.",
  `Payments go through ${MERCHANT.name}. We never see your full card number.`,
  "Deleting your account removes your account data right away. If you've had a trial or paid, only a one-way fingerprint of your email stays, so each person gets the Pro trial once.",
];

const SECTIONS: readonly LegalSection[] = [
  {
    title: "What we collect",
    body: (
      <ul>
        <li>
          <strong>Your email address,</strong> if you sign in, either with Google or with a code we
          email you. We use it to sign you in and to send important notices about your account or
          billing. There are no passwords. If you use Google, it also shares your name and profile
          picture with our sign-in provider; we don&apos;t use them.
        </li>
        <li>
          <strong>Your resumes.</strong> They&apos;re saved in your browser&apos;s local storage, on
          your device. If you sign in, we also keep a backup copy in our database so you can open
          them on other devices.
        </li>
        <li>
          <strong>Share links.</strong> If you share a resume, we keep a copy of that version
          (without hidden lines or tailoring notes) so anyone with the link can read it and download
          it as a PDF. Your email and phone show only if you turn that on, and search engines are
          asked to skip the page unless you allow them. We count views: to count each reader once,
          we keep a scrambled code made from their network address and browser (not the address
          itself) for about two days. Turning the link off deletes the copy.
        </li>
        <li>
          <strong>Applications you log.</strong> If you track job applications, we store what you
          enter (company, job title, job link, date, status and notes) and which resume you sent, so
          you can see your own interview rate. If you make an interview prep pack for one, we save
          it with that application. Nobody else sees it.
        </li>
        <li>
          <strong>Letters and messages you keep.</strong> When you write a cover letter, an
          application answer or an outreach message while signed in, we store it with the company,
          job title and job link it was for and the title of the resume it came from, so you can
          find it again under Letters and messages. Edits you make to an outreach message are saved
          as you type. Otto doesn&apos;t look anyone up, but what you type into a message, such as
          the name of the person you&apos;re writing to, is saved with it. Deleting one deletes it.
          Nobody else sees them.
        </li>
        <li>
          <strong>Reminders.</strong> When you mark a job applied, we store a follow-up date (7 days
          later unless you pick another number). When it comes, we add a note to your dashboard. We
          email you about it only if you turn reminder emails on on your account page. We store the
          note, whether you&apos;ve read it, the date, and your reminder settings. Read notes are
          deleted after 90 days, unread ones after a year.
        </li>
        <li>
          <strong>Other emails from Otto.</strong> We store your choices for the weekly email of new
          job matches (off unless you turn it on) and for tips and reminders (on unless you turn
          them off), and when you answered the Jobs tab&apos;s question about the weekly email. For
          the weekly email we store when the last one went out and when we last looked for new
          matches; it uses your resume and work profile the way the Jobs tab does, and leaves out
          jobs you saved or applied to. To pick a tip we look at what you&apos;ve done in Otto
          lately, such as whether you&apos;ve added a resume or used a line fix this month, and we
          keep a record of which tips we sent you and when (never the email&apos;s text), so none
          goes twice. While a trial runs, and only if tips are on, we keep a copy of its end date so
          we can tell when it ended. Every one of these emails has a one-click unsubscribe link, and
          your account page has the switches.
        </li>
        <li>
          <strong>Your work profile.</strong> If you fill it in, we store the country you live in,
          your time zone, where you can work without a sponsored visa, whether you want full-time or
          contract work, and whether you only want remote jobs. Otto checks job posts against it in
          your browser, and on our server when ranking the Jobs tab. Nobody else sees it.
        </li>
        <li>
          <strong>Your writing style.</strong> If you set one, we store the tone, length, spelling
          and sign-off you pick and any notes you write for Otto. They shape your cover letters,
          application answers and outreach messages. Nobody else sees them.
        </li>
        <li>
          <strong>Jobs you match and save.</strong> To rank open jobs for you, your browser sends
          the skills, job titles and years of experience it reads from your resume, never the resume
          itself or your contact details. We use them for that one request and don&apos;t store them
          or send them to an AI. If you save a job, we store which one and when. The jobs themselves
          come from companies&apos; public careers pages and job feeds, each linked to its original
          post.
        </li>
        <li>
          <strong>Files you upload.</strong> We read them in memory to pull out the text and run the
          checks. We don&apos;t store the files.
        </li>
        <li>
          <strong>Usage counts.</strong> For signed-in users, how many line fixes, tailored
          versions, cover letters and answers you&apos;ve used this month (or during your trial),
          plus any extra an invite earned you, so plan limits work.
        </li>
        <li>
          <strong>Plan and billing status.</strong> If you subscribe or start a trial, we store your
          plan and the subscription details {MERCHANT.name} sends us, such as whether it&apos;s
          active, when your trial ends and when it renews. We never see your full card number.
        </li>
        <li>
          <strong>Trial record.</strong> So each person gets the Pro trial only once, we keep a
          one-way fingerprint (a SHA-256 hash) of the email of anyone who has started a trial or
          paid. It can&apos;t be turned back into your email, and we keep it after you delete your
          account, only to check whether that email has had a trial.
        </li>
        <li>
          <strong>Feedback you send.</strong> Your note, whether it&apos;s a problem or an idea, and
          the page you sent it from. If you&apos;re signed in, it&apos;s linked to your account.
        </li>
        <li>
          <strong>Invites.</strong> Your invite code, which account joined through whose link, and
          the device cookie ids (below) of the browsers used, so nobody can invite themselves.
          Inviters only see counts, never who joined. Once you have an invite link, the &ldquo;Made
          with Otto Sensei&rdquo; link at the foot of your share links carries your invite code, so
          people who sign up from there count as your invites. The code alone doesn&apos;t say who
          you are.
        </li>
        <li>
          <strong>Abuse-prevention counters.</strong> To stop abuse, we count requests per IP
          address, device and email address in short time windows. These counters are deleted after
          about two days.
        </li>
        <li>
          <strong>Technical logs.</strong> Our servers log events such as errors. Logs never include
          your resume text, and email addresses in them are masked.
        </li>
        <li>
          <strong>Usage events.</strong> Which steps people take, such as uploading a resume,
          downloading a PDF or upgrading, with simple counts like how many checks failed. They never
          include your resume text, job posts, name or email address. If you&apos;re signed in,
          they&apos;re linked to your account&apos;s random id. If your browser sends Do Not Track
          or Global Privacy Control, we send none at all.
        </li>
      </ul>
    ),
  },
  {
    title: "How Otto uses AI",
    body: (
      <>
        <p>
          Otto uses AI models (by default Z.ai&apos;s GLM) through OpenRouter. Each feature sends
          only the text it needs, and only when you use it:
        </p>
        <ul>
          <li>
            <strong>Importing a resume:</strong> the text of the file, to sort it into sections.
          </li>
          <li>
            <strong>Fixing a line:</strong> the line, its job title and company, and your answers to
            Otto&apos;s questions.
          </li>
          <li>
            <strong>Writing your summary:</strong> your resume without its contact details, or only
            the summary you asked Otto to tighten.
          </li>
          <li>
            <strong>Tailoring, cover letters, outreach messages and application answers:</strong>{" "}
            your resume, the job post, for an answer the question, and your writing style if you set
            one (with any contact details in your notes replaced by placeholders).
          </li>
          <li>
            <strong>Interview prep:</strong> your resume and the job post.
          </li>
          <li>
            <strong>&quot;Build with Otto&quot;:</strong> the job you want and what you wrote about
            each job, never your name.
          </li>
          <li>
            <strong>Import from GitHub:</strong> the description, README and pull request text of
            the repos and pull requests you pick.
          </li>
        </ul>
        <p>
          Before any of this goes to the AI, Otto replaces your name, email, phone number and links
          with placeholders, and puts them back afterwards. It spots them by their usual patterns,
          so an unusual format can slip through. OpenRouter passes the text to the model&apos;s
          provider and sends back the result. We tell OpenRouter to use only providers that
          don&apos;t train on this data. Providers may keep it for a limited time under their own
          policies, for example to detect abuse.
        </p>
        <p>
          <strong>Safety checks:</strong> text Otto writes, and the text of pages you publish (your
          portfolio and shared resume links), is checked by a safety model through OpenRouter, with
          data collection turned off, to block sexual or explicit content.
        </p>
        <p>
          The recruiter checks, the editor and PDF downloads don&apos;t use AI. Line checks and PDFs
          are made right in your browser.
        </p>
        <p>
          A LinkedIn data export or a JSON Resume file you import is read in your browser and never
          uploaded. The job post eligibility check also runs in your browser, with no AI.
        </p>
        <p>
          <strong>Voice typing:</strong> when you press a microphone button, your browser listens
          only while it&apos;s on. In Chrome, Edge and Safari, the browser&apos;s own speech service
          (Google in Chrome, Microsoft in Edge, Apple in Safari) turns your speech into text, under
          that company&apos;s privacy policy. In other browsers, or when that service isn&apos;t
          available, the browser records a clip that goes to our speech-to-text provider through
          OpenRouter, with data collection turned off. We never store the audio, only the text you
          keep.
        </p>
        <p>
          &quot;Import from GitHub&quot; reads only public data from GitHub (your repos and merged
          pull requests) by the username you type, without your GitHub login. Nothing is added to
          your resume until you confirm. We don&apos;t store the GitHub data: a server keeps it in
          memory for up to an hour, so a second look doesn&apos;t ask GitHub again.
        </p>
      </>
    ),
  },
  {
    title: "Otto for Chrome",
    body: (
      <>
        <p>
          The Chrome extension shows how your resume matches a job post on the page where you read
          it. It works like this:
        </p>
        <ul>
          <li>
            <strong>What it reads:</strong> the title, company, location and text of a job post. It
            runs only on job posts on LinkedIn, Naukri, Indeed, Greenhouse, Lever, Ashby, Workday,
            SmartRecruiters and Workable, and on any other page only when you press its toolbar
            button. It doesn&apos;t read other pages or your browsing history, and it never fills in
            or sends an application for you.
          </li>
          <li>
            <strong>The match runs on your device.</strong> The extension keeps a copy of what the
            match needs in Chrome&apos;s storage for extensions: the text of your resumes without
            your name, email, phone and links, your work profile, where you&apos;re looking for
            work, and which jobs you saved. It refreshes that copy every few hours. Checking a post
            sends nothing to us.
          </li>
          <li>
            <strong>Save:</strong> when you press Save, the extension sends us that job&apos;s link,
            title, company, location and post text. We keep them with your account, so the job waits
            on your board and Otto can still read the post if it&apos;s taken down.
          </li>
          <li>
            <strong>Tailor and Letter</strong> open {BRAND.name} in a new tab with that saved post,
            and work like the AI features above.
          </li>
          <li>
            <strong>Connecting:</strong> the extension holds a random key for your account. We keep
            only a one-way fingerprint of it, with when it was made and last used. It stops working
            after 90 days unused, when you press Disconnect on your account page or in the
            extension, or when you delete your account.
          </li>
        </ul>
        <p>The extension shows no ads and sends no usage events.</p>
      </>
    ),
  },
  {
    title: "Payments",
    body: (
      <>
        <p>
          {MERCHANT.disclosure} Checkout happens on the {MERCHANT.name} site, not ours. There,{" "}
          {MERCHANT.name} collects your payment details and billing address (also for the trial, so
          the plan can start when it ends) under its own{" "}
          <a href={MERCHANT.privacyUrl}>privacy policy</a>.
        </p>
        <ul>
          <li>
            <strong>What we send {MERCHANT.name}:</strong> when you start a checkout, your account
            email, our random id for your account and the plan you picked, so the payment is linked
            to your account. When you start a checkout or delete your account, we also look up that
            email at {MERCHANT.name}, so you&apos;re never charged for a second subscription and
            every one is cancelled.
          </li>
          <li>
            <strong>What {MERCHANT.name} sends us:</strong> your subscription&apos;s plan and
            status, its billing period, when it renews or your trial ends, a pending cancellation,
            and the ids {MERCHANT.name} uses for you, your subscription and your payments. Its
            notices also carry the name, email and billing address on the order and the card&apos;s
            network and last four digits. We use that email only to match a payment to your account,
            and we don&apos;t store any of these. {MERCHANT.name} never sends us your full card
            number.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "Cookies and local storage",
    body: (
      <>
        <p>We use only what the app needs to work:</p>
        <ul>
          <li>
            <strong>Sign-in cookies</strong> keep you signed in. They renew while you use the app
            and are removed when you sign out.
          </li>
          <li>
            <strong>A device cookie</strong> holds a random id that limits free uploads and checks
            per device. It isn&apos;t linked to your name or email, and it lasts a year.
          </li>
          <li>
            <strong>An invite cookie</strong> holds a friend&apos;s invite code for 30 days after
            you open their link, so the invite still counts if you sign up later. It&apos;s removed
            once the invite is settled.
          </li>
          <li>
            <strong>Local storage</strong> (not a cookie) keeps your resumes, your progress and
            which tours you&apos;ve seen on your device until you delete them or clear your browser
            data.
          </li>
          <li>
            <strong>The {MERCHANT.name} checkout</strong> runs on its own site, which may set its
            own cookies there to run the payment and prevent fraud, under the {MERCHANT.name}{" "}
            <a href={MERCHANT.privacyUrl}>privacy policy</a>. Our site sets no payment cookies.
          </li>
        </ul>
        <p>
          We don&apos;t use ads or tracking cookies. For the usage events above, a random id is kept
          in local storage so your steps can be counted together, across visits. It isn&apos;t
          linked to your name or email, and clearing your browser data removes it.
        </p>
      </>
    ),
  },
  {
    title: "Who we share data with",
    body: (
      <>
        <p>
          We don&apos;t sell your data or share it for advertising. We only use these providers to
          run {BRAND.name}:
        </p>
        <ul>
          <li>
            <strong>OpenRouter</strong> and the AI model provider it routes to process resume text
            for the AI features above.
          </li>
          <li>
            <strong>{MERCHANT.name}</strong> processes payments as our merchant of record and online
            reseller.
          </li>
          <li>
            <strong>Supabase</strong> hosts our database and runs sign-in, including your sign-in
            sessions.
          </li>
          <li>
            <strong>Resend</strong> delivers our sign-in codes, reminders, the weekly jobs email,
            tips and notices about your account.
          </li>
          <li>
            <strong>Google</strong>, only if you choose to sign in with your Google account.
          </li>
          <li>
            <strong>GitHub</strong> receives the username you look up, only if you use Import from
            GitHub.
          </li>
          <li>
            <strong>Vercel</strong> hosts the app itself.
          </li>
          <li>
            <strong>Sentry</strong> receives error reports when something breaks, with emails, phone
            numbers and resume text removed first.
          </li>
          <li>
            <strong>PostHog</strong> receives the usage events above, so we can see which steps help
            and where people get stuck.
          </li>
        </ul>
        <p>
          These providers may process data outside your country, including in the United States. We
          may also share information if the law requires it.
        </p>
      </>
    ),
  },
  {
    title: "How long we keep data",
    body: (
      <ul>
        <li>
          Account data, resume backups, logged applications, interview prep, your work profile and
          your writing style: until you delete them or your account.
        </li>
        <li>Share links: until you turn the link off or delete your account.</li>
        <li>Saved jobs: until you remove them, or 30 days after the job closes.</li>
        <li>Jobs saved from Otto for Chrome: until you remove them or delete your account.</li>
        <li>
          The Chrome extension&apos;s key: until you disconnect it, or 90 days after its last use.
        </li>
        <li>Reminder notes: 90 days once read, a year if never read.</li>
        <li>Sign-in codes: they work once and expire after 10 minutes.</li>
        <li>
          Feedback and invite records: until your account is deleted. Feedback sent while signed out
          isn&apos;t linked to any account.
        </li>
        <li>Abuse-prevention counters: about two days.</li>
        <li>Uploaded files: not kept at all.</li>
        <li>
          Your email choices and the record of which tips we sent: until you delete your account.
        </li>
        <li>
          A copy of your trial&apos;s end date: 30 days after the trial ends, or until you turn tips
          off.
        </li>
        <li>
          Letters, answers and outreach messages you keep: until you delete them or your account.
        </li>
      </ul>
    ),
  },
  {
    title: "Your choices",
    body: (
      <ul>
        <li>
          Delete any resume in the studio whenever you like. Its backup goes right away; the copy in
          this browser waits in Recently deleted for 30 days, or until you sign out or empty it.
        </li>
        <li>
          Delete your account from your <Link href={ROUTES.account}>account page</Link>. This
          removes your email, sign-in record, resume backups, logged applications and their prep,
          work profile, writing style, letters and messages, saved jobs, the Chrome extension&apos;s
          connection, share links, reminders and email choices, invite records, feedback and usage
          records right away, and signs you out on every device. Deleting your account cancels your
          paid plan or trial right away, and you won&apos;t be charged again. Only the trial
          fingerprint above stays.
        </li>
        <li>
          Ask us for a copy of your data, or to correct or delete it, by emailing{" "}
          <a href={MAILTO}>{BRAND.supportEmail}</a>. You can also complain to your local data
          protection authority.
        </li>
      </ul>
    ),
  },
  {
    title: "Children",
    body: (
      <p>
        {BRAND.name} isn&apos;t meant for anyone under 16, and we don&apos;t knowingly collect their
        data.
      </p>
    ),
  },
  {
    title: "Changes to this policy",
    body: (
      <p>
        If we change this policy, we&apos;ll update the date at the top. If a change affects how we
        use your data, we&apos;ll email signed-in users before it takes effect.
      </p>
    ),
  },
  {
    title: "Contact",
    body: (
      <p>
        Questions about privacy? Email <a href={MAILTO}>{BRAND.supportEmail}</a>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={
        <p>
          {BRAND.name} helps you check and improve your resume. This page explains what we collect,
          why, and who else sees it.
        </p>
      }
      summary={SUMMARY}
      sections={SECTIONS}
    />
  );
}
