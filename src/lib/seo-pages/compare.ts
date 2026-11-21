import { BRAND } from "@/config/brand";
import { FREE_APPLICATIONS, FREE_JOB_MATCHES, FREE_TEMPLATES, PLANS } from "@/config/plans";
import { HIRING_SYSTEMS } from "@/lib/ats/systems";
import { planPrice } from "@/lib/billing/prices";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { pluralize } from "@/lib/utils";

export type CompareSource = { label: string; url: string };
// The answer is 2 to 4 words that stand alone; the detail adds to it without repeating it.
export type CompareCell = { answer: string; detail?: string };
export type CompareRow = { label: string; otto: CompareCell; them: CompareCell };
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
  // Both finish "Pick <name> if …", so each starts in lower case.
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
  what: {
    answer: "Resume checker and builder",
    detail:
      "See the text hiring software reads, fix weak lines with Otto and download a clean PDF. Pro adds tailoring to each job, cover letters, outreach messages, interview prep, every format, the full tracker and a portfolio site.",
  },
  score: {
    answer: "No overall score",
    detail: "Each check passes or names the problem, with the reason in plain words.",
  },
  free: {
    answer: "1 resume, no card",
    detail: `Check, fix and download it as a PDF in ${freeFormats}, with ${fixes} line fixes a month from Otto, your ${FREE_JOB_MATCHES} closest job matches and ${pluralize(FREE_APPLICATIONS, "tracked application")}.`,
  },
  paid: {
    answer: `Pro: ${proMonthly} a month`,
    detail: `Max: ${maxMonthly} a month, for more AI help. Cancel anytime.`,
  },
  downloads: {
    answer: "Free PDFs, no cap",
    detail: `In ${freeFormats}. Every format and Word (.docx) downloads come with Pro.`,
  },
  formats: {
    answer: `${TEMPLATE_IDS.length} formats, ${FREE_TEMPLATES.length} free`,
    detail: `Each copies a widely used resume layout: ${freeFormats} on Free, every one on Pro.`,
  },
  jobs: {
    answer: "Matched to your resume",
    detail: `Open jobs from companies' careers pages and public job feeds, read every day. Free shows your ${FREE_JOB_MATCHES} closest; Pro shows every match.`,
  },
  systems: {
    answer: `Spots ${systemCount} hiring systems`,
    detail: "From a job link, with sourced notes on how each one handles applications.",
  },
} as const satisfies Record<string, CompareCell>;

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
    "Jobscan is a resume scanner: it compares your resume with a job post and gives a match rate.",
  rows: [
    {
      label: "What it is",
      otto: OTTO_SIDE.what,
      them: {
        answer: "A resume scanner",
        detail:
          "It compares your resume with a job post and gives a match rate, plus a resume builder, job tracker, job matches, LinkedIn optimization, a cover letter generator, auto-apply and AI interview practice.",
      },
    },
    {
      label: "Score",
      otto: OTTO_SIDE.score,
      them: {
        answer: "A match rate",
        detail:
          "One for each scan, with a target of at least 75%. It rests on hard skills first, then education level (only when the post asks for an advanced degree), job title, soft skills and other keywords.",
      },
    },
    {
      label: "Free plan",
      otto: OTTO_SIDE.free,
      them: {
        answer: "Free monthly scans",
        detail:
          "Resume scans each month (five, per Jobscan's blog), the resume builder, and a 7-day Premium trial.",
      },
    },
    {
      label: "Paid plans",
      otto: OTTO_SIDE.paid,
      them: {
        answer: "Premium, monthly or quarterly",
        detail: "Jobscan lists its prices on its plan page.",
      },
    },
    {
      label: "Jobs",
      otto: OTTO_SIDE.jobs,
      them: {
        answer: "Matches and auto-apply",
        detail:
          "Jobs matched to your resume. With auto-apply, you review each application before it's sent.",
      },
    },
    {
      label: "Hiring systems",
      otto: OTTO_SIDE.systems,
      them: {
        answer: "Detects known systems",
        detail:
          "It names the applicant tracking system on a job posting when it recognizes the company's system.",
      },
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
    "you want a match-rate number for each application, help with your LinkedIn profile, or auto-apply.",
  pickOtto: "you'd rather have a plain reason for each problem than a match rate.",
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
      them: {
        answer: "An AI resume builder",
        detail:
          "With an AI resume agent, a resume checker and keyword scanner, a cover letter generator, AI interview practice and job search.",
      },
    },
    {
      label: "Score",
      otto: OTTO_SIDE.score,
      them: {
        answer: "The Rezi Score",
        detail:
          "It checks your resume against 23 key metrics, section by section. Limited on Free, full on Pro.",
      },
    },
    {
      label: "Free plan",
      otto: OTTO_SIDE.free,
      them: {
        answer: "1 resume, 3 PDFs",
        detail: "Plus 1 AI interview. The Rezi Score and AI keyword targeting are limited.",
      },
    },
    {
      label: "Paid plans",
      otto: OTTO_SIDE.paid,
      them: {
        answer: `Pro: $${REZI_PRO_USD} a month`,
        detail:
          "With unlimited resumes, PDF downloads and AI interviews, and one expert review a month. Lifetime: $149 once, with Pro's features but no monthly review.",
      },
    },
    {
      label: "Downloads",
      otto: OTTO_SIDE.downloads,
      them: { answer: "3 PDFs on Free", detail: "Unlimited on Pro." },
    },
    { label: "Jobs", otto: OTTO_SIDE.jobs, them: { answer: "A job search tool" } },
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
  extras: [EMPLOYER_JOBS],
  pickThem:
    "you want a detailed resume score, a one-time Lifetime plan, monthly expert reviews or AI interview practice.",
  pickOtto:
    "you want free PDF downloads with no cap, plain reasons instead of a score, and AI help for less each month.",
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
      them: {
        answer: "Resume and letter builder",
        detail:
          "With an AI writer, an ATS resume checker, a personal website builder, a job board, and iOS and Android apps.",
      },
    },
    {
      label: "Free plan",
      otto: OTTO_SIDE.free,
      them: {
        answer: "4 basic resume templates",
        detail:
          "Plus 4 cover letter templates, 1 basic website template and unlimited downloads. The AI writer and the resume checker aren't included.",
      },
    },
    {
      label: "Paid plans",
      otto: OTTO_SIDE.paid,
      them: {
        answer: "Premium: $24 a month",
        detail:
          "Or $54 every 3 months, or $96 every 12 months. It adds 40+ templates, the AI writer, the ATS resume checker, LinkedIn and PDF import, and the mobile apps.",
      },
    },
    {
      label: "Downloads",
      otto: OTTO_SIDE.downloads,
      them: { answer: "Unlimited on every plan" },
    },
    {
      label: "Templates",
      otto: OTTO_SIDE.formats,
      them: {
        answer: "40+ on Premium",
        detail: "4 on Free. Premium adds more colors and fonts.",
      },
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
  extras: [READ_BACK, EMPLOYER_JOBS],
  pickThem:
    "you want lots of designs, a personal website, mobile apps, or free Premium as a student.",
  pickOtto: "you want a resume check and AI line fixes on the free plan.",
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

export type Choice = { name: string; clause: string };

export function choices(competitor: Competitor): readonly [Choice, Choice] {
  return [
    { name: BRAND.shortName, clause: competitor.pickOtto },
    { name: competitor.name, clause: competitor.pickThem },
  ];
}

export function ottoReasons(competitor: Competitor): readonly CompareNote[] {
  return [...competitor.differences, ...competitor.extras];
}

export function bothHaveFreePlans(competitor: Competitor): boolean {
  return competitor.rows.some((row) => row.label === "Free plan");
}
