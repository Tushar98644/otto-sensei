import type { HiringNote, HiringSystem, HiringSystemId } from "./types";

const ANSWER_THE_SAME = "Answer these truthfully, and the same way every time.";

const GREENHOUSE_HELP = "Greenhouse help center";
const WORKDAY_DOCS = "Workday docs";
const ORACLE_DOCS = "Oracle Taleo docs";
const SAP_NOTE = "SAP support note";
const SAP_LEARNING = "SAP Learning";
const WORKABLE_HELP = "Workable help center";

const greenhouse = [
  {
    topic: "screening",
    fact: "Employers can set the form to reject you automatically for some answers to yes/no and pick-from-a-list questions.",
    todo: ANSWER_THE_SAME,
    source: {
      label: GREENHOUSE_HELP,
      url: "https://support.greenhouse.io/hc/en-us/articles/360000653472-Auto-reject",
    },
  },
  {
    topic: "review",
    fact: "Greenhouse says most recruiters review applications in the order they arrive.",
    todo: "Apply soon after the job goes up.",
    source: {
      label: "Greenhouse blog",
      url: "https://my.greenhouse.com/blogs/what-really-happens-after-you-apply-for-a-job",
    },
  },
  {
    topic: "file",
    fact: "Greenhouse can't read resumes over 2.5 MB. Columns, tables, and contact details in a header, footer or text box also trip it up.",
    todo: "Use one column under 2.5 MB, with contact details in the main text.",
    source: {
      label: GREENHOUSE_HELP,
      url: "https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse",
    },
  },
  {
    topic: "search",
    fact: "In Greenhouse's keyword filter, a word in your application counts only if it matches the recruiter's search word exactly.",
    todo: "Use the job post's own words for skills you have, like “JavaScript”.",
    source: {
      label: GREENHOUSE_HELP,
      url: "https://support.greenhouse.io/hc/en-us/articles/27104809835291-Talent-Filtering",
    },
  },
  {
    topic: "ai",
    fact: "With Talent Matching on, AI labels each applicant from Strong match to Limited match. Greenhouse says it never advances or rejects anyone by itself.",
    todo: "Make the job's key skills easy to find in your resume.",
    source: {
      label: GREENHOUSE_HELP,
      url: "https://support.greenhouse.io/hc/en-us/articles/41396009937307-Talent-Matching",
    },
    optIn: true,
  },
] as const satisfies readonly HiringNote[];

const WORKDAY_PARSING =
  "https://doc.workday.com/admin-guide/en-us/human-capital-management/recruiting/candidates/set-up-prospects-and-candidates/hdc1552497830785.html";

const workday = [
  {
    topic: "file",
    fact: "Workday's resume reader never fills in the Skills or Languages fields.",
    todo: "Type your skills and languages into those fields yourself.",
    source: { label: WORKDAY_DOCS, url: WORKDAY_PARSING },
  },
  {
    topic: "file",
    fact: "Workday says what it reads varies with the file's layout and word order, and files without images work best.",
    todo: "Check every field it fills in before you submit.",
    source: { label: WORKDAY_DOCS, url: WORKDAY_PARSING },
  },
  {
    topic: "screening",
    fact: "Employers can set rules that turn applicants down automatically, such as anyone not allowed to work in the job's country.",
    todo: "Answer work-permit questions truthfully, and the same way every time.",
    source: {
      label: WORKDAY_DOCS,
      url: "https://doc.workday.com/admin-guide/en-us/human-capital-management/recruiting/candidates/prospect-and-candidate-management/uwd1485375819245.html?toc=3.3.1.7",
    },
  },
  {
    topic: "ai",
    fact: "Where an employer opts in to HiredScore's newer grading, it checks each listed qualification one by one against your resume. Meeting every basic one earns an A or B.",
    todo: "Back each must-have with a line that clearly shows it.",
    source: {
      label: "Workday HiredScore release notes",
      url: "https://doc.workday.com/hiredscore/en-us/workday-hiredscore/hiredscore-release-notes/2026/august/wednesday--5th-august.html",
    },
    optIn: true,
  },
] as const satisfies readonly HiringNote[];

const lever = [
  {
    topic: "ai",
    fact: "Lever offers recruiters Talent Fit, a percentage for how closely your skills match the job post. Lever says recruiters make the final call.",
    todo: "Use the job post's words for skills you really have.",
    source: { label: "Lever", url: "https://www.lever.co/ai-features" },
  },
] as const satisfies readonly HiringNote[];

