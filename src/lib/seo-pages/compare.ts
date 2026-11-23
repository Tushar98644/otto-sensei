import { BRAND } from "@/config/brand";
import {
  applicationLimit,
  FREE_JOB_MATCHES,
  FREE_TEMPLATES,
  PLANS,
  resumeLimit,
} from "@/config/plans";
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
  // The day every fact about this product was read from its own pages.
  checked: string;
  // Set when the product's site shows each country its own prices; the ones here were shown in India.
  pricedByCountry?: boolean;
  // Set when the facts are as the product's own pages listed them that month, not read on the day in checked.
  asListed?: boolean;
};

const freeFormats = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name).join(" and ");
const systemCount = Object.keys(HIRING_SYSTEMS).length;
const fixes = PLANS.free.limits.fix;
const proMonthly = planPrice("pro", "month");
const maxMonthly = planPrice("max", "month");

const OTTO_SIDE = {
  what: {
    answer: "Resume checker and builder",
    detail: `See the text hiring software reads, fix weak lines with Otto and download a clean PDF. Pro adds tailoring to each job, cover letters, outreach messages, interview prep, every format, up to ${applicationLimit("pro").toLocaleString("en-US")} tracked applications and a portfolio site.`,
  },
  score: {
    answer: "No overall score",
    detail: "Each check passes or names the problem, with the reason in plain words.",
  },
  free: {
    answer: `${pluralize(resumeLimit("free"), "resume")}, no card`,
    detail: `Check, fix and download it as a PDF in ${freeFormats}, with ${fixes} line fixes a month from Otto, your ${FREE_JOB_MATCHES} closest job matches and ${pluralize(applicationLimit("free"), "tracked application")}.`,
  },
  paid: {
    answer: `Pro: ${proMonthly} a month`,
    detail: `Max: ${maxMonthly} a month, for more AI help, resumes and tracked applications. Cancel anytime.`,
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
    "Jobscan is a resume scanner: it compares your resume with a job post and gives a match rate. Around it sit a resume builder, a job tracker, job matches, LinkedIn help, cover letters, auto-apply and interview practice.",
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
  checked: "2026-11-18",
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
  checked: "2026-11-22",
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
        answer: "Premium, priced by country",
        detail:
          "$9 for one month, $18 for three or $48 for a year. It adds 40+ templates, the AI writer, the ATS resume checker, LinkedIn and PDF import, and the mobile apps.",
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
  checked: "2026-11-22",
  pricedByCountry: true,
};

const resumeio: Competitor = {
  slug: "resume-io",
  name: "Resume.io",
  site: "https://resume.io/",
  summary:
    "Resume.io is a resume and cover letter builder with an AI writer, an ATS scorer and 500+ resume examples. Around it sit a job board, recruiter matching, an auto-apply service, interview practice and a salary analyzer.",
  rows: [
    {
      label: "What it is",
      otto: OTTO_SIDE.what,
      them: {
        answer: "Resume and letter builder",
        detail:
          "With an AI writer, an ATS scorer, a job board, recruiter matching, auto-apply by its team, interview practice, a salary analyzer and courses.",
      },
    },
    {
      label: "Free plan",
      otto: OTTO_SIDE.free,
      them: {
        answer: "1 resume, TXT downloads",
        detail:
          "One resume and one cover letter, downloads in TXT only, and limited sharing and analytics.",
      },
    },
    {
      label: "Paid plans",
      otto: OTTO_SIDE.paid,
      them: {
        answer: "Weekly or yearly plans",
        detail:
          "Priced by country, with unlimited resumes, cover letters and PDF downloads. The plan cards say one-time payment; its FAQ says a 7-day trial becomes a monthly membership unless you cancel.",
      },
    },
    {
      label: "Downloads",
      otto: OTTO_SIDE.downloads,
      them: {
        answer: "TXT only on Free",
        detail: "PDF downloads come with a paid plan, and its templates download to Word or PDF.",
      },
    },
  ],
  strengths: [
    "A large library: 500+ resume examples by job, and resume and cover letter templates in many styles.",
    "Tools past the resume: a job board, interview practice, a salary analyzer and courses.",
    "Recruiter Match, which it says sends your resume to recruiters, and Auto Apply, where its team applies to jobs for you.",
    "A 7-day money-back guarantee, no questions asked.",
  ],
  differences: [
    {
      ...FREE_PDFS,
      text: `${FREE_PDFS.text} Resume.io's free plan downloads in TXT only.`,
    },
    {
      title: "Billed by the month",
      text: "Otto Pro is billed monthly or yearly, and you cancel from your account. Resume.io sells a one-week or a one-year plan.",
    },
  ],
  extras: [NO_SCORE, EMPLOYER_JOBS],
  pickThem:
    "you want a big library of designs and examples, Word downloads, or help with applying and salary talks.",
  pickOtto:
    "you want free PDF downloads and a plain check of what hiring software reads from your file.",
  sources: [
    { label: "Resume.io pricing page", url: "https://resume.io/pricing" },
    { label: "Resume.io home page", url: "https://resume.io/" },
  ],
  checked: "2026-11-22",
  pricedByCountry: true,
};

const enhancv: Competitor = {
  slug: "enhancv",
  name: "Enhancv",
  site: "https://enhancv.com/",
  summary:
    "Enhancv is an AI resume builder with hundreds of templates, an ATS check, one-click tailoring to a job post, resume translation, AI mock interviews, a job board and a job tracker.",
  rows: [
    {
      label: "What it is",
      otto: OTTO_SIDE.what,
      them: {
        answer: "An AI resume builder",
        detail:
          "With content suggestions, an ATS check and resume feedback, tailoring with a match score, translation, a cover letter generator, interview help, a job board and a tracker.",
      },
    },
    {
      label: "Score",
      otto: OTTO_SIDE.score,
      them: {
        answer: "An ATS score",
        detail:
          "Its resume feedback gives an ATS score, and tailoring shows a match score for a job post.",
      },
    },
    {
      label: "Free plan",
      otto: OTTO_SIDE.free,
      them: {
        answer: "Free for 7 days",
        detail:
          "All templates and design tools, basic sections, up to 12 section items, and Enhancv branding.",
      },
    },
    {
      label: "Paid plans",
      otto: OTTO_SIDE.paid,
      them: {
        answer: "Pro, priced by country",
        detail:
          "Billed monthly, every 3 months or every 6 months. Adds up to 300 resumes and cover letters, content suggestions, the ATS check, Pro sections and no branding.",
      },
    },
    {
      label: "Downloads",
      otto: OTTO_SIDE.downloads,
      them: { answer: "PDF, not Word", detail: "Its FAQ says resumes download as a PDF." },
    },
  ],
  strengths: [
    "Hundreds of templates, tens of sections and thousands of design options, including sections like Day of My Life.",
    "Resume translation into languages such as French, German, Spanish, Arabic, Chinese, Japanese and Hindi.",
    "One-click tailoring: paste a job ad and it shows what to add, with a match score.",
    "A job board, a job tracker with reminders, a Chrome extension and AI mock interviews.",
  ],
  differences: [
    {
      title: "A free plan with no end date",
      text: "Otto's Free plan has no time limit. Enhancv's Free plan is valid for 7 days.",
    },
    NO_SCORE,
  ],
  extras: [FREE_PDFS, EMPLOYER_JOBS],
  pickThem:
    "you want many designs and sections, resume translation, or AI mock interviews in one place.",
  pickOtto: "you want a free plan with no time limit and plain reasons instead of a score.",
  sources: [
    { label: "Enhancv pricing page", url: "https://enhancv.com/pricing/" },
    { label: "Enhancv home page", url: "https://enhancv.com/" },
  ],
  checked: "2026-11-22",
  pricedByCountry: true,
};

const novoresume: Competitor = {
  slug: "novoresume",
  name: "Novoresume",
  site: "https://novoresume.com/",
  summary:
    "Novoresume is a resume and cover letter builder with designed templates, an ATS checker and AI writing tools, sold as a subscription or as a one-month pass.",
  rows: [
    {
      label: "What it is",
      otto: OTTO_SIDE.what,
      them: {
        answer: "Resume and letter builder",
        detail:
          "With designed templates, an ATS checker that scores your file, AI writing tools and a cover letter builder on Pro.",
      },
    },
    {
      label: "Free plan",
      otto: OTTO_SIDE.free,
      them: {
        answer: "1 resume, 1 page",
        detail:
          "8 templates, 30 colour themes, 2 AI credits a month and the ATS checker. It doesn't expire, and the PDF carries Novoresume branding.",
      },
    },
    {
      label: "Paid plans",
      otto: OTTO_SIDE.paid,
      them: {
        answer: "Pro, priced by country",
        detail:
          "Monthly, quarterly or yearly until you cancel, or a one-month Pass charged once. Pro adds up to 144 documents of 25 pages, every template, the cover letter builder and 40 AI credits a month.",
      },
    },
    {
      label: "Downloads",
      otto: OTTO_SIDE.downloads,
      them: {
        answer: "Branded PDF on Free",
        detail:
          "Pro removes the branding. A download that asks you to upgrade works once Pro features are swapped for free ones.",
      },
    },
  ],
  strengths: [
    "No subscription needed: the one-month Pass charges once, with nothing to cancel.",
    "A free plan that doesn't expire, with an ATS checker included.",
    "Lots of design control on Pro: every template, 74 colour themes, 12 fonts, custom layouts and creative backgrounds.",
    "A 14-day money-back guarantee on your first upgrade.",
  ],
  differences: [
    {
      title: "Free PDFs without branding",
      text: "Otto puts no branding on the PDFs you download for free. Novoresume's free PDFs carry its branding.",
    },
    NO_SCORE,
  ],
  extras: [FREE_PDFS, EMPLOYER_JOBS],
  pickThem:
    "you want designed templates with colours and icons, or a one-month pass with nothing to cancel.",
  pickOtto: "you want free PDFs without branding and plain reasons instead of a score.",
  sources: [
    { label: "Novoresume pricing page", url: "https://novoresume.com/pricing" },
    { label: "Novoresume home page", url: "https://novoresume.com/" },
  ],
  checked: "2026-11-22",
  pricedByCountry: true,
};

const zety: Competitor = {
  slug: "zety",
  name: "Zety",
  site: "https://zety.com/",
  summary:
    "Zety is an online resume builder. Its free tier downloads in TXT, and a paid plan adds PDF and Word downloads: a 14-day trial that renews every 4 weeks, or a year paid upfront.",
  rows: [
    {
      label: "What it is",
      otto: OTTO_SIDE.what,
      them: { answer: "An online resume builder" },
    },
    {
      label: "Free plan",
      otto: OTTO_SIDE.free,
      them: { answer: "A free tier", detail: "Downloads in TXT only." },
    },
    {
      label: "Paid plans",
      otto: OTTO_SIDE.paid,
      them: {
        answer: "$1.95 for 14 days",
        detail:
          "The trial renews at $25.95 every 4 weeks. Or pay $71.40 upfront for a year ($5.95 a month). A 14-day money-back guarantee.",
      },
    },
    {
      label: "Downloads",
      otto: OTTO_SIDE.downloads,
      them: { answer: "TXT only on Free", detail: "PDF and Word downloads need a paid plan." },
    },
  ],
  strengths: [
    "A 14-day trial for $1.95, to try the paid plan before it renews.",
    "Word downloads as well as PDF on a paid plan.",
    "A yearly option at $71.40 upfront, which works out to $5.95 a month.",
    "A 14-day money-back guarantee.",
  ],
  differences: [
    { ...FREE_PDFS, text: `${FREE_PDFS.text} Zety's free tier downloads in TXT only.` },
    {
      title: "A lower price month to month",
      text: `Otto Pro is ${proMonthly} a month, billed monthly. Zety's $1.95 trial renews at $25.95 every 4 weeks.`,
    },
  ],
  extras: [NO_SCORE, EMPLOYER_JOBS],
  pickThem: "you'd pay for a year upfront to get the lowest monthly price.",
  pickOtto: "you want free PDF downloads and a lower price month to month.",
  sources: [{ label: "Zety pricing page", url: "https://zety.com/pricing" }],
  checked: "2026-11-22",
  asListed: true,
};

const teal: Competitor = {
  slug: "teal",
  name: "Teal",
  site: "https://www.tealhq.com/",
  summary:
    "Teal is a resume app with a free plan and a paid plan, Teal+, billed by the week, every 30 days or every 90 days.",
  rows: [
    {
      label: "What it is",
      otto: OTTO_SIDE.what,
      them: { answer: "A resume app", detail: "With a free plan and a paid plan, Teal+." },
    },
    {
      label: "Free plan",
      otto: OTTO_SIDE.free,
      them: { answer: "Yes, a free plan" },
    },
    {
      label: "Paid plans",
      otto: OTTO_SIDE.paid,
      them: { answer: "Teal+: $13 a week", detail: "Or $29 every 30 days, or $79 every 90 days." },
    },
  ],
  strengths: [
    "A free plan to start with.",
    "Teal+ for a single week at $13, for a short, focused search.",
    "Teal+ for $79 every 90 days, about $26 a month, for a longer search.",
  ],
  differences: [
    {
      title: "A lower monthly price",
      text: `Otto Pro is ${proMonthly} a month. Teal+ is $29 every 30 days.`,
    },
  ],
  extras: [FREE_PDFS, NO_SCORE, EMPLOYER_JOBS],
  pickThem: "you want to pay for a single week, or for 90 days at a time.",
  pickOtto: "you want free PDF downloads and a lower price each month.",
  sources: [
    {
      label: "Teal help center, “Teal vs Teal+”",
      url: "https://help.tealhq.com/en/articles/9530153-teal-vs-teal",
    },
    {
      label: "Teal blog, “Best resume apps”",
      url: "https://www.tealhq.com/post/best-resume-apps",
    },
  ],
  checked: "2026-11-22",
  asListed: true,
};

const canva: Competitor = {
  slug: "canva",
  name: "Canva",
  site: "https://www.canva.com/",
  summary:
    "Canva is a general design tool rather than a resume tool: resumes are one of the things you can design with it. It has a free plan with free templates and a paid plan, Canva Pro.",
  rows: [
    {
      label: "What it is",
      otto: OTTO_SIDE.what,
      them: {
        answer: "A general design tool",
        detail: "Resumes are one of the things you can make with it; it isn't built only for them.",
      },
    },
    {
      label: "Free plan",
      otto: OTTO_SIDE.free,
      them: { answer: "Free, with templates", detail: "Its free plan includes free templates." },
    },
    {
      label: "Paid plans",
      otto: OTTO_SIDE.paid,
      them: {
        answer: "Canva Pro, by country",
        detail: "Prices vary by country, so check Canva's pricing page for yours.",
      },
    },
  ],
  strengths: [
    "One tool for your resume and your other designs.",
    "A free plan with free templates to start from.",
    "Canva Pro is priced for each country.",
  ],
  differences: [
    {
      title: "Made for job seekers",
      text: "Otto is built only for resumes and job applications: it shows the text hiring software reads from your file and names each problem. Canva is a general design tool.",
    },
  ],
  extras: [READ_BACK, FREE_PDFS, EMPLOYER_JOBS],
  pickThem: "you want one tool for your resume and your other designs.",
  pickOtto:
    "you want a tool made for job applications that checks what hiring software reads from your resume.",
  sources: [{ label: "Canva Pro pricing page", url: "https://www.canva.com/en_in/pro/" }],
  checked: "2026-11-22",
  asListed: true,
};

export const COMPETITORS: readonly Competitor[] = [
  jobscan,
  rezi,
  kickresume,
  resumeio,
  enhancv,
  novoresume,
  zety,
  teal,
  canva,
];

// Newest first, so the index and the full text name the latest check.
export const COMPETITORS_CHECKED = COMPETITORS.map((competitor) => competitor.checked)
  .sort()
  .at(-1)!;

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
