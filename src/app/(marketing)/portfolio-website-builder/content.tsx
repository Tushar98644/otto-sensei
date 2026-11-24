import { PLANS } from "@/config/plans";
import { planPrice } from "@/lib/billing/prices";
import { PORTFOLIO_LIMITS, PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import type { FeatureContent } from "../_components/feature-page";

const { pro, max } = PLANS;
const designs = PORTFOLIO_TEMPLATE_IDS.length;

export const PORTFOLIO: FeatureContent = {
  intro: `Pick one of ${designs} designs and Otto fills it in from your resume: your projects, work, skills and links. We host it at your own link, so there's nothing to set up.`,
  featuresTitle: "What you get",
  features: [
    {
      title: `${designs} designs`,
      text: "From one calm column to a dark page with big featured projects. Open each one full size with your own resume in it before you pick.",
    },
    {
      title: "Filled in from your resume",
      text: "Otto drafts the about, projects, experience, skills, education and links from your resume. Edit any part, or hide a section you don't need.",
    },
    {
      title: "Hosted at your own link",
      text: `The page gets a link with your name in it, and we host it. Change the name later and the old link keeps working for ${PORTFOLIO_LIMITS.redirectDays} days.`,
    },
    {
      title: "In step with your resume",
      text: "With sync on, edits to your resume show on the page by themselves. Turn it off to update the page only when you're ready.",
    },
    {
      title: "Private details stay off",
      text: "Your email and phone start hidden, and search engines are asked to skip the page until you let them find it.",
    },
    {
      title: "Views and GitHub",
      text: "See how many times your page has been viewed. Connect GitHub and the page can show your GitHub numbers too.",
    },
  ],
  steps: [
    {
      title: "Pick a resume and a design",
      text: "See every design with your own resume in it, then pick one. Otto fills it in.",
    },
    {
      title: "Check what Otto wrote",
      text: "Edit the words, hide sections, and choose whether to show your email and phone.",
    },
    {
      title: "Publish and share",
      text: "Nothing goes live until you publish. Then send the link to recruiters, or put it on your resume and LinkedIn.",
    },
  ],
  faq: [
    {
      question: "Is the portfolio website free?",
      answer: `Portfolios come with ${pro.name} and ${max.name}, hosting included. ${pro.name} is ${planPrice("pro", "month")} a month. If your plan ends, the page goes offline, but it and its settings are kept, so it comes back as it was when you return.`,
    },
    {
      question: "Do I need to code or buy hosting?",
      answer:
        "No. Otto builds the page from your resume and we host it. There's nothing to install and no domain to buy.",
    },
    {
      question: "Will Google find my portfolio?",
      answer:
        "Only if you want it to. Until you turn on “Let search engines find it,” search engines are asked to keep the page out of their results.",
    },
    {
      question: "What happens when I update my resume?",
      answer:
        "With sync on, the page picks up the change by itself. With sync off, Otto tells you the resume changed, and you update the page when you're ready.",
    },
    {
      question: "Can I change the design later?",
      answer: `Yes. Switch to any of the ${designs} designs whenever you like. Your page keeps its link and settings.`,
    },
  ],
};