const ASHBY_REVIEW = "https://docs.ashbyhq.com/ai-assisted-application-review";

const ashby = [
  {
    topic: "ai",
    fact: "With AI review on, Ashby checks your resume against each of the team's criteria: meets, does not meet, or undecided.",
    todo: "Make each requirement you meet easy to find.",
    source: { label: "Ashby docs", url: ASHBY_REVIEW },
    optIn: true,
  },
  {
    topic: "ai",
    fact: "The team picks those criteria: AI suggestions from the job post, ones reused from other jobs, or its own.",
    todo: "Cover the post's requirements in your own true words.",
    source: { label: "Ashby docs", url: ASHBY_REVIEW },
  },
  {
    topic: "review",
    fact: "Recruiters can sort applicants by the share of criteria met, so the closest matches get read first.",
    todo: "Show every listed requirement you truly meet.",
    source: { label: "Ashby docs", url: ASHBY_REVIEW },
  },
  {
    topic: "screening",
    fact: "Employers can set rules that reject an application automatically when it's sent, based on its form answers. The email can be held back for days.",
    todo: ANSWER_THE_SAME,
    source: { label: "Ashby docs", url: "https://docs.ashbyhq.com/auto-reject-applications" },
  },
] as const satisfies readonly HiringNote[];

const icims = [
  {
    topic: "screening",
    fact: "iCIMS employers can add knock-out questions that screen applicants out when they apply.",
    todo: ANSWER_THE_SAME,
    source: {
      label: "iCIMS blog",
      url: "https://www.icims.com/blog/recruiting-process-automation/",
    },
  },
  {
    topic: "ai",
    fact: "iCIMS offers Candidate Ranking, which uses AI to match your skills and experience to the job post and show the closest matches first.",
    todo: "Describe your experience in the post's terms, where they're true.",
    source: {
      label: "iCIMS blog",
      url: "https://www.icims.com/blog/how-icims-supports-the-nyc-automated-employment-decision-tools-law/",
    },
  },
] as const satisfies readonly HiringNote[];

const TALEO_SEARCH =
  "https://docs.oracle.com/en/cloud/saas/taleo-enterprise/21c/otrcg/c-advancedsearchkeywords.html";

const taleo = [
  {
    topic: "search",
    fact: "Taleo's keyword search matches exact words, unless the recruiter turns on Related Terms.",
    todo: "Use the post's exact words, and write short forms both ways once: “Kubernetes (K8s)”.",
    source: { label: ORACLE_DOCS, url: TALEO_SEARCH },
  },
  {
    topic: "file",
    fact: "Taleo's keyword search reads the PDF, Word, RTF, text and HTML files you attach.",
    todo: "Attach a PDF or Word file, never a photo or a scan.",
    source: { label: ORACLE_DOCS, url: TALEO_SEARCH },
  },
  {
    topic: "screening",
    fact: "Disqualification questions must be answered, and your answers can disqualify you automatically.",
    todo: ANSWER_THE_SAME,
    source: {
      label: ORACLE_DOCS,
      url: "https://docs.oracle.com/en/cloud/saas/taleo-enterprise/otfru/c-prescreeningsectioninrequisition.html",
    },
  },
  {
    topic: "screening",
    fact: "Employers mark skills and questions as Required or Asset. Recruiters can list only the people who meet every Required one.",
    todo: "Answer skill questions accurately: Required ones decide if you're considered.",
    source: {
      label: ORACLE_DOCS,
      url: "https://docs.oracle.com/en/cloud/saas/taleo-enterprise/21b/otfru/prescreening-candidates.html",
    },
  },
] as const satisfies readonly HiringNote[];

const SAP_PRESCREENING = "https://userapps.support.sap.com/sap/support/knowledge/en/2204476";
const SAP_PARSING = "https://userapps.support.sap.com/sap/support/knowledge/en/2081576";

