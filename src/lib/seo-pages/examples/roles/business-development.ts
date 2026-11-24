import type { RoleExample } from "../types";

export const businessDevelopment: RoleExample = {
  slug: "business-development",
  role: "Business development and sales",
  occupation: "41-4011.00",
  titles: [
    "Business Development Executive",
    "Business Development Manager",
    "Sales Executive",
    "Account Executive",
    "Inside Sales Representative",
  ],
  updated: "2026-11-24",
  card: "Quota, pipeline and deal size, the way sales managers read them.",
  description:
    "A business development and sales resume example with lines that show quota, pipeline and deal size, plus the CRM skills sales posts ask for and mistakes.",
  intro:
    "Sales is the easiest job to put in numbers and the most common place to leave them out. A sales manager wants your quota, how often you hit it, your deal size and how you found the deals. This example gives all four.",
  person:
    "Andre is made up: a business development manager with 5 years selling software to mid-size companies, based in Atlanta. Names, companies and numbers are invented.",
  resume: {
    title: "Business development resume",
    template: "compact",
    basics: {
      name: "Andre Mitchell",
      headline: "Business Development Manager",
      email: "andre.mitchell@example.com",
      phone: "+1 404 555 0128",
      location: "Atlanta, GA",
      links: [{ label: "Portfolio", url: "andre-mitchell.example.com" }],
    },
    summary:
      "Business development manager with 5 years selling HR and payroll software to companies with 50 to 1,000 staff. Builds pipeline from cold outreach and closes with finance and HR heads.",
    experience: [
      {
        company: "Wagewise HR",
        title: "Business Development Manager",
        location: "Atlanta, GA",
        startDate: "Apr 2023",
        endDate: "Present",
        bullets: [
          "Closed 128% of a yearly new-business quota in FY 2025, with 31 new accounts at an average deal of $10,500 a year.",
          "Sourced 60% of the pipeline through LinkedIn and cold calling, with 2 SDRs booking demos from a shared target list.",
          "Cut the sales cycle for mid-size deals from 74 to 52 days by adding a payroll trial with the customer's own data.",
          "Kept Salesforce notes and next steps current, so forecast calls moved from 45 minutes to 20.",
        ],
      },
      {
        company: "Fernway Logistics",
        title: "Business Development Executive",
        location: "Alpharetta, GA",
        startDate: "Jul 2020",
        endDate: "Mar 2023",
        bullets: [
          "Signed 22 new shipper accounts in 2022, bringing in $360,000 of yearly freight revenue.",
          "Made 60 calls a day to new shippers and converted 8% of first meetings into trials.",
          "Won back 9 lost accounts by offering a 30-day service review with their operations team.",
        ],
      },
    ],
    education: [
      {
        school: "Lakeside University",
        degree: "MBA",
        field: "Marketing",
        startDate: "2018",
        endDate: "2020",
      },
      {
        school: "Harborview University",
        degree: "B.S.",
        field: "Business Administration",
        startDate: "2014",
        endDate: "2018",
      },
    ],
    skills: [
      {
        label: "Sales",
        items: [
          "Business development",
          "Lead generation",
          "Cold calling",
          "Negotiation",
          "Account management",
        ],
      },
      { label: "Tools", items: ["Salesforce", "HubSpot", "LinkedIn Sales Navigator", "Excel"] },
    ],
  },
  lines: [
    {
      weak: "Generated leads and closed deals.",
      strong:
        "Closed 128% of a yearly new-business quota in FY 2025, with 31 new accounts at an average deal of $10,500 a year.",
    },
    {
      weak: "Excellent communication skills and a proven track record in sales.",
      strong:
        "Cut the sales cycle for mid-size deals from 74 to 52 days by adding a payroll trial with the customer's own data.",
    },
    {
      weak: "Made cold calls to potential clients.",
      strong: "Made 60 calls a day to new shippers and converted 8% of first meetings into trials.",
    },
  ],
  skills: [
    {
      label: "Selling",
      items: [
        "Business development",
        "Lead generation",
        "Cold calling",
        "Negotiation",
        "Account management",
      ],
    },
    { label: "Pipeline", items: ["Pipeline management", "CRM", "Salesforce", "HubSpot"] },
    { label: "Methods", items: ["MEDDICC", "Customer success", "Excel"] },
  ],
  tips: [
    {
      title: "Quota first, then how",
      text: "Percent of quota, the period, the number of deals and the average size. Then one or two lines on how you built the pipeline. That order matches how sales managers read.",
    },
    {
      title: "Write money for the market you're applying to",
      text: "Lakh and crore read naturally to Indian employers. For roles abroad, convert to US dollars or the local currency so the size of your deals is clear at a glance.",
    },
    {
      title: "Say who you sold to",
      text: "Company size, industry and the buyer's role. Selling to HR heads at 200-person firms is a different job from selling to procurement at a bank.",
    },
  ],
  mistakes: [
    {
      title: "Traits instead of results",
      text: "“Excellent communication skills” is a claim everyone makes. Otto's line check flags it as a stock phrase; a closed deal proves it.",
    },
    {
      title: "Revenue without a quota",
      text: "“Brought in 2 crore” could be great or below target. Give the quota or the rank on the team so the number has a scale.",
    },
    {
      title: "Hiding the hard parts",
      text: "Cold outreach, long cycles and lost deals won back are what interviewers ask about. Show you can find business, not only take it.",
    },
  ],
  faq: [
    {
      question: "What should a sales or business development resume show?",
      answer:
        "Quota attainment, deal count and size, sales cycle, and how you built pipeline. Add the CRM you used and the kind of customer you sold to.",
    },
    {
      question: "Should I show my targets in lakh or in dollars?",
      answer:
        "Use the currency the employer works in. Lakh and crore suit employers in India; for jobs abroad, convert to dollars or show percentages of quota.",
    },
    {
      question: "Can I include awards like top performer?",
      answer:
        "Yes, with the scale: “Top 3 of 40 account executives in 2024” says more than “Star performer”. Leave out awards you can't explain in one sentence.",
    },
  ],
  related: ["digital-marketing", "customer-support", "hr"],
};
