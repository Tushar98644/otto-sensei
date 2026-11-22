import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { FREE_JOB_MATCHES, FREE_TEMPLATES, PLANS } from "@/config/plans";
import { planPrice } from "@/lib/billing/prices";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { absoluteUrl } from "@/lib/seo/urls";
import { ATS_GUIDES, INDEXED_ATS_GUIDES } from "./ats";
import { COMPETITORS } from "./compare";
import {
  ATS_INDEX_PAGE,
  COMPARE_INDEX_PAGE,
  RESUME_TEMPLATES_PAGE,
  atsGuidePage,
  comparePage,
} from "./pages";
import { SEO_PATHS } from "./paths";

export type Link = { title: string; path: string; note: string };

const freeFormats = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name).join(" and ");

export function linkLine(link: Link, base: string): string {
  return `- [${link.title}](${absoluteUrl(link.path, base)}): ${link.note}`;
}

function section(title: string, links: readonly Link[], base: string): string {
  return [`## ${title}`, "", ...links.map((link) => linkLine(link, base))].join("\n");
}

export const LEGAL_LINKS: readonly Link[] = [
  {
    title: "Privacy policy",
    path: ROUTES.privacy,
    note: "What is collected and where resumes are stored.",
  },
  { title: "Terms", path: ROUTES.terms, note: "Terms of service." },
  { title: "Refund policy", path: ROUTES.refunds, note: "Cancelling and refunds." },
  {
    title: "Acceptable use",
    path: ROUTES.acceptableUse,
    note: "What the service may not be used for.",
  },
];

export function llmsTxt(base: string): string {
  const main: Link[] = [
    { title: "Home", path: ROUTES.home, note: BRAND.description },
    {
      title: "Pricing",
      path: ROUTES.pricing,
      note: `What Free, Pro (${planPrice("pro", "month")} a month) and Max (${planPrice("max", "month")} a month) include, in US dollars, with every monthly limit written down.`,
    },
    {
      title: "Job match check",
      path: SEO_PATHS.jobMatch,
      note: "A free check of which skills and tools in a job post a resume names.",
    },
    {
      title: "Resume templates",
      path: RESUME_TEMPLATES_PAGE.path,
      note: RESUME_TEMPLATES_PAGE.description,
    },
    {
      title: "Full text",
      path: SEO_PATHS.llmsFull,
      note: "The guides, comparisons, pricing, plan limits and FAQs from these pages, in one plain-text file.",
    },
  ];
  const guides: Link[] = [
    { title: "ATS guides", path: ATS_INDEX_PAGE.path, note: ATS_INDEX_PAGE.description },
    ...INDEXED_ATS_GUIDES.map((guide) => {
      const page = atsGuidePage(guide);
      return { title: page.title, path: page.path, note: page.description };
    }),
  ];
  const comparisons: Link[] = [
    { title: "Comparisons", path: COMPARE_INDEX_PAGE.path, note: COMPARE_INDEX_PAGE.description },
    ...COMPETITORS.map((competitor) => {
      const page = comparePage(competitor);
      return { title: page.title, path: page.path, note: page.description };
    }),
  ];

  return [
    `# ${BRAND.name}`,
    "",
    ...productOverview(),
    "",
    section("Main pages", main, base),
    "",
    section("ATS guides", guides, base),
    "",
    section("Comparisons", comparisons, base),
    "",
    section("Optional", LEGAL_LINKS, base),
    "",
  ].join("\n");
}

export function productOverview(): string[] {
  return [
    `> ${BRAND.name} is a web app for job seekers. Upload a resume, see the text hiring software (an applicant tracking system, or ATS) reads from it, fix weak lines with Otto, tailor it to a job, and download a clean PDF. Checking, editing and PDF downloads are free.`,
    "",
    `Otto is the app's otter mascot and AI helper. ${BRAND.name} is made for job seekers anywhere, works in the browser, and reads resumes written in English best.`,
    "",
    "What it does:",
    "",
    "- Recruiter view (free): the text hiring software pulls from a resume file, with a plain check and a reason for each problem.",
    `- Line fixes: Otto asks for real numbers and results, then rewrites a weak line, and the user approves every change. Free includes ${PLANS.free.limits.fix} a month.`,
    `- ${TEMPLATE_IDS.length} resume formats, each one column of real text. ${freeFormats} are free, and PDF downloads are free with no cap.`,
    `- Jobs: open jobs from companies' careers pages and public job feeds, read every day and matched to the user's resume. Free shows the ${FREE_JOB_MATCHES} closest matches.`,
    "- Pro and Max: tailoring to a job, cover letters, outreach messages, answers to application questions, interview prep, every format, Word downloads, an application tracker with reminders, share links and a hosted portfolio site.",
    `- Sourced notes on ${ATS_GUIDES.length} hiring systems, such as Greenhouse, Workday and Taleo: how they read files, screen applicants and rank them with AI.`,
    "",
    "What it doesn't do:",
    "",
    "- No made-up score: checks come with reasons, not a number out of 100.",
    "- It doesn't invent numbers or experience: Otto uses only facts the user gives him.",
    "- It doesn't charge to download a PDF.",
    "- It doesn't keep uploaded files: it reads the text, then lets the file go. Resumes stay in the browser unless the user signs in to back them up.",
    "- It doesn't apply to jobs for anyone, and it doesn't promise interviews or that any hiring system will pass a resume.",
  ];
}