const successfactors = [
  {
    topic: "screening",
    fact: "A wrong answer to a disqualifier question rejects you automatically.",
    todo: ANSWER_THE_SAME,
    source: { label: SAP_NOTE, url: SAP_PRESCREENING },
  },
  {
    topic: "screening",
    fact: "Employers can set a minimum score for rated questions. Falling below it disqualifies you automatically.",
    todo: "Answer rated questions fully. Don't undersell real experience.",
    source: { label: SAP_NOTE, url: SAP_PRESCREENING },
  },
  {
    topic: "file",
    fact: "Scanned PDFs, or PDFs made from images, don't read properly. Dropdown fields never fill in from your resume.",
    todo: "Use a PDF with real text, and fill in dropdowns by hand.",
    source: { label: SAP_NOTE, url: SAP_PARSING },
  },
  {
    topic: "file",
    fact: "Resume reading works only in some languages, such as English, German, French, Spanish and Dutch.",
    todo: "If yours is in another language, check every field it fills.",
    source: { label: SAP_NOTE, url: SAP_PARSING },
  },
  {
    topic: "ai",
    fact: "With AI skills matching on, SAP pulls skills from your resume and sorts them into exact matches and missing skills.",
    todo: "Name the job's skills you have, word for word.",
    source: {
      label: SAP_LEARNING,
      url: "https://learning.sap.com/courses/sap-successfactors-recruiting-recruiter-experience-academy/using-ai-in-sap-successfactors-recruiting_fe692003-a8d0-4160-81fa-687a6a82b3a8",
    },
    optIn: true,
  },
] as const satisfies readonly HiringNote[];

const WINSTON =
  "https://learning.sap.com/courses/smartrecruiters-for-sap-successfactors-academy/introducing-winston-match_f55ee6b8-e404-4ef4-87fa-056cab22f2ef";

const smartrecruiters = [
  {
    topic: "screening",
    fact: "Any yes/no or dropdown question can be a knock-out. A knock-out answer rejects you automatically, by default with an email an hour later.",
    todo: ANSWER_THE_SAME,
    source: {
      label: SAP_LEARNING,
      url: "https://learning.sap.com/courses/smartrecruiters-for-sap-successfactors-academy/creating-rejection-screening-questions_ed2425b9-fd44-4e3d-ab8b-e96adca1c225",
    },
  },
  {
    topic: "ai",
    fact: "Winston Match rates your skills, experience and education against the job from 1 to 4 stars, to help recruiters choose who to read first.",
    todo: "Make your skills, jobs and education easy to find.",
    source: { label: SAP_LEARNING, url: WINSTON },
  },
  {
    topic: "ai",
    fact: "Winston guesses skills from your job titles.",
    todo: "Use clear, standard job titles.",
    source: { label: SAP_LEARNING, url: WINSTON },
  },
] as const satisfies readonly HiringNote[];

const WORKABLE_AGENT =
  "https://help.workable.com/hc/en-us/articles/38381544828695-Using-the-Workable-Agent";

const workable = [
  {
    topic: "screening",
    fact: "Knock-out questions are yes/no only. The knock-out answer disqualifies you, and you aren't told.",
    todo: ANSWER_THE_SAME,
    source: {
      label: WORKABLE_HELP,
      url: "https://help.workable.com/hc/en-us/articles/115012238688",
    },
  },
  {
    topic: "file",
    fact: "Workable's application form takes resumes up to 5 MB, as PDF, DOC, DOCX, RTF, HTML or ODT.",
    todo: "Send a PDF or DOCX under 5 MB.",
    source: {
      label: WORKABLE_HELP,
      url: "https://help.workable.com/hc/en-us/articles/115012238108-What-types-of-files-can-be-uploaded-on-the-application-form",
    },
  },
  {
    topic: "ai",
    fact: "Where an employer uses the Workable Agent, it scores you against the team's requirements, and must-haves count double.",
    todo: "Show each must-have you meet in plain words.",
    source: { label: WORKABLE_HELP, url: WORKABLE_AGENT },
    optIn: true,
  },
  {
    topic: "ai",
    fact: "When your resume and answers don't say enough about a requirement, the Agent marks it Unknown.",
    todo: "State each requirement you meet plainly.",
    source: { label: WORKABLE_HELP, url: WORKABLE_AGENT },
    optIn: true,
  },
] as const satisfies readonly HiringNote[];

const bamboohr = [
  {
    topic: "review",
    fact: "In BambooHR's hiring tool, people on the team read your resume and answers and rate you themselves.",
    todo: "Answer every question fully: people read them.",
    source: {
      label: "BambooHR",
      url: "https://www.bamboohr.com/integrations/listings/bamboohr-applicant-tracking",
    },
  },
] as const satisfies readonly HiringNote[];

