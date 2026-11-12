import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { FREE_APPLICATIONS, FREE_JOB_MATCHES, PLANS } from "@/config/plans";
import { planPriceLabel, trialHeadline } from "@/lib/billing/prices";
import { pluralize } from "@/lib/utils";
import { type FaqItem, FaqList } from "./faq-list";
import { Section, SectionHeader } from "./section";

const FAQ: readonly FaqItem[] = [
  {
    question: "Is it really free to download?",
    answer: `Yes. Editing, recruiter checks and PDF downloads are free, with no paywall at the last step, and Free includes ${PLANS.free.limits.fix} line fixes a month with Otto. Pro and Max add the rest of Otto's AI help, more formats, more resumes and Word downloads on top.`,
  },
  {
    question: "What is an ATS?",
    answer:
      "An applicant tracking system: the software most employers use to collect and sort applications. It reads the text in your file, and fancy layouts can scramble it. Otto shows you exactly what it reads.",
  },
  {
    question: "Will Otto invent things on my resume?",
    answer:
      "No. Otto asks you for facts, like numbers and results, and only uses what you tell him. You review every change before it goes on your resume.",
  },
  {
    question: "Can I talk instead of typing?",
    answer:
      "Yes. The boxes where you write for Otto have a microphone, including Otto's questions when he fixes a line. Sign in, press it and speak, then press it again when you're done. It works in any modern browser. Otto turns your recording into text and keeps only the text.",
  },
  {
    question: "Do I need an account?",
    answer: `Not to check, edit or download. Backups and Otto's ${PLANS.free.limits.fix} line fixes a month need a free account: sign in with Google or an emailed 6-digit code, no password. The rest of Otto's AI help, the full list of job matches (Free shows your closest ${FREE_JOB_MATCHES}) and tracking more than ${pluralize(FREE_APPLICATIONS, "application")} come with ${PLANS.pro.name}. ${trialHeadline()}, then ${planPriceLabel("pro", "month")}.`,
  },
  {
    question: "Where is my data stored?",
    answer: (
      <>
        Your resumes are saved in your browser. If you sign in, we also keep a backup so you can
        open them on any device. We read uploaded files to get the text, then let them go. Details
        are in our <TextLink href={ROUTES.privacy}>privacy policy</TextLink>.
      </>
    ),
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel your plan from your account page whenever you like. You keep it until the end of the period you paid for, and you aren't charged again.",
  },
  {
    question: "Does it work for any job?",
    answer:
      "Yes, from your first job to senior roles, in any field. Tailoring works with any job post you paste in. Otto reads resumes written in English best.",
  },
];

export function Faq() {
  return (
    <Section labelledBy="faq-title">
      <div className="grid gap-12 lg:grid-cols-3">
        <SectionHeader id="faq-title" title="Before you start" />
        <FaqList items={FAQ} className="lg:col-span-2" />
      </div>
    </Section>
  );
}
