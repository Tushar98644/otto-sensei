import type { LintIssueId } from "./types";

// Client-safe. What opens from a line's chip: why the rule matters, and one weak line made better.
// Sources for each rule: projects/resume-app/RESUME-CHECKS-RESEARCH.md.

export type IssueHelp = {
  why: string;
  // A typical weak line and a better one. Null where one line can't show it (repeats, full stops).
  example: { before: string | null; after: string } | null;
};

export const ISSUE_HELP: Record<LintIssueId, IssueHelp> = {
  duty: {
    why: "Recruiters look for what you did and what changed, not the job description.",
    example: {
      before: "Responsible for maintaining the database",
      after: "Kept the database at 99.9% uptime by adding automated backups",
    },
  },
  "no-result": {
    why: "A line that ends in a result shows why your work mattered.",
    example: {
      before: "Developed REST APIs in Node.js",
      after: "Built REST APIs in Node.js that cut page load time from 3s to 0.8s",
    },
  },
  "no-number": {
    why: "A number shows the size of the result: how many, how much or how fast.",
    example: {
      before: "Improved the checkout flow",
      after: "Improved the checkout flow, lifting completed orders 12%",
    },
  },
  "no-method": {
    why: "Saying how you got the result makes it believable.",
    example: {
      before: "Cut cloud costs 30%",
      after: "Cut cloud costs 30% by moving batch jobs to cheaper servers",
    },
  },
  "weak-start": {
    why: "The first word gets read first. A strong verb shows you did the work.",
    example: {
      before: "Helped migrate the patient portal to React",
      after: "Migrated the patient portal to React for 40,000 patients",
    },
  },
  "first-person": {
    why: "Resume lines leave out I, me and we. It's your resume, so it's clear who did it.",
    example: {
      before: "I built the billing system",
      after: "Built the billing system used by 40 clients",
    },
  },
  tense: {
    why: "Jobs you've left read in past tense.",
    example: {
      before: "Build internal tools for the support team",
      after: "Built internal tools that saved support 5 hours a week",
    },
  },
  "too-long": {
    why: "Long lines get skimmed. One or two lines each is easier to read.",
    example: { before: null, after: "Cut deploy time 40% by moving builds to a shared cache" },
  },
  "too-short": {
    why: "A few words can't show what you did and what changed.",
    example: {
      before: "Fixed bugs",
      after: "Fixed 120 checkout bugs, cutting failed payments 18%",
    },
  },
  passive: {
    why: "Saying what you did makes your part clear.",
    example: {
      before: "The database was migrated to PostgreSQL",
      after: "Migrated the database to PostgreSQL in 3 weeks",
    },
  },
  vague: {
    why: "Words like various or several stand in for a real number or name.",
    example: {
      before: "Ran various webinars",
      after: "Ran 14 partner webinars that brought in 2,300 sign-ups",
    },
  },
  "stock-phrase": {
    why: "Phrases every resume has get skipped. A result says it better.",
    example: {
      before: "Results-driven team player",
      after: "Led a team of 4 that shipped the mobile app 2 weeks early",
    },
  },
  duplicate: {
    why: "A repeated line takes space another result could use.",
    example: null,
  },
  punctuation: {
    why: "Lines that end the same way look neat and careful.",
    example: null,
  },
};