const JOBVITE = "https://www.jobvite.com/commitment-to-transparency/";

const jobvite = [
  {
    topic: "ai",
    fact: "Jobvite's AI pulls a list of skills from your resume, and its match results reach recruiters as grades.",
    todo: "Name the job's skills you have, word for word.",
    source: { label: "Jobvite", url: JOBVITE },
  },
  {
    topic: "ai",
    fact: "Jobvite says its model leaves out your name, contact details, age, race, gender and ethnicity.",
    todo: "Spend your words on skills and results.",
    source: { label: "Jobvite", url: JOBVITE },
  },
] as const satisfies readonly HiringNote[];

const recruitee = [
  {
    topic: "screening",
    fact: "Knockout questions (yes/no, single or multiple choice) disqualify the wrong answer automatically, and can send the rejection email too.",
    todo: ANSWER_THE_SAME,
    source: {
      label: "Recruitee help center",
      url: "https://support.recruitee.com/articles/6108676",
    },
  },
] as const satisfies readonly HiringNote[];

const TEAMTAILOR_COPILOT =
  "https://support.teamtailor.com/en/articles/10209597-co-pilot-candidate-screening";

const teamtailor = [
  {
    topic: "ai",
    fact: "With Co-pilot on, AI checks you against criteria the team writes: met, not met, or a dash when there's too little to go on.",
    todo: "State each likely requirement plainly.",
    source: { label: "Teamtailor help center", url: TEAMTAILOR_COPILOT },
    optIn: true,
  },
  {
    topic: "ai",
    fact: "Co-pilot reads your resume, cover letter, answers and address, and the employer can move people to another stage on its result.",
    todo: "Keep your letter and answers in line with your resume.",
    source: { label: "Teamtailor help center", url: TEAMTAILOR_COPILOT },
  },
] as const satisfies readonly HiringNote[];

export const HIRING_SYSTEMS: Readonly<Record<HiringSystemId, HiringSystem>> = {
  greenhouse: { id: "greenhouse", name: "Greenhouse", notes: greenhouse },
  lever: { id: "lever", name: "Lever", notes: lever },
  ashby: { id: "ashby", name: "Ashby", notes: ashby },
  workday: { id: "workday", name: "Workday", notes: workday },
  icims: { id: "icims", name: "iCIMS", notes: icims },
  taleo: { id: "taleo", name: "Taleo", notes: taleo },
  successfactors: { id: "successfactors", name: "SAP SuccessFactors", notes: successfactors },
  smartrecruiters: { id: "smartrecruiters", name: "SmartRecruiters", notes: smartrecruiters },
  workable: { id: "workable", name: "Workable", notes: workable },
  bamboohr: { id: "bamboohr", name: "BambooHR", notes: bamboohr },
  jobvite: { id: "jobvite", name: "Jobvite", notes: jobvite },
  recruitee: { id: "recruitee", name: "Recruitee", notes: recruitee },
  teamtailor: { id: "teamtailor", name: "Teamtailor", notes: teamtailor },
};

// Each system's notes as written, so a translation (src/lib/seo-pages/locales) matches them one for one.
export type SystemNotes = {
  greenhouse: typeof greenhouse;
  lever: typeof lever;
  ashby: typeof ashby;
  workday: typeof workday;
  icims: typeof icims;
  taleo: typeof taleo;
  successfactors: typeof successfactors;
  smartrecruiters: typeof smartrecruiters;
  workable: typeof workable;
  bamboohr: typeof bamboohr;
  jobvite: typeof jobvite;
  recruitee: typeof recruitee;
  teamtailor: typeof teamtailor;
};

const FILE_NOTE_SYSTEMS: readonly HiringSystemId[] = [
  "workday",
  "greenhouse",
  "successfactors",
  "taleo",
  "workable",
];

export type SystemNote = { system: HiringSystem; note: HiringNote };

export function fileReadingNotes(): SystemNote[] {
  return FILE_NOTE_SYSTEMS.flatMap((id) => {
    const system = HIRING_SYSTEMS[id];
    const note = system.notes.find((entry) => entry.topic === "file");
    return note ? [{ system, note }] : [];
  });
}
