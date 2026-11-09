import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { LegalPage } from "../_components/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Privacy policy",
  description: `What ${BRAND.name} collects, where your resume is stored, and who else processes it. In plain English.`,
  path: ROUTES.privacy,
});

// Keep this in step with the code: sign-in and device cookies (src/lib/supabase/cookies.ts,
// src/lib/http.ts), what account deletion removes (src/lib/users.ts, src/app/api/account) and
// rate-limit retention (src/lib/rate-limit.ts). Bump LEGAL_LAST_UPDATED with any change.
export default function PrivacyPage() {
  const mailto = `mailto:${BRAND.supportEmail}`;
  return (
    <LegalPage title="Privacy policy">
      <p>
        {BRAND.name} helps you check and improve your resume. This page explains what we collect,
        why, and who else sees it. The short version: we collect as little as we can, we never sell
        your data, and you can delete it whenever you like.
      </p>

      <h2>What we collect</h2>
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
          (without hidden lines or tailoring notes) so anyone with the link can read it and
          download it as a PDF. Your email and phone show only if you turn that on, and search
          engines are asked to skip the page unless you allow them. We count views: to count each
          reader once, we keep a scrambled code made from their network address and browser (not
          the address itself) for about two days. Turning the link off deletes the copy.
        </li>
        <li>
          <strong>Applications you log.</strong> If you track job applications, we store what you
          enter (company, job title, job link, date, status and notes) and which resume you sent,
          so you can see your own interview rate. If you make an interview prep pack for one, we
          save it with that application. Nobody else sees it.
        </li>
        <li>
          <strong>Reminders.</strong> When you mark a job applied, we store a follow-up date (7
          days later unless you pick another number). When it comes, we add a note to your
          dashboard. We email you about it only if you turn reminder emails on on your account
          page. We store the note, whether you&apos;ve read it, the date, and your reminder
          settings. Read notes are deleted after 90 days, unread ones after a year.
        </li>
        <li>
          <strong>Your work profile.</strong> If you fill it in, we store the country you live in,
          your time zone, where you can work without a sponsored visa, whether you want full-time
          or contract work, and whether you only want remote jobs. Otto checks job posts against
          it in your browser, and on our server when ranking the Jobs tab. Nobody else sees it.
        </li>
        <li>
          <strong>Jobs you match and save.</strong> To rank open jobs for you, your browser sends
          the skills, job titles and years of experience it reads from your resume, never the
          resume itself or your contact details. We use them for that one request and don&apos;t
          store them or send them to an AI. If you save a job, we store which one and when. The
          jobs themselves come from public job boards, each linked to its original post.
        </li>
        <li>
          <strong>Files you upload.</strong> We read them in memory to pull out the text and run the
          checks. We don&apos;t store the files.
        </li>
        <li>
          <strong>Usage counts.</strong> For signed-in users, how many line fixes, tailored versions,
          cover letters and answers you&apos;ve used this month (this week on a weekly plan, or
          during your trial), plus any extra an invite earned you, so plan limits work.
        </li>
        <li>
          <strong>Plan and billing status.</strong> If you subscribe or start a trial, we store your
          plan and the subscription details Creem sends us, such as whether it&apos;s active, when
          your trial ends and when it renews. We never see your full card number.
        </li>
        <li>
          <strong>Trial record.</strong> So each person gets the free Pro trial once, we keep a
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
          Inviters only see counts, never who joined.
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
          they&apos;re linked to your account&apos;s random id. If your browser sends Do Not Track or
          Global Privacy Control, we send none at all.
        </li>
      </ul>

      <h2>How Otto uses AI</h2>
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
          <strong>Tailoring, cover letters and application answers:</strong> your resume, the job
          post and, for an answer, the question.
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
        The recruiter checks, the editor and PDF downloads don&apos;t use AI. Line checks and PDFs
        are made right in your browser.
      </p>
      <p>
        A LinkedIn data export or a JSON Resume file you import is read in your browser and never
        uploaded. The job post eligibility check also runs in your browser, with no AI.
      </p>
      <p>
        &quot;Import from GitHub&quot; reads only public data from GitHub (your repos and merged pull
        requests) by the username you type, without your GitHub login. Nothing is added to your
        resume until you confirm. We don&apos;t store the GitHub data: a server keeps it in memory
        for up to an hour, so a second look doesn&apos;t ask GitHub again.
      </p>

      <h2>Payments</h2>
      <p>
        Creem handles payments as our merchant of record. They collect your payment details (also
        for a free trial, so the plan can start when it ends), charge you, send receipts and handle
        sales tax, under their own privacy policy.
      </p>

      <h2>Cookies and local storage</h2>
      <p>We use only what the app needs to work:</p>
      <ul>
        <li>
          <strong>Sign-in cookies</strong> keep you signed in. They renew while you use the app and
          are removed when you sign out.
        </li>
        <li>
          <strong>A device cookie</strong> holds a random id that limits free uploads and checks per
          device. It isn&apos;t linked to your name or email, and it lasts a year.
        </li>
        <li>
          <strong>An invite cookie</strong> holds a friend&apos;s invite code for 30 days after you
          open their link, so the invite still counts if you sign up later. It&apos;s removed once
          the invite is settled.
        </li>
        <li>
          <strong>Local storage</strong> (not a cookie) keeps your resumes, your progress and which
          tours you&apos;ve seen on your device until you delete them or clear your browser data.
        </li>
      </ul>
      <p>
        We don&apos;t use ads or tracking cookies. For the usage events above, a random id is kept in
        local storage so your steps can be counted together, across visits. It isn&apos;t linked to
        your name or email, and clearing your browser data removes it.
      </p>

      <h2>Who we share data with</h2>
      <p>
        We don&apos;t sell your data or share it for advertising. We only use these providers to run{" "}
        {BRAND.name}:
      </p>
      <ul>
        <li>
          <strong>OpenRouter</strong> and the AI model provider it routes to process resume text
          for the AI features above.
        </li>
        <li>
          <strong>Creem</strong> processes payments as our merchant of record.
        </li>
        <li>
          <strong>Supabase</strong> hosts our database and runs sign-in, including your sign-in
          sessions.
        </li>
        <li>
          <strong>Resend</strong> delivers our sign-in and reminder emails.
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

      <h2>How long we keep data</h2>
      <ul>
        <li>
          Account data, resume backups, logged applications, interview prep and your work profile:
          until you delete them or your account.
        </li>
        <li>Share links: until you turn the link off or delete your account.</li>
        <li>Saved jobs: until you remove them, or 30 days after the job closes.</li>
        <li>Reminder notes: 90 days once read, a year if never read.</li>
        <li>Sign-in codes: they work once and expire after 10 minutes.</li>
        <li>
          Feedback and invite records: until your account is deleted. Feedback sent while signed
          out isn&apos;t linked to any account.
        </li>
        <li>Abuse-prevention counters: about two days.</li>
        <li>Uploaded files: not kept at all.</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>
          Delete any resume in the studio whenever you like. Its backup goes right away; the copy
          in this browser waits in Recently deleted for 30 days, or until you sign out or empty it.
        </li>
        <li>
          Delete your account from your <Link href={ROUTES.account}>account page</Link>. This
          removes your email, sign-in record, resume backups, logged applications and their prep,
          work profile, saved jobs, share links, reminders, invite records, feedback and usage records right
          away, and signs you out on every device.
          Deleting your account cancels your paid plan or trial right away, and you won&apos;t be
          charged again. Only the trial fingerprint above stays.
        </li>
        <li>
          Ask us for a copy of your data, or to correct or delete it, by emailing{" "}
          <a href={mailto}>{BRAND.supportEmail}</a>. You can also complain to your local data
          protection authority.
        </li>
      </ul>

      <h2>Children</h2>
      <p>
        {BRAND.name} isn&apos;t meant for anyone under 16, and we don&apos;t knowingly collect their
        data.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we change this policy, we&apos;ll update the date at the top. If a change affects how we
        use your data, we&apos;ll email signed-in users before it takes effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Email <a href={mailto}>{BRAND.supportEmail}</a>.
      </p>
    </LegalPage>
  );
}
