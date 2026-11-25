import type { RoleExample } from "../types";

export const accountExecutive = {
  slug: "account-executive",
  role: "Account executive",
  occupation: "41-4011.00",
  titles: [
    "Account Executive",
    "Enterprise Account Executive",
    "Account Manager",
    "Sales Executive",
  ],
  updated: "2026-11-24",
  card: "Quota, win rate, deal size and sales cycle for software deals.",
  description:
    "An account executive resume example with SaaS sales lines that show quota, win rate, deal size and cycle length, plus the CRM skills AE posts ask for.",
  intro:
    "An account executive is hired to close, so a sales leader reads for quota and attainment first. Deal size, win rate and cycle length come next, because they show how you close. This example puts all of them where a reader finds them in seconds.",
  person:
    "Megan is made up: an account executive with 5 years selling finance and analytics software, based in Chicago. Names, companies and numbers are invented.",
  resume: {
    title: "Account executive resume",
    template: "compact",
    basics: {
      name: "Megan Clarke",
      headline: "Enterprise Account Executive",
      email: "megan.clarke@example.com",
      phone: "+1 312 555 0176",
      location: "Chicago, IL",
      links: [{ label: "LinkedIn", url: "linkedin.example.com/in/megan-clarke" }],
    },
    summary:
      "Account executive with 5 years selling software to mid-market and enterprise finance teams. Closed $2.4M in new annual revenue last year at 120% of quota, running deals from first call to signed contract.",
    experience: [
      {
        company: "Northpeak Analytics",
        title: "Enterprise Account Executive",
        location: "Chicago, IL",
        startDate: "Jan 2023",
        endDate: "Present",
        bullets: [
          "Closed $2.4M in new annual recurring revenue in 2025 against a $2.0M quota, finishing 2nd of 14 account executives.",
          "Raised the win rate on qualified opportunities from 22% to 31% by running MEDDICC reviews on every deal over $50,000.",
          "Shortened the average sales cycle from 120 days to 84 by bringing security and legal reviews into the first month.",
          "Sourced 40% of pipeline through cold calling and LinkedIn outreach, booking about 25 first meetings a month.",
        ],
      },
      {
        company: "Ledgerly",
        title: "Account Executive, Mid-Market",
        location: "Chicago, IL",
        startDate: "Jul 2020",
        endDate: "Dec 2022",
        bullets: [
          "Exceeded quota in 8 of 10 quarters, averaging 112% attainment on a $780,000 yearly target.",
          "Grew average deal size from $18,000 to $29,000 by pitching the payroll add-on in every first demo.",
          "Kept the quarterly forecast in Salesforce within 10% of actual bookings for 8 straight quarters.",
        ],
      },
    ],
    education: [
      {
        school: "Midland Lakes University",
        degree: "B.A.",
        field: "Communication",
        startDate: "2016",
        endDate: "2020",
      },
    ],
    skills: [
      {
        label: "Selling",
        items: ["Negotiation", "Pipeline management", "Forecasting", "Cold calling", "MEDDICC"],
      },
      { label: "Tools", items: ["Salesforce", "Gong", "Salesloft", "HubSpot", "Excel"] },
    ],
  },
  lines: [
    {
      weak: "Consistently met and exceeded sales targets.",
      strong:
        "Exceeded quota in 8 of 10 quarters, averaging 112% attainment on a $780,000 yearly target.",
    },
    {
      weak: "Handled enterprise deals from start to finish.",
      strong:
        "Closed $2.4M in new annual recurring revenue in 2025 against a $2.0M quota, finishing 2nd of 14 account executives.",
    },
    {
      weak: "Was part of a team that improved win rates.",
      strong:
        "Raised the win rate on qualified opportunities from 22% to 31% by running MEDDICC reviews on every deal over $50,000.",
    },
  ],
  skills: [
    {
      label: "Selling",
      items: [
        "Negotiation",
        "Pipeline management",
        "Forecasting",
        "Cold calling",
        "Lead generation",
        "Account management",
      ],
    },
    {
      label: "Deals and accounts",
      items: ["MEDDICC", "Stakeholder management", "Business development", "Customer success"],
    },
    { label: "Sales tools", items: ["Salesforce", "HubSpot", "Gong", "Salesloft", "CRM", "Excel"] },
  ],
  tips: [
    {
      title: "Put quota and result in one line",
      text: "“$2.4M against a $2.0M quota” lets a sales leader work out attainment and the size of your number at a glance. A percentage on its own hides how big the target was.",
    },
    {
      title: "Show your deal size and cycle",
      text: "Selling $8,000 deals in two weeks and $200,000 deals over six months are different jobs. Give both numbers so the hiring manager knows which kind of selling you know.",
    },
    {
      title: "Say how much pipeline you sourced",
      text: "Most AE roles expect you to find part of your own pipeline. A line on outbound meetings booked or pipeline created shows you don't wait for marketing to send leads.",
    },
  ],
  mistakes: [
    {
      title: "An award with no numbers",
      text: "President's Club tells a reader you did well; the quota and attainment behind it tell them how well. Keep the award, and put the numbers on the same line.",
    },
    {
      title: "A rank without the field",
      text: "“Top rep” means more when the reader knows it was 2nd of 14. Give the size of the team you were ranked against, and the period.",
    },
    {
      title: "Every feature you demoed",
      text: "Product features belong in the sales deck. The resume needs who bought, how much they paid and what made them sign.",
    },
  ],
  faq: [
    {
      question: "What should an account executive resume include?",
      answer:
        "Quota and attainment for each year, average deal size, sales cycle, win rate, the segment you sold to and the CRM you used. Sales leaders want two or three years of numbers, not one good quarter.",
    },
    {
      question: "How do I go from SDR to account executive on my resume?",
      answer:
        "Lead with the numbers that predict closing: meetings booked, pipeline created and how much of it turned into revenue. Add any deals you ran yourself, even small ones, and show the promotion if you had one.",
    },
    {
      question: "Should I show my quota if I missed it?",
      answer:
        "Yes, with the context that makes it fair: a new territory, a ramp period or a market that shrank. Leaving the quota out makes readers assume the worst, and they will ask in the interview anyway.",
    },
  ],
  related: ["business-development", "customer-support", "marketing-manager"],
} as const satisfies RoleExample;
