import type { RoleExample } from "../types";

export const operationsManager: RoleExample = {
  slug: "operations-manager",
  role: "Operations manager",
  occupation: "11-1021.00",
  titles: ["Director of Operations", "General Manager", "Regional Operations Manager"],
  updated: "2026-11-24",
  card: "Cost, quality and speed across a whole operation, and the team that runs it.",
  description:
    "An operations manager resume example with lines on cost, staffing, service levels and P&L, plus the Lean, budgeting and leadership skills posts ask for.",
  intro:
    "An operations manager is hired to make a business run better and cheaper without breaking it. The resume should show the size of what you ran, the numbers you moved, and the team that moved them with you. This example does that for a home services company.",
  person:
    "Carlos is made up: an operations manager with 9 years in grocery retail and home services in Nashville, now running a team of 140. Names, companies and numbers are invented.",
  resume: {
    title: "Operations manager resume",
    template: "executive",
    basics: {
      name: "Carlos Mendoza",
      headline: "Operations Manager",
      email: "carlos.mendoza@example.com",
      phone: "+1 615 555 0167",
      location: "Nashville, TN",
      links: [{ label: "LinkedIn", url: "linkedin.example.com/in/carlos-mendoza" }],
    },
    summary:
      "Operations manager with 9 years running service and retail teams of up to 210 people. Owns an $18M P&L, and improves scheduling, quality and cost with Lean methods and a few daily metrics.",
    experience: [
      {
        company: "Tidewater Home Services",
        title: "Operations Manager",
        location: "Nashville, TN",
        startDate: "May 2022",
        endDate: "Present",
        bullets: [
          "Led daily operations for 140 HVAC and plumbing technicians across 3 branches, with an $18M P&L and 9 direct reports.",
          "Raised first-visit fix rate from 71% to 84% by stocking trucks from a parts list built on 2 years of job data.",
          "Moved dispatch from whiteboards to ServiceTitan, cutting the average customer wait from 2.4 days to 1.1.",
          "Cut overtime spend by $420,000 a year by matching shift schedules to call volume by hour.",
          "Reduced technician turnover from 38% to 24% with a ride-along training program and a clear pay ladder.",
        ],
      },
      {
        company: "Fieldstone Grocers",
        title: "Store Operations Manager",
        location: "Nashville, TN",
        startDate: "Mar 2018",
        endDate: "Apr 2022",
        bullets: [
          "Ran operations for 2 grocery stores with $46M in yearly sales and 210 staff, finishing 2021 at 104% of the profit plan.",
          "Brought shrink from 3.1% to 2.2% of sales through Lean daily huddles, cycle counts and a fresh-food markdown schedule.",
          "Opened a third store in 10 weeks, hiring and training 85 staff with a 30-day checklist later used for 4 more openings.",
        ],
      },
      {
        company: "Fieldstone Grocers",
        title: "Assistant Store Manager",
        location: "Knoxville, TN",
        startDate: "Jun 2015",
        endDate: "Feb 2018",
        bullets: [
          "Managed inventory and ordering for $9M in yearly grocery sales, keeping out-of-stocks under 2%.",
        ],
      },
    ],
    education: [
      {
        school: "Elmwood State University",
        degree: "B.S.",
        field: "Business Management",
        startDate: "2011",
        endDate: "2015",
      },
    ],
    skills: [
      {
        label: "Operations",
        items: [
          "P&L management",
          "Lean",
          "Six Sigma",
          "Scheduling",
          "Inventory management",
          "Vendor management",
        ],
      },
      { label: "Tools", items: ["ServiceTitan", "Excel", "Power BI", "Google Workspace"] },
    ],
    certifications: [{ name: "Certified Six Sigma Green Belt", issuer: "ASQ", date: "2020" }],
  },
  lines: [
    {
      weak: "Oversaw day-to-day operations.",
      strong:
        "Led daily operations for 140 HVAC and plumbing technicians across 3 branches, with an $18M P&L and 9 direct reports.",
    },
    {
      weak: "Helped reduce costs and improve efficiency.",
      strong:
        "Cut overtime spend by $420,000 a year by matching shift schedules to call volume by hour.",
    },
    {
      weak: "Managed a team and handled staffing issues.",
      strong:
        "Reduced technician turnover from 38% to 24% with a ride-along training program and a clear pay ladder.",
    },
  ],
  skills: [
    {
      label: "Running the operation",
      items: [
        "P&L",
        "Budgeting",
        "Forecasting",
        "Inventory management",
        "Vendor management",
        "Procurement",
      ],
    },
    {
      label: "Improvement",
      items: ["Lean", "Six Sigma", "Kaizen", "Root cause analysis", "Quality control"],
    },
    {
      label: "People and tools",
      items: ["Team leadership", "Performance management", "Excel", "Power BI", "ERP"],
    },
  ],
  tips: [
    {
      title: "Lead with the size of the operation",
      text: "People, sites, revenue or P&L, and budget. One opening line with these tells the reader your level before they read anything else.",
    },
    {
      title: "Pick the 3 numbers your boss watched",
      text: "Cost per job, on-time rate, turnover, shrink, safety incidents. Choose the few your business ran on and show each one moving, with what you changed to move it.",
    },
    {
      title: "Show the people side",
      text: "Operations runs through people. A line about cutting turnover, building a training plan or growing a supervisor into a manager shows you can lead, not only measure.",
    },
  ],
  mistakes: [
    {
      title: "“Oversaw day-to-day operations”",
      text: "It describes the chair, not what you did in it. Replace it with the size of the operation and one number you improved.",
    },
    {
      title: "Results with no lever",
      text: "“Cut costs by 15%” leaves the reader guessing whether you renegotiated, automated or cut staff. Add the method in a few words.",
    },
    {
      title: "Industry terms with no translation",
      text: "First-visit fix rate and shrink are plain words inside your industry. If you are moving to another one, add a few words so a recruiter from outside can follow.",
    },
  ],
  faq: [
    {
      question: "What should an operations manager resume include?",
      answer:
        "The size of what you ran (people, sites, revenue or P&L), the metrics you improved with before and after numbers, the methods you used, such as Lean, and how you built the team.",
    },
    {
      question: "How do I show P&L responsibility on my resume?",
      answer:
        "Give the dollar size and say what you owned in it: revenue, labor, materials or all of it. Then show one result against plan, such as finishing the year at 104% of the profit target.",
    },
    {
      question: "Is a Six Sigma certification worth listing on an operations resume?",
      answer:
        "Yes, if the post mentions Lean or Six Sigma, or the work is process-heavy. List the belt, the issuer and the year, and show one project where you used it.",
    },
  ],
  related: ["project-manager", "business-analyst", "hr"],
};
