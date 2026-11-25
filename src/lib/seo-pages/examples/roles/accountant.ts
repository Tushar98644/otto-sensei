import type { RoleExample } from "../types";

export const accountant = {
  slug: "accountant",
  role: "Accountant",
  occupation: "13-2011.00",
  titles: ["Staff Accountant", "Senior Accountant", "General Ledger Accountant"],
  updated: "2026-11-24",
  card: "A faster, cleaner close: reconciliations, audits and the controls behind them.",
  description:
    "An accountant resume example with lines on month-end close, reconciliations and audits in numbers, plus the GAAP, ERP and Excel skills posts ask for.",
  intro:
    "Most accountant resumes list the same duties: journal entries, reconciliations, month-end close. What sets one apart is how well those went. This example measures the close in days, the reconciliations in accounts and dollars, and the audit in adjustments.",
  person:
    "Megan is made up: a CPA with 6 years, first in audit at a small firm and then at a manufacturer in Indianapolis. Names, companies and numbers are invented.",
  resume: {
    title: "Accountant resume",
    template: "minimal",
    basics: {
      name: "Megan Schultz",
      headline: "Senior Accountant, CPA",
      email: "megan.schultz@example.com",
      phone: "+1 317 555 0152",
      location: "Indianapolis, IN",
      links: [{ label: "LinkedIn", url: "linkedin.example.com/in/megan-schultz" }],
    },
    summary:
      "CPA with 6 years in audit and corporate accounting, now running the monthly close for a $240M manufacturer. Keeps reconciliations clean, audit files clear, and the close on its calendar.",
    experience: [
      {
        company: "Torvane Industrial",
        title: "Senior Accountant",
        location: "Indianapolis, IN",
        startDate: "Jan 2024",
        endDate: "Present",
        bullets: [
          "Cut the month-end close from 9 business days to 5 by moving 120 recurring journal entries into NetSuite templates and setting a daily close calendar.",
          "Reconciled 65 balance sheet accounts each month, clearing $410,000 of aged items that had sat unexplained for over a year.",
          "Led the year-end audit with an outside firm, delivering 180 requests on schedule with zero audit adjustments.",
          "Built an inventory costing model in Excel for 3 plants, finding $260,000 of overstated work in progress before the audit.",
        ],
      },
      {
        company: "Torvane Industrial",
        title: "Staff Accountant",
        location: "Indianapolis, IN",
        startDate: "Aug 2022",
        endDate: "Dec 2023",
        bullets: [
          "Booked fixed asset additions and depreciation for 1,400 assets, and fixed a lease schedule error under ASC 842 worth $95,000.",
          "Wrote step-by-step guides for 14 close tasks, so 2 new hires closed their accounts alone by their second month.",
        ],
      },
      {
        company: "Larkin & Hale CPAs",
        title: "Audit Associate",
        location: "Indianapolis, IN",
        startDate: "Sep 2019",
        endDate: "Jul 2022",
        bullets: [
          "Audited 11 manufacturing and nonprofit clients with revenue from $5M to $90M, testing revenue, inventory and payroll.",
          "Found a $70,000 duplicate vendor payment at a nonprofit client, which led to a new approval control for payments over $10,000.",
        ],
      },
    ],
    education: [
      {
        school: "Hollis Bay University",
        degree: "M.Acc.",
        field: "Accounting",
        startDate: "2018",
        endDate: "2019",
      },
      {
        school: "Hollis Bay University",
        degree: "B.S.",
        field: "Accounting",
        startDate: "2014",
        endDate: "2018",
      },
    ],
    skills: [
      {
        label: "Accounting",
        items: [
          "GAAP",
          "Month-end close",
          "Account reconciliation",
          "Journal entries",
          "Audit support",
          "ASC 842",
        ],
      },
      { label: "Systems", items: ["NetSuite", "Excel", "BlackLine", "QuickBooks"] },
    ],
    certifications: [
      {
        name: "Certified Public Accountant (CPA)",
        issuer: "Indiana Board of Accountancy",
        date: "2021",
      },
    ],
  },
  lines: [
    {
      weak: "Responsible for the month-end close.",
      strong:
        "Cut the month-end close from 9 business days to 5 by moving 120 recurring journal entries into NetSuite templates and setting a daily close calendar.",
    },
    {
      weak: "Performed account reconciliations.",
      strong:
        "Reconciled 65 balance sheet accounts each month, clearing $410,000 of aged items that had sat unexplained for over a year.",
    },
    {
      weak: "Assisted with the annual audit.",
      strong:
        "Led the year-end audit with an outside firm, delivering 180 requests on schedule with zero audit adjustments.",
    },
  ],
  skills: [
    { label: "Accounting", items: ["Accounting", "GAAP", "IFRS", "Auditing", "Payroll"] },
    { label: "Systems", items: ["NetSuite", "SAP", "QuickBooks", "Xero", "ERP"] },
    { label: "Spreadsheets and licenses", items: ["Excel", "Power Query", "CPA"] },
  ],
  tips: [
    {
      title: "Measure the close",
      text: "Days to close, accounts reconciled, entries automated. The close is the heartbeat of the job, so give it a before and after number.",
    },
    {
      title: "Name the standards and the system",
      text: "Say which GAAP topics you handled, such as ASC 606 revenue or ASC 842 leases, and the ERP you closed in. Posts often name both, and a match helps a recruiter place you.",
    },
    {
      title: "Put the CPA where it is seen",
      text: "Add CPA after your name or in the headline, and list the license with its state and year. If you are still sitting the exams, say which sections you have passed.",
    },
  ],
  mistakes: [
    {
      title: "Copying the job description",
      text: "“Prepared journal entries and reconciliations” is what the post already says. Add how many, how fast, and what you caught along the way.",
    },
    {
      title: "Leaving out audit results",
      text: "Audits are where an accountant's work gets graded. If yours came back with no adjustments, or fewer findings than the year before, say so with the numbers.",
    },
    {
      title: "Every package you have ever touched",
      text: "A long list of accounting software pushes the one that matters down the page. Lead with the ERP the post names, and keep older systems short or leave them off.",
    },
  ],
  faq: [
    {
      question: "What should an accountant resume include?",
      answer:
        "Your CPA status, the size of the books you kept, the close and reconciliation work you owned, audit results, and your ERP and Excel skills. Use numbers for days, accounts and dollars.",
    },
    {
      question: "Should I list the CPA exam sections I've passed?",
      answer:
        "Yes. Write “CPA candidate” with the sections passed, such as AUD and FAR, and the year, so recruiters see you are on the way. Once you are licensed, list the license instead.",
    },
    {
      question: "How do I move from public accounting into industry?",
      answer:
        "Keep the audit job and show the client work in numbers: how many clients, what size, what you tested. Then add any close, reconciliation or system work, so a controller sees you can run the books.",
    },
  ],
  related: ["financial-analyst", "business-analyst", "data-analyst"],
} as const satisfies RoleExample;
