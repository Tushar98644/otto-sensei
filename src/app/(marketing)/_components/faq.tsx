import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { PLANS } from "@/config/plans";
import { type FaqItem, FaqList } from "./faq-list";
import { Section, SectionHeader } from "./section";

const FAQ: readonly FaqItem[] = [
  {
    question: "Is it really free to download?",
    answer:
      "Yes. Editing, recruiter checks and PDF downloads are free, with no paywall at the last step. Pro and Max only add more help from Otto each month.",
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
    question: "Do I need an account?",
    answer: `Not to check, edit or download. Fixing lines and tailoring need a free account: sign in with Google or an emailed 6-digit code, no password. Free accounts get ${PLANS.free.limits.fix} line fixes and ${PLANS.free.limits.tailor} tailored versions a month.`,
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
