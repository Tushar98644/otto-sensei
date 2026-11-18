import { FREE_APPLICATIONS, FREE_JOB_MATCHES, FREE_TEMPLATES, PLANS } from "@/config/plans";
import { HIRING_SYSTEMS } from "@/lib/ats/systems";
import { planPrice } from "@/lib/billing/prices";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { pluralize } from "@/lib/utils";

export type CompareSource = { label: string; url: string };
export type CompareRow = { label: string; otto: string; them: string };
export type CompareNote = { title: string; text: string };

export type Competitor = {
  slug: string;
  name: string;
  site: string;
  summary: string;
  rows: readonly CompareRow[];
  strengths: readonly string[];
  // Each difference rests on a fact about the other product from its cited pages.
  differences: readonly CompareNote[];
  // Plain facts about Otto that say nothing about the other product.
  extras: readonly CompareNote[];
  pickThem: string;
  pickOtto: string;
  sources: readonly CompareSource[];
};

// The day every competitor fact below was read from that competitor's own pages.
export const COMPETITORS_CHECKED = "2026-11-18";

const freeFormats = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name).join(" and ");
const systemCount = Object.keys(HIRING_SYSTEMS).length;
const fixes = PLANS.free.limits.fix;
const proMonthly = planPrice("pro", "month");
const maxMonthly = planPrice("max", "month");

const OTTO_SIDE = {
  what: "A resume checker and builder: see the text hiring software reads, fix weak lines with Otto and download a clean PDF. Pro adds tailoring to each job, cover letters, outreach messages, interview prep, every format, the full tracker and a portfolio site.",
  score:
    "No overall score. Each check passes or names the problem, with the reason in plain words.",
  free: `Check, fix and download one resume as a PDF in ${freeFormats}, with ${fixes} line fixes a month from Otto, your ${FREE_JOB_MATCHES} closest job matches and ${pluralize(FREE_APPLICATIONS, "tracked application")}. No card.`,
  paid: `Pro: ${proMonthly} a month. Max: ${maxMonthly} a month, for more AI help. Cancel anytime.`,
  downloads: `PDF downloads are free with no cap, in ${freeFormats}. Every format and Word (.docx) downloads come with Pro.`,
  formats: `${TEMPLATE_IDS.length} formats, each copying a widely used resume layout. ${freeFormats} are free.`,
  jobs: `Open jobs from companies' careers pages and public job feeds, read every day and matched to your resume. Free shows your ${FREE_JOB_MATCHES} closest; Pro shows every match.`,
  systems: `Spots ${systemCount} hiring systems from a job link and shows sourced notes on how each one handles applications.`,
} as const;

const NO_SCORE: CompareNote = {
  title: "Reasons instead of a score",
  text: "Otto gives no overall number. Each check passes or names the problem and why, so you fix the cause.",
};

const FREE_PDFS: CompareNote = {
  title: "PDF downloads are free",
  text: `Checking, editing and downloading one resume as a PDF costs nothing, with no cap on downloads.`,
};

const EMPLOYER_JOBS: CompareNote = {
  title: "Jobs from employers' own sites",
  text: "Otto reads companies' careers pages and public job feeds every day and ranks the jobs against your resume. Each one links to the original post.",
};

const SOURCED_NOTES: CompareNote = {
  title: "Sourced hiring-system notes",
  text: `Otto's notes on ${systemCount} hiring systems each link to the page they come from.`,
};

const READ_BACK: CompareNote = {
  title: "Formats tested by reading them back",
  text: "Every format is one column of real text, and each PDF is tested by reading it back.",
};

