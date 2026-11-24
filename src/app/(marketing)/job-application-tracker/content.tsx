import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { applicationLimit, PLANS } from "@/config/plans";
import {
  AFTER_INTERVIEW_BUSINESS_DAYS,
  FOLLOW_UP_DAYS,
  SNOOZE_DAYS,
} from "@/lib/applications/follow-up";
import { MIN_FOR_RATE } from "@/lib/applications/stats";
import { planPrice } from "@/lib/billing/prices";
import { pluralize } from "@/lib/utils";
import type { FeatureContent } from "../_components/feature-page";

const { free, pro, max } = PLANS;
const count = new Intl.NumberFormat("en-US");

export const TRACKER: FeatureContent = {
  intro: `Log every job you apply to on one board, with the resume you sent, a reminder to follow up and the interview date. On ${pro.name}, your job emails move each card for you.`,
  featuresTitle: "What the tracker keeps for you",
  features: [
    {
      title: "One board, from To apply to Offer",
      text: "Jobs you save wait in To apply. Drag each card to Applied, Interviewing and Offer as you hear back, and to Closed when it ends.",
    },
    {
      title: "The resume you sent",
      text: "Each application keeps the resume or tailored copy you sent, so you know what they read. Once you've sent a few, see which version gets you interviews.",
    },
    {
      title: "Reminders to follow up",
      text: `Otto reminds you to follow up ${FOLLOW_UP_DAYS.default} days after you apply, or after the days you pick. Snooze one for ${SNOOZE_DAYS} days or clear it. After an interview, he sets one for ${AFTER_INTERVIEW_BUSINESS_DAYS} business days later.`,
    },
    {
      title: "Interview dates",
      text: "Add the interview day and time, then add it to your calendar with a reminder to practice the morning before.",
    },
    {
      title: `Updates from your job emails (${pro.name})`,
      text: "Get your own Otto address and add one Gmail filter that forwards job emails to it. A “thanks for applying” email adds the job to Applied, and an interview invite moves it to Interviewing with the date.",
    },
    {
      title: "Read by rules, kept small",
      text: "Otto reads each forwarded email with fixed rules, not AI. He keeps the sender's domain, the subject and what he found, and drops the rest. Mail he can't verify waits for you to check.",
    },
  ],
  steps: [
    {
      title: "Add an application",
      text: "Type the company, job title and link, or mark a saved job as applied. Pick the resume you sent.",
    },
    {
      title: "Move it along",
      text: `Drag the card as you hear back, and add the interview date and notes. On ${pro.name}, your job emails do this for you.`,
    },
    {
      title: "Follow up on time",
      text: `When a reminder comes due, follow up, snooze it or mark the job as no reply. On ${pro.name}, Otto writes the follow-up message from your resume and the job.`,
    },
  ],
  faq: [
    {
      question: "Is the job application tracker free?",
      answer: `${free.name} tracks ${pluralize(applicationLimit("free"), "application")} with a follow-up reminder, so you can try it. ${pro.name} tracks up to ${count.format(applicationLimit("pro"))} and adds updates from your job emails, and ${max.name} tracks up to ${count.format(applicationLimit("max"))}. ${pro.name} is ${planPrice("pro", "month")} a month.`,
    },
    {
      question: "How does it update from my email?",
      answer: `On ${pro.name}, you pick a handle for your own Otto address, add it to Gmail's forwarding settings, confirm it's your Gmail, then add one filter for job emails. It takes a few minutes and ends with a test email. After that, each job email moves its card, or waits for you to check it.`,
    },
    {
      question: "Does Otto read all my email?",
      answer: (
        <>
          No. Only the emails your Gmail filter forwards reach Otto. He reads each one with fixed
          rules, not AI, keeps the sender&apos;s domain, the subject and what he found in it, such
          as the company, job title and interview date, and drops the rest. These records are
          deleted after six months. The <TextLink href={ROUTES.privacy}>privacy policy</TextLink>{" "}
          has the details.
        </>
      ),
    },
    {
      question: "What if Otto reads an email wrong?",
      answer:
        "Undo any change from the list of emails Otto read. When he can't verify who sent an email, nothing moves until you check it.",
    },
    {
      question: "Can I see which resume gets interviews?",
      answer: `Yes. Each application keeps the resume you sent, so the board counts the interviews and offers each version got. Once two versions have ${MIN_FOR_RATE} or more applications each, Otto compares their interview rates.`,
    },
  ],
};
