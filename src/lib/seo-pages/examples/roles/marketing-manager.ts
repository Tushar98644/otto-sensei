import type { RoleExample } from "../types";

export const marketingManager = {
  slug: "marketing-manager",
  role: "Marketing manager",
  occupation: "11-2021.00",
  titles: [
    "Marketing Manager",
    "Product Marketing Manager",
    "Brand Manager",
    "Growth Marketing Manager",
  ],
  updated: "2026-11-24",
  card: "Launches, budget, team and the revenue they led to.",
  description:
    "A marketing manager resume example with launch, brand and pipeline lines that show budget, team size and revenue, plus the skills marketing leads look for.",
  intro:
    "A marketing manager is hired to set direction and own a number, not to run one channel. The resume has to show the plan, the budget, the people and the revenue it led to. This example ties each line to pipeline, sales or market share.",
  person:
    "Olivia is made up: a marketing manager with 7 years in business software and packaged food, based in Portland, Oregon. Names, companies and numbers are invented.",
  resume: {
    title: "Marketing manager resume",
    template: "executive",
    basics: {
      name: "Olivia Bennett",
      headline: "Marketing Manager",
      email: "olivia.bennett@example.com",
      phone: "+1 503 555 0193",
      location: "Portland, OR",
      links: [{ label: "LinkedIn", url: "linkedin.example.com/in/olivia-bennett" }],
    },
    summary:
      "Marketing manager with 7 years in business software and consumer goods. Leads a team of 5, owns a $1.8M yearly budget, and plans launches and messaging around pipeline and revenue targets.",
    experience: [
      {
        company: "Cedarline Software",
        title: "Senior Marketing Manager",
        location: "Portland, OR",
        startDate: "Mar 2023",
        endDate: "Present",
        bullets: [
          "Led the launch of a new invoicing product across email, events and paid search, generating $3.1M in qualified pipeline in its first 2 quarters.",
          "Managed a team of 5 and a $1.8M yearly budget, moving 30% of spend from trade shows to webinars and lowering cost per opportunity by 42%.",
          "Rewrote positioning and website messaging from 40 customer interviews, raising demo request conversion from 1.6% to 2.9%.",
          "Built a lead scoring program in Marketo that sends sales 300 qualified leads a month, 24% of which become opportunities.",
        ],
      },
      {
        company: "Harbor and Pine Foods",
        title: "Brand Manager",
        location: "Seattle, WA",
        startDate: "Jun 2019",
        endDate: "Feb 2023",
        bullets: [
          "Ran the relaunch of a snack brand in 1,200 grocery stores, growing its market share from 3.8% to 5.5% in 18 months.",
          "Planned a $650,000 yearly media budget across TV, social media and in-store displays, reporting return by channel each month.",
          "Used a market research survey of 2,000 shoppers to drop 3 weak flavors and add 2 new ones, lifting sales per store by 17%.",
        ],
      },
    ],
    education: [
      {
        school: "Cascade Pacific University",
        degree: "MBA",
        field: "Marketing",
        startDate: "2017",
        endDate: "2019",
      },
    ],
    skills: [
      {
        label: "Marketing",
        items: ["Market research", "Content marketing", "Email marketing", "Marketing automation"],
      },
      { label: "Tools", items: ["Marketo", "Salesforce", "Google Analytics", "Tableau"] },
      { label: "Leadership", items: ["Team leadership", "Budgeting", "Stakeholder management"] },
    ],
  },
  lines: [
    {
      weak: "Responsible for product launches and go-to-market.",
      strong:
        "Led the launch of a new invoicing product across email, events and paid search, generating $3.1M in qualified pipeline in its first 2 quarters.",
    },
    {
      weak: "Managed a team and a large marketing budget.",
      strong:
        "Managed a team of 5 and a $1.8M yearly budget, moving 30% of spend from trade shows to webinars and lowering cost per opportunity by 42%.",
    },
    {
      weak: "Helped improve the company's messaging.",
      strong:
        "Rewrote positioning and website messaging from 40 customer interviews, raising demo request conversion from 1.6% to 2.9%.",
    },
  ],
  skills: [
    {
      label: "Strategy and content",
      items: [
        "Market research",
        "Content marketing",
        "Email marketing",
        "Public relations",
        "Copywriting",
        "SEO",
      ],
    },
    {
      label: "Tools and data",
      items: ["HubSpot", "Marketo", "Salesforce", "Google Analytics", "A/B testing", "Tableau"],
    },
    {
      label: "Running the team",
      items: [
        "Team leadership",
        "Budgeting",
        "Project management",
        "Stakeholder management",
        "Vendor management",
      ],
    },
  ],
  tips: [
    {
      title: "Tie marketing to pipeline or sales",
      text: "Leads and clicks matter to your team; pipeline, revenue and market share matter to the person hiring you. End your biggest lines on the number the business reports.",
    },
    {
      title: "Show the size of what you ran",
      text: "A team of 5 with a $1.8M budget is a different job from a solo role with $50,000. Give the team and the budget once, near the top, so every result after it has scale.",
    },
    {
      title: "Name the calls you made",
      text: "Moving spend between channels, dropping a product line, changing the message: managers are hired for decisions. Say what you changed and what happened next.",
    },
  ],
  mistakes: [
    {
      title: "Reading like a channel specialist",
      text: "If every line is about one channel, readers see a specialist, not a manager. Show at least one plan that spanned channels, people and budget.",
    },
    {
      title: "Brand words with no business result",
      text: "“Elevated the brand” and “drove awareness” can't be checked. Use the survey lift, the change in share or the sales that followed.",
    },
    {
      title: "Leaving the team out",
      text: "Hiring, coaching and briefing agencies are half of a manager's job. A line about the people you led shows you can run a team, not only a campaign.",
    },
  ],
  faq: [
    {
      question: "What should a marketing manager resume include?",
      answer:
        "The products or brands you marketed, the size of your budget and team, and results in pipeline, revenue, market share or cost. Add the tools your team ran on, and keep older junior roles to two lines each.",
    },
    {
      question: "How is a marketing manager resume different from a digital marketing resume?",
      answer:
        "A digital marketing resume shows hands-on channel work, ad by ad. A manager's resume shows plans across channels, the budget, the team and the business result, with less detail on each campaign.",
    },
    {
      question: "Should I put my MBA on a marketing manager resume?",
      answer:
        "Yes, under education with the school and year. It carries the most weight early in a management career; after a few years in the job, your results matter more than the degree.",
    },
  ],
  related: ["digital-marketing", "product-manager", "account-executive"],
} as const satisfies RoleExample;