const jobscan: Competitor = {
  slug: "jobscan",
  name: "Jobscan",
  site: "https://www.jobscan.co/",
  summary:
    "Jobscan is a resume scanner: it compares your resume with a job post and gives a match rate. Around it sit a resume builder, a job tracker, job matches, LinkedIn help, cover letters, auto-apply and interview practice.",
  rows: [
    {
      label: "What it is",
      otto: OTTO_SIDE.what,
      them: "A resume scanner that compares your resume with a job post and gives a match rate, plus a resume builder, job tracker, job matches, LinkedIn optimization, a cover letter generator, auto-apply and AI interview practice.",
    },
    {
      label: "Score",
      otto: OTTO_SIDE.score,
      them: "A match rate for each scan, with a target of at least 75%. It rests on hard skills first, then education level (only when the post asks for an advanced degree), job title, soft skills and other keywords.",
    },
    {
      label: "Free plan",
      otto: OTTO_SIDE.free,
      them: "Resume scans each month (five, per Jobscan's blog), the resume builder, and a 7-day Premium trial.",
    },
    {
      label: "Paid plans",
      otto: OTTO_SIDE.paid,
      them: "Premium, billed monthly or quarterly. Jobscan lists its prices on its plan page.",
    },
    {
      label: "Jobs",
      otto: OTTO_SIDE.jobs,
      them: "Jobs matched to your resume, and auto-apply that you review before each application is sent.",
    },
    {
      label: "Hiring systems",
      otto: OTTO_SIDE.systems,
      them: "Detects the applicant tracking system on a job posting when it recognizes the company's system.",
    },
  ],
  strengths: [
    "A match rate with a published method: hard skills count most, then education level (when the post asks for an advanced degree), job title, soft skills and other keywords.",
    "For companies on its supported list, it detects which applicant tracking system a job posting uses and tunes its tips to it.",
    "A wide toolkit around the scanner: LinkedIn optimization, a cover letter generator, AI interview practice, and auto-apply that you review before anything is sent.",
    "Free resume scans every month, before you pay anything.",
  ],
  differences: [NO_SCORE],
  extras: [FREE_PDFS, EMPLOYER_JOBS, SOURCED_NOTES],
  pickThem:
    "Jobscan suits you if you want a match-rate number for each application, help with your LinkedIn profile, or auto-apply.",
  pickOtto:
    "Otto suits you if you'd rather have a plain reason for each problem than a match rate.",
  sources: [
    { label: "Jobscan home page", url: "https://www.jobscan.co/" },
    { label: "Jobscan tutorial", url: "https://www.jobscan.co/jobscan-tutorial" },
    {
      label: "Jobscan blog, “Jobscan vs Rezi” (June 18, 2026)",
      url: "https://www.jobscan.co/blog/jobscan-vs-rezi/",
    },
    {
      label: "Jobscan blog, “Jobscan vs Huntr” (August 7, 2026)",
      url: "https://www.jobscan.co/blog/jobscan-vs-huntr/",
    },
  ],
};

export const REZI_PRO_USD = 29;

const rezi: Competitor = {
  slug: "rezi",
  name: "Rezi",
  site: "https://www.rezi.ai/",
  summary:
    "Rezi is an AI resume builder with its own resume score, keyword targeting, a resume checker, a cover letter generator, AI interview practice and job search.",
  rows: [
    {
      label: "What it is",
      otto: OTTO_SIDE.what,
      them: "An AI resume builder with an AI resume agent, a resume checker and keyword scanner, a cover letter generator, AI interview practice and job search.",
    },
    {
      label: "Score",
      otto: OTTO_SIDE.score,
      them: "The Rezi Score checks your resume against 23 key metrics, section by section. Limited on Free, full on Pro.",
    },
    {
      label: "Free plan",
      otto: OTTO_SIDE.free,
      them: "1 resume, 3 PDF downloads and 1 AI interview. The Rezi Score and AI keyword targeting are limited.",
    },
    {
      label: "Paid plans",
      otto: OTTO_SIDE.paid,
      them: `Pro: $${REZI_PRO_USD} a month, with unlimited resumes, PDF downloads and AI interviews, and one expert review a month. Lifetime: $149 once, with Pro's features but no monthly review.`,
    },
    {
      label: "Downloads",
      otto: OTTO_SIDE.downloads,
      them: "3 PDF downloads on Free, unlimited on Pro.",
    },
    { label: "Jobs", otto: OTTO_SIDE.jobs, them: "A job search tool." },
  ],
  strengths: [
    "A detailed score: the Rezi Score checks 23 metrics, section by section.",
    "A Lifetime plan: pay $149 once instead of a subscription.",
    "One expert resume review a month on Pro.",
    "A 100% money-back guarantee within 30 days on Pro and Lifetime.",
    "AI interview practice, with one interview on Free.",
  ],
  differences: [
    NO_SCORE,
    { ...FREE_PDFS, text: `${FREE_PDFS.text} Rezi's Free plan includes 3 PDF downloads.` },
    {
      title: "A lower monthly price",
      text: `Otto Pro is ${proMonthly} a month; Rezi Pro is $${REZI_PRO_USD} a month.`,
    },
  ],
  extras: [EMPLOYER_JOBS, SOURCED_NOTES],
  pickThem:
    "Rezi suits you if you want a detailed resume score, a one-time Lifetime plan, monthly expert reviews or AI interview practice.",
  pickOtto:
    "Otto suits you if you want free PDF downloads with no cap, plain reasons instead of a score, and AI help for less each month.",
  sources: [
    { label: "Rezi pricing page", url: "https://www.rezi.ai/pricing" },
    { label: "Rezi home page", url: "https://www.rezi.ai/" },
  ],
};

