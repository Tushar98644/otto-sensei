import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { FREE_TEMPLATES, PLANS } from "@/config/plans";
import { planPrice } from "@/lib/billing/prices";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { RELATED } from "@/lib/seo-pages/pages";
import { SEO_PATHS, examplePath } from "@/lib/seo-pages/paths";
import type { FaqItem } from "../_components/faq-list";
import type { Note } from "../_components/note-rows";

const freeFormats = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name).join(" and ");
const proFormats = TEMPLATE_IDS.length - FREE_TEMPLATES.length;
const fixes = PLANS.free.limits.fix;
const pro = PLANS.pro.name;

export const BUILD_STEPS: readonly Note[] = [
  {
    title: "Start from what you have",
    text: (
      <>
        Upload a PDF or Word file, import your LinkedIn data export or a JSON Resume file, start
        from a blank page, or open one of the{" "}
        <TextLink href={SEO_PATHS.resumeExamples}>resume examples</TextLink>. With {pro}, Build with
        Otto writes a first draft from a few answers about your jobs.
      </>
    ),
  },
  {
    title: "See what hiring software reads",
    text: "The recruiter view shows the text a hiring system pulls from your file, in order, with plain checks for contact details, headings, columns, tables, icons, dates and length. Each problem comes with the reason.",
  },
  {
    title: "Fix weak lines with Otto",
    text: `Otto's line check marks lines that read like duties, miss a result or lean on stock phrases. Ask him to fix one and he asks for the missing fact first, then writes the line from your answer. You keep, edit or skip every suggestion. Free includes ${fixes} line fixes a month.`,
  },
  {
    title: "Match it to a job",
    text: (
      <>
        Paste a job post or its link to see which skills it names, which your resume shows and which
        are missing. The <TextLink href={SEO_PATHS.jobMatch}>job match check</TextLink> works
        without signing in. With {pro}, Otto tailors a copy of your resume to the post.
      </>
    ),
  },
  {
    title: "Download a clean PDF",
    text: `Pick a format and Letter or A4 paper, then download. Every format is one column of real text, tested by reading the PDF back. ${freeFormats} are free with no download cap; the other ${proFormats} formats and Word downloads come with ${pro}.`,
  },
];

export const AUDIENCES: readonly Note[] = [
  {
    title: "Freshers and students",
    text: (
      <>
        Put Education first, write projects like jobs, and keep it to one page. The{" "}
        <TextLink href={examplePath("fresher")}>fresher example</TextLink> shows the shape for a
        B.Tech or any other graduate, and checking and PDFs cost nothing.
      </>
    ),
  },
  {
    title: "Changing jobs",
    text: "Upload the resume you have. The recruiter view shows what to fix first, and the job match check shows which skills the next job asks for that your resume doesn't show yet.",
  },
  {
    title: "Applying abroad",
    text: "Pick Letter paper for the US and Canada, and A4 for most other places. Leave off a photo, date of birth and marital status, and write money in the employer's currency.",
  },
  {
    title: "Applying to many jobs",
    text: `${pro} keeps a tailored copy for each job, writes cover letters and answers to application questions, and tracks every application with follow-up reminders.`,
  },
];

export const INDIA_NOTES: readonly Note[] = [
  {
    title: "Keep CTC off the resume",
    text: "Recruiters ask for current and expected CTC in the application form, on your Naukri profile or on the first call. Leave it off the page, so one resume works for every application. With Pro, when Otto drafts an answer to a question about salary, he leaves a blank for you to fill in.",
  },
  {
    title: "Give your notice period where it's asked",
    text: "Put it in the application form or your cover note, not under your name. Otto never guesses it: with Pro, a drafted answer that needs your notice period gets a blank in brackets for you to fill in.",
  },
  {
    title: "Use the same story on Naukri",
    text: "Upload the PDF you download here to your Naukri profile, and use the same job title and key skills in the profile as on the resume. A recruiter who finds you there then sees the same story twice.",
  },
  {
    title: "Drop the old biodata details",
    text: "Photo, date of birth, marital status, father's name and a signed declaration come from old templates. Most employers don't ask for them, and Otto's formats have no place for a photo.",
  },
  {
    title: "Show marks while they matter",
    text: "For freshers, CGPA and Class XII marks still count, because many campus and trainee posts set a cut-off. After a few years of work, the degree and college are enough.",
  },
];

export const BUILDER_FAQ: readonly FaqItem[] = [
  {
    question: "Is this resume builder really free?",
    answer: `Yes. Building, checking and downloading one resume as a PDF is free, in ${freeFormats}, with no cap on downloads and no card. Free also includes ${fixes} line fixes a month from Otto. ${pro} is ${planPrice("pro", "month")} a month for tailoring, cover letters, every format and Word downloads.`,
  },
  {
    question: "Is it an AI resume builder?",
    answer:
      "Yes, with limits on purpose. Otto's AI fixes lines, tailors resumes and writes cover letters, but only from facts you give him: he asks for numbers instead of making them up, and you approve every change. The recruiter view and the line check are plain rules, not AI.",
  },
  {
    question: "Will my resume get through an ATS?",
    answer: (
      <>
        Nobody can promise that, because every employer sets up its hiring system differently. Otto
        shows you the text a system pulls from your file and flags what often goes wrong, like
        columns, tables, icons and text boxes. The{" "}
        <TextLink href={RELATED.ats.href}>ATS guides</TextLink> show what common systems are known
        to do.
      </>
    ),
  },
  {
    question: "Is it good for freshers?",
    answer: `Yes. Start from the fresher example or a blank page, put Education first, and keep it to one page. ${freeFormats} are both free and suit a first resume.`,
  },
  {
    question: "Should I put my CTC and notice period on my resume?",
    answer:
      "No. Give them when an application form, a recruiter or your Naukri profile asks. A resume without them works for every application, and the numbers change more often than your work does.",
  },
  {
    question: "Do I need to sign up?",
    answer: `Not to build, check or download: your resume is saved in your browser. A free account backs it up and turns on Otto's ${fixes} line fixes a month. Sign in with Google or an emailed code, no password.`,
  },
  {
    question: "Letter or A4?",
    answer:
      "Both are there. Pick Letter for jobs in the US and Canada, and A4 for India, the UK, Europe and most other places. Your words stay the same either way.",
  },
  {
    question: "Can I download my resume in Word?",
    answer: (
      <>
        Word (.docx) downloads come with {pro}. On Free, downloads are PDFs, as many as you like.{" "}
        <TextLink href={ROUTES.pricing}>See pricing</TextLink>.
      </>
    ),
  },
];
