import { PLANS } from "@/config/plans";
import { planPrice } from "@/lib/billing/prices";
import { PREP_LEVELS, ROLE_FOCUSES } from "@/lib/insights/prep-focus";
import type { FeatureContent } from "../_components/feature-page";

const { pro, max } = PLANS;
const roles = ROLE_FOCUSES.length;

export const INTERVIEW_PREP: FeatureContent = {
  intro:
    "Pick the job and the resume you sent. Otto builds your prep from both: the questions you're likely to get, stories from your own resume lines and questions to ask them.",
  featuresTitle: "What's in each prep pack",
  features: [
    {
      title: "Likely questions, round by round",
      text: "From the opening to the closing, each question says what the interviewer is checking, the points to hit and the follow-up to expect.",
    },
    {
      title: "Stories from your own lines",
      text: "Each story starts from a line on your resume, told as situation, task, action and result. Anything your resume doesn't say stays a blank for you to fill, never made up.",
    },
    {
      title: "A technical round for technical roles",
      text: `For ${roles} kinds of role, from engineers and data scientists to product managers and designers: deep dives on your own work, core concepts for the role, and a design question, case or exercise. Each says what a strong answer covers and the mistakes to avoid.`,
    },
    {
      title: "Questions to ask them",
      text: "Four or five questions for the end of the interview, about the product, team or goals in the post. None about pay or time off.",
    },
    {
      title: "Practice mode",
      text: "Otto plays the interviewer, one question at a time. Answer out loud with the mic or type, with a two-minute timer and your outline a tap away. Then run the ones you missed again.",
    },
    {
      title: "Ready on the day",
      text: "Add the interview to your calendar with a reminder to practice the morning before, or print the pack to read on the way.",
    },
  ],
  steps: [
    {
      title: "Pick the job",
      text: "An application that reaches Interviewing waits with a Prepare button. Or start from any job's link, its post, or just the job title.",
    },
    {
      title: "Check the setup",
      text: `Use the resume you sent. Otto picks the technical round from the job; change the role, or the level from ${PREP_LEVELS[0]} to ${PREP_LEVELS.at(-1)}, if you like.`,
    },
    {
      title: "Read, fill in, practice",
      text: "Go through the questions and stories, fill each blank with your own facts, then run practice mode.",
    },
  ],
  faq: [
    {
      question: "Is the AI interview prep free?",
      answer: `It comes with ${pro.name} and ${max.name}. Each prep pack counts toward the same monthly allowance as cover letters and messages: ${pro.limits.letter} a month on ${pro.name} and ${max.limits.letter} on ${max.name}. ${pro.name} is ${planPrice("pro", "month")} a month.`,
    },
    {
      question: "Will it give me answers I can't back up?",
      answer:
        "No. Facts about you come only from your resume. Where an answer needs something your resume doesn't say, Otto leaves a question in brackets, like “[How many people used it?]”, for you to answer. In the technical round, general know-how is written as guidance, never as something you did.",
    },
    {
      question: "Which roles get a technical round?",
      answer: `${roles} kinds, from backend, frontend and AI/ML engineers to data analysts, product managers and designers. Otto picks one from the job title and post, and you can change it or turn it off.`,
    },
    {
      question: "Can I practice out loud?",
      answer:
        "Yes. In practice mode, press the mic and answer out loud, and your answer shows up as text. Mark each question as done or to practice again, and the notes you keep stay in your browser.",
    },
    {
      question: "Can I prep without the job post?",
      answer:
        "Yes. Paste the whole post for sharper questions, or leave it out and Otto works from the job title.",
    },
  ],
};