const kickresume: Competitor = {
  slug: "kickresume",
  name: "Kickresume",
  site: "https://www.kickresume.com/en/",
  summary:
    "Kickresume is a resume and cover letter builder with an AI writer, an ATS resume checker, personal websites, a job board and mobile apps.",
  rows: [
    {
      label: "What it is",
      otto: OTTO_SIDE.what,
      them: "A resume and cover letter builder with an AI writer, an ATS resume checker, a personal website builder, a job board, and iOS and Android apps.",
    },
    {
      label: "Free plan",
      otto: OTTO_SIDE.free,
      them: "4 basic resume templates, 4 cover letter templates, 1 basic website template and unlimited downloads. The AI writer and the resume checker aren't included.",
    },
    {
      label: "Paid plans",
      otto: OTTO_SIDE.paid,
      them: "Premium: $24 a month, $54 every 3 months, or $96 every 12 months. It adds 40+ templates, the AI writer, the ATS resume checker, LinkedIn and PDF import, and the mobile apps.",
    },
    {
      label: "Downloads",
      otto: OTTO_SIDE.downloads,
      them: "Unlimited, on every plan.",
    },
    {
      label: "Templates",
      otto: OTTO_SIDE.formats,
      them: "4 on Free, 40+ on Premium, with more colors and fonts.",
    },
  ],
  strengths: [
    "Many more designs: 40+ resume templates on Premium, with matching cover letters.",
    "Unlimited downloads, even on Free.",
    "A personal website builder, a job board, and apps for iOS and Android.",
    "Premium is free for students who verify with ISIC, ITIC or UNiDAYS.",
    "A 14-day money-back guarantee on paid plans.",
  ],
  differences: [
    {
      title: "A resume check on Free",
      text: "Otto's free recruiter view shows the text hiring software pulls from your file, with a plain reason for each problem. Kickresume's ATS resume checker comes with Premium.",
    },
    {
      title: "AI help on Free",
      text: `Free includes ${fixes} line fixes a month with Otto. Kickresume's AI writer comes with Premium.`,
    },
  ],
  extras: [READ_BACK, EMPLOYER_JOBS, SOURCED_NOTES],
  pickThem:
    "Kickresume suits you if you want lots of designs, a personal website, mobile apps, or free Premium as a student.",
  pickOtto: "Otto suits you if you want a resume check and AI line fixes on the free plan.",
  sources: [
    { label: "Kickresume pricing page", url: "https://www.kickresume.com/en/pricing/" },
    { label: "Kickresume home page", url: "https://www.kickresume.com/en/" },
  ],
};

export const COMPETITORS: readonly Competitor[] = [jobscan, rezi, kickresume];

export function competitorBySlug(slug: string): Competitor | undefined {
  return COMPETITORS.find((competitor) => competitor.slug === slug);
}

export function compareTitle(competitor: Pick<Competitor, "name">): string {
  return `Otto Sensei vs ${competitor.name}`;
}
