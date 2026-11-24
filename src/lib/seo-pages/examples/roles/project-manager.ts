import type { RoleExample } from "../types";

export const projectManager: RoleExample = {
  slug: "project-manager",
  role: "Project manager",
  occupation: "13-1082.00",
  titles: ["Senior Project Manager", "Project Coordinator", "Program Manager", "Project Lead"],
  updated: "2026-11-24",
  card: "Projects landed on time and on budget, with the scope, team and risks behind them.",
  description:
    "A project manager resume example with lines that show scope, budget, schedule and team size, plus the PMP and Agile skills to list, tips and mistakes.",
  intro:
    "Hiring managers read a project manager resume with three questions in mind: how big were the projects, did they land on time and on budget, and what did you do when one slipped. This example answers all three in every job.",
  person:
    "Nicole is made up: a PMP-certified project manager with 7 years running software rollouts and office moves for a health care network in Chicago. Names, companies and numbers are invented.",
  resume: {
    title: "Project manager resume",
    template: "modern",
    basics: {
      name: "Nicole Foster",
      headline: "Project Manager, PMP",
      email: "nicole.foster@example.com",
      phone: "+1 312 555 0119",
      location: "Chicago, IL",
      links: [{ label: "LinkedIn", url: "linkedin.example.com/in/nicole-foster" }],
    },
    summary:
      "Project manager with 7 years leading software rollouts, clinic openings and office moves for a health care network. Plans in detail, reports risks early, and keeps budgets of up to $4M on track.",
    experience: [
      {
        company: "Corlane Health",
        title: "Senior Project Manager",
        location: "Chicago, IL",
        startDate: "Mar 2023",
        endDate: "Present",
        bullets: [
          "Led the rollout of a new patient scheduling system to 42 clinics in 14 months, finishing 3 weeks early and $180,000 under a $2.6M budget.",
          "Ran a team of 11 from IT, clinic operations and the vendor, with a weekly risk log that caught 2 data migration problems before go-live.",
          "Cut patient no-shows from 14% to 9% by adding text reminders to the rollout scope after a 6-clinic pilot.",
          "Set up a project intake process in Jira and Confluence that ranks 60 requests a year by cost and value, so leaders approve work in one meeting.",
        ],
      },
      {
        company: "Corlane Health",
        title: "Project Manager",
        location: "Chicago, IL",
        startDate: "Jun 2020",
        endDate: "Feb 2023",
        bullets: [
          "Managed the move of 380 staff to a new headquarters over 2 weekends, with no lost workdays and every desk working on Monday morning.",
          "Delivered 3 clinic openings on schedule by building one shared plan for construction, hiring and equipment, later reused for 5 more sites.",
        ],
      },
      {
        company: "Harrow & Finch Engineering",
        title: "Project Coordinator",
        location: "Milwaukee, WI",
        startDate: "Jul 2018",
        endDate: "May 2020",
        bullets: [
          "Tracked schedules and budgets for 9 building projects worth $22M in total, sending a weekly status report to clients and site leads.",
          "Built a change-order log in Excel that cut approval time from 12 days to 5.",
        ],
      },
    ],
    education: [
      {
        school: "Pinecrest State University",
        degree: "B.A.",
        field: "Business Administration",
        startDate: "2014",
        endDate: "2018",
      },
    ],
    skills: [
      {
        label: "Project management",
        items: [
          "Project management",
          "Risk management",
          "Budgeting",
          "Stakeholder management",
          "Vendor management",
          "Change management",
        ],
      },
      {
        label: "Methods and tools",
        items: ["Agile", "Scrum", "Jira", "Confluence", "Smartsheet", "Microsoft Project", "Excel"],
      },
    ],
    certifications: [
      {
        name: "Project Management Professional (PMP)",
        issuer: "Project Management Institute",
        date: "2021",
      },
      { name: "Certified ScrumMaster (CSM)", issuer: "Scrum Alliance", date: "2022" },
    ],
  },
  lines: [
    {
      weak: "In charge of project planning and execution.",
      strong:
        "Led the rollout of a new patient scheduling system to 42 clinics in 14 months, finishing 3 weeks early and $180,000 under a $2.6M budget.",
    },
    {
      weak: "Worked with stakeholders to keep projects on track.",
      strong:
        "Ran a team of 11 from IT, clinic operations and the vendor, with a weekly risk log that caught 2 data migration problems before go-live.",
    },
    {
      weak: "Managed multiple projects at the same time.",
      strong:
        "Tracked schedules and budgets for 9 building projects worth $22M in total, sending a weekly status report to clients and site leads.",
    },
  ],
  skills: [
    {
      label: "Delivery",
      items: [
        "Project management",
        "Risk management",
        "Budgeting",
        "Stakeholder management",
        "Vendor management",
        "Change management",
      ],
    },
    { label: "Methods", items: ["Agile", "Scrum", "Kanban", "PMP"] },
    { label: "Tools", items: ["Jira", "Confluence", "Asana", "Trello", "Excel"] },
  ],
  tips: [
    {
      title: "Give every project a size",
      text: "Budget, team size, number of sites or users, and how long it ran. A reader can't tell a $50,000 project from a $5M one unless you say so, and the size sets your level.",
    },
    {
      title: "Show what happened when it went wrong",
      text: "Every project hits a problem. One line about a risk you caught early or a slip you recovered from tells a hiring manager more than any claim about being organized.",
    },
    {
      title: "Match the method to the post",
      text: "If the post asks for Agile, show a project run in sprints. If it asks for PMP or waterfall, show phases, sign-offs and change control. Lead with the one they want.",
    },
  ],
  mistakes: [
    {
      title: "“Managed projects from start to finish”",
      text: "That is the definition of the job, not a result. Replace it with one project, its size, and whether it landed on time and on budget.",
    },
    {
      title: "Every tool you have ever opened",
      text: "Jira, Asana, Trello, Monday, Smartsheet and Wrike in one list reads as filler. Name the two or three you ran real projects in, and show them in a line.",
    },
    {
      title: "Hiding the PMP",
      text: "If you hold the PMP or CSM, put it in your headline and again under certifications with the year. US posts often list it as required, and recruiters search for it.",
    },
  ],
  faq: [
    {
      question: "Should I put PMP on my project manager resume?",
      answer:
        "Yes, if you hold it: in your headline and in a certifications section with the year. If you are still studying, write that your PMP exam is scheduled and give the month, rather than implying you have it.",
    },
    {
      question: "How do I show project management experience without the title?",
      answer:
        "Keep your real title and write lines about the projects you ran inside it: scope, budget, team and outcome. Coordinators, engineers and analysts often lead projects without the title.",
    },
    {
      question: "What numbers belong on a project manager resume?",
      answer:
        "Budget, team size, planned against actual dates, cost against budget, and the result the project was for, such as fewer patient no-shows or a faster approval.",
    },
    {
      question: "Is a program manager resume different from a project manager resume?",
      answer:
        "A program manager runs a group of related projects toward one goal, so the resume shows the portfolio: how many projects, the combined budget and the goal they served. A project manager shows each project in more detail.",
    },
  ],
  related: ["product-manager", "operations-manager", "business-analyst"],
};
