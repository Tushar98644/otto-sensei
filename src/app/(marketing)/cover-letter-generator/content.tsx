import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { PLANS } from "@/config/plans";
import { planPrice } from "@/lib/billing/prices";
import { TONE_CHOICES } from "@/lib/writing-style/schema";
import type { FeatureContent } from "../_components/feature-page";

const { free, pro, max } = PLANS;

const tones = (() => {
  const names = Object.values(TONE_CHOICES).map((choice) => choice.label.toLowerCase());
  const last = names.pop() ?? "";
  return names.length ? `${names.join(", ")} or ${last}` : last;
})();

export const LETTERS: FeatureContent = {
  intro:
    "Paste a job post or its link. Otto writes the cover letter from that post and your resume, and flags anything you should check before you send it.",
  featuresTitle: "What Otto writes for you",
  features: [
    {
      title: "A cover letter for each job",
      text: "Three short paragraphs: the role and your best fact for it, two or three results that match what the post asks for most, then why this job. The greeting and sign-off are added for you.",
    },
    {
      title: "Answers to application questions",
      text: "Paste a question like “Why do you want to work here?” and Otto answers it from your resume. Anything only you know, such as a start date or salary, becomes a blank in brackets for you to fill in.",
    },
    {
      title: "Outreach, follow-ups and thank-yous",
      text: "A short email and a LinkedIn note for someone at the company, a follow-up when an application goes quiet, and a thank-you after an interview.",
    },
    {
      title: "Nothing made up",
      text: "Otto writes only from your resume and the job post. If a draft has a number your resume doesn't, a stronger verb than your line uses or a stock phrase, he flags it for you to check.",
    },
    {
      title: "Your tone, your spelling",
      text: `Pick a tone (${tones}), a standard or shorter length, and US or UK spelling. Set it once and every letter follows it.`,
    },
    {
      title: "Ready to send",
      text: "Copy it, open it as an email, or download it as a PDF or Word file. Each one is kept with the job it was written for.",
    },
  ],
  steps: [
    {
      title: "Pick the job",
      text: "Choose a job you saved, an application on your board or a tailored copy of your resume. Or paste a job post or its link.",
    },
    {
      title: "Pick what to write",
      text: "A cover letter, an answer to an application question or an outreach message. Otto writes it from your resume and the post.",
    },
    {
      title: "Check it and send it",
      text: "Read the draft, fix anything Otto flagged, then copy it, email it or download it.",
    },
  ],
  faq: [
    {
      question: "Is the AI cover letter generator free?",
      answer: (
        <>
          It comes with {pro.name} and {max.name}. {pro.name} is {planPrice("pro", "month")} a month
          and includes {pro.limits.letter} a month, shared across cover letters, outreach messages,
          answers and interview prep. On {free.name}, checking your resume, editing it and PDF
          downloads stay free. <TextLink href={ROUTES.pricing}>See every plan</TextLink>.
        </>
      ),
    },
    {
      question: "Will Otto make things up?",
      answer:
        "No. He writes only from your resume and the job post, then checks the draft against both. A number your resume doesn't have, a stronger verb than your line uses or a stock phrase gets flagged, so you can fix it, or keep it if it's true.",
    },
    {
      question: "Can it write from a job link?",
      answer:
        "Yes. Paste the link and Otto reads the post. If a site won't share it, paste the text of the post instead.",
    },
    {
      question: "Can I change the tone or length?",
      answer: `Yes. Pick a ${tones} tone, a standard or shorter length, US or UK spelling, and your own sign-off. You can also leave Otto a note, such as “Mention I'm open to relocating.”`,
    },
    {
      question: "How does it answer “Why do you want to work here?”",
      answer:
        "Paste the question and pick the job. Otto answers from your resume and the post in a short paragraph or two. Anything only you know, like what draws you to the company, becomes a blank in brackets for you to fill in.",
    },
  ],
};
