import type { RoleExample } from "../types";

export const productManager: RoleExample = {
  slug: "product-manager",
  role: "Product manager",
  occupation: "11-X101.00",
  titles: ["Associate Product Manager", "Product Owner", "Senior Product Manager"],
  updated: "2026-11-24",
  card: "Outcomes first, with the research and experiments behind them.",
  description:
    "A product manager resume example with lines that show the outcome, how you found it and who you led, plus the skills product posts ask for and mistakes.",
  intro:
    "A product manager doesn't write the code or draw the screens, so the resume has to show what changed because of their decisions. This example leads each line with an outcome and backs it with how the team got there.",
  person:
    "David is made up: a product manager with 6 years, moving from engineering into product at a travel company in Seattle. Names, companies and numbers are invented.",
  resume: {
    title: "Product manager resume",
    template: "executive",
    basics: {
      name: "David Kowalski",
      headline: "Product Manager",
      email: "david.kowalski@example.com",
      phone: "+1 206 555 0158",
      location: "Seattle, WA",
      links: [{ label: "Portfolio", url: "david-kowalski.example.com" }],
    },
    summary:
      "Product manager with 3 years in product and 3 in engineering, working on booking and payments for a travel app. Ships small, measures honestly, and writes things down.",
    experience: [
      {
        company: "Kiteway Travel",
        title: "Product Manager",
        location: "Seattle, WA",
        startDate: "Jun 2023",
        endDate: "Present",
        bullets: [
          "Led a team of 7 to rebuild hotel checkout, lifting booking completion from 61% to 70% in two quarters.",
          "Found through 30 user interviews that people dropped off at the business invoice step, and cut it to one optional field.",
          "Set up weekly product reviews in Amplitude with design and engineering, so a broken funnel step shows up within 7 days instead of 30.",
          "Wrote the roadmap for split payments with Apple Pay and cards, launched to 2 million users with a 0.2% failure rate.",
        ],
      },
      {
        company: "Kiteway Travel",
        title: "Associate Product Manager",
        location: "Seattle, WA",
        startDate: "Jan 2023",
        endDate: "May 2023",
        bullets: [
          "Ran 12 A/B tests on search filters in 5 months, keeping the 3 that raised searches per session.",
        ],
      },
      {
        company: "Skyquill",
        title: "Software Engineer",
        location: "Portland, OR",
        startDate: "Jul 2019",
        endDate: "Dec 2022",
        bullets: [
          "Built the booking APIs for a bus ticketing app that handled 40,000 bookings a day at peak.",
          "Moved into product work by writing specs for 2 features, which led to the move to an APM role.",
        ],
      },
    ],
    education: [
      {
        school: "Oakmont State University",
        degree: "B.S.",
        field: "Electrical and Computer Engineering",
        startDate: "2015",
        endDate: "2019",
      },
    ],
    skills: [
      {
        label: "Product",
        items: ["Product management", "Roadmapping", "User research", "A/B testing", "Agile"],
      },
      { label: "Tools", items: ["Jira", "Amplitude", "SQL", "Figma", "Confluence"] },
    ],
  },
  lines: [
    {
      weak: "Managed the checkout product roadmap.",
      strong:
        "Led a team of 7 to rebuild hotel checkout, lifting booking completion from 61% to 70% in two quarters.",
    },
    {
      weak: "Conducted user research.",
      strong:
        "Found through 30 user interviews that people dropped off at the business invoice step, and cut it to one optional field.",
    },
    {
      weak: "Collaborated with cross-functional teams to deliver features.",
      strong:
        "Wrote the roadmap for split payments with Apple Pay and cards, launched to 2 million users with a 0.2% failure rate.",
    },
  ],
  skills: [
    {
      label: "Product work",
      items: [
        "Product management",
        "Roadmapping",
        "User research",
        "A/B testing",
        "Stakeholder management",
      ],
    },
    { label: "Ways of working", items: ["Agile", "Scrum", "Jira", "Confluence"] },
    { label: "Data and design", items: ["SQL", "Amplitude", "Mixpanel", "Figma"] },
  ],
  tips: [
    {
      title: "Lead with the outcome",
      text: "Conversion, retention, revenue, time saved, support tickets avoided. Pick the number the business tracked and put it first, then say how the team moved it.",
    },
    {
      title: "Show how you decided",
      text: "One line about interviews, an experiment or a data pull shows you make choices from evidence. Hiring managers look for it in every product interview.",
    },
    {
      title: "Make a switch into product visible",
      text: "If you came from engineering, design or support, keep that job and add a line about the product work you did there. It is a strength, not a gap.",
    },
  ],
  mistakes: [
    {
      title: "“Collaborated with cross-functional teams”",
      text: "Every product manager does this, so it says nothing. Name what the team shipped and what changed.",
    },
    {
      title: "Taking credit for the whole company",
      text: "If revenue grew 40% while you owned one feature, say what your feature did. Interviewers check, and an honest smaller number holds up.",
    },
    {
      title: "Only feature names",
      text: "“Launched Smart Filters” means nothing outside the company. Say what it did for users in a few plain words.",
    },
  ],
  faq: [
    {
      question: "How do I write a product manager resume with no PM title?",
      answer:
        "Keep your real titles and show the product work inside them: specs you wrote, research you ran, launches you led. A short summary line can say you are moving into product.",
    },
    {
      question: "Should a product manager resume be one page?",
      answer:
        "One page up to about 5 years, two pages after that if the second page has real outcomes. Cut old jobs to one or two lines rather than shrinking the font.",
    },
    {
      question: "Which metrics should a product manager put on a resume?",
      answer:
        "The ones your team tracked: conversion, activation, retention, revenue or cost. Give the before and after, and the time it took.",
    },
  ],
  related: ["ui-ux-designer", "data-analyst", "software-engineer"],
};
