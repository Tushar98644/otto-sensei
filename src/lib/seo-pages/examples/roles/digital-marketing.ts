import type { RoleExample } from "../types";

export const digitalMarketing = {
  slug: "digital-marketing",
  role: "Digital marketing",
  occupation: "11-2021.00",
  titles: [
    "Digital Marketing Manager",
    "Digital Marketing Executive",
    "Performance Marketing Manager",
  ],
  updated: "2026-11-24",
  card: "Budget, channel and result together, for paid, search and email.",
  description:
    "A digital marketing resume example with SEO, ads and email lines that show spend, leads and return, plus the skills and tools marketing posts ask for.",
  intro:
    "Digital marketing is measured to the dollar, the click and the lead, so a resume without numbers stands out for the wrong reason. This example shows budget, channel and result in each line, the way a marketing head reads them.",
  person:
    "Rachel is made up: a digital marketer with 4 years in direct-to-consumer brands and edtech, working from Los Angeles. Names, companies and numbers are invented.",
  resume: {
    title: "Digital marketing resume",
    template: "classic",
    basics: {
      name: "Rachel Kim",
      headline: "Digital Marketing Manager",
      email: "rachel.kim@example.com",
      phone: "+1 213 555 0182",
      location: "Los Angeles, CA",
      links: [{ label: "Portfolio", url: "rachel-kim.example.com" }],
    },
    summary:
      "Digital marketer with 4 years running paid, search and email for consumer brands. Owns budgets, reports in plain numbers, and cuts what doesn't pay back.",
    experience: [
      {
        company: "Saffronbyte Skincare",
        title: "Digital Marketing Manager",
        location: "Los Angeles, CA",
        startDate: "Jan 2024",
        endDate: "Present",
        bullets: [
          "Ran Google Ads and Meta campaigns on a monthly budget of $21,000, raising return on ad spend from 2.1 to 3.4 in 9 months.",
          "Grew organic traffic from 40,000 to 110,000 visits a month with an SEO plan built on 60 product and how-to pages.",
          "Set up abandoned-cart emails in HubSpot that now recover 9% of carts, about 1,200 orders a month.",
          "Moved weekly reporting from screenshots to a Looker Studio dashboard, saving 4 hours of manual work each week.",
        ],
      },
      {
        company: "Larkspur Learning",
        title: "Digital Marketing Executive",
        location: "San Diego, CA",
        startDate: "Jun 2022",
        endDate: "Dec 2023",
        bullets: [
          "Cut cost per lead for course sign-ups from $4.80 to $3.00 by rebuilding landing pages and pausing 30 weak keywords.",
          "Planned 3 Instagram and YouTube creator campaigns that brought 14,000 free trial sign-ups.",
          "Wrote and tested 50 ad variants a month, keeping the top 10% for the next round.",
        ],
      },
    ],
    education: [
      {
        school: "Lakeside University",
        degree: "BBA",
        field: "Marketing",
        startDate: "2018",
        endDate: "2022",
      },
    ],
    skills: [
      {
        label: "Channels",
        items: ["SEO", "Google Ads", "Performance marketing", "Email marketing", "Social media"],
      },
      { label: "Tools", items: ["Google Analytics", "HubSpot", "Canva", "Excel"] },
    ],
    certifications: [{ name: "Google Ads Search Certification", issuer: "Google", date: "2024" }],
  },
  lines: [
    {
      weak: "Managed social media and paid campaigns.",
      strong:
        "Ran Google Ads and Meta campaigns on a monthly budget of $21,000, raising return on ad spend from 2.1 to 3.4 in 9 months.",
    },
    {
      weak: "Handled SEO for the company website.",
      strong:
        "Grew organic traffic from 40,000 to 110,000 visits a month with an SEO plan built on 60 product and how-to pages.",
    },
    {
      weak: "Responsible for email marketing.",
      strong:
        "Set up abandoned-cart emails in HubSpot that now recover 9% of carts, about 1,200 orders a month.",
    },
  ],
  skills: [
    {
      label: "Channels",
      items: [
        "SEO",
        "SEM",
        "Google Ads",
        "Performance marketing",
        "Email marketing",
        "Content marketing",
      ],
    },
    { label: "Analytics", items: ["Google Analytics", "A/B testing", "Excel", "Looker"] },
    { label: "Platforms", items: ["HubSpot", "Mailchimp", "WordPress", "Shopify", "Canva"] },
  ],
  tips: [
    {
      title: "Show budget and return together",
      text: "A spend figure alone sounds like a cost; a return alone sounds like luck. Together they show you can be trusted with money: budget, channel, result.",
    },
    {
      title: "Write money the way the employer reads it",
      text: "For jobs in India, lakh and rupees read naturally. For jobs abroad, convert to US dollars or the local currency, or use a percentage, so nobody has to do the maths.",
    },
    {
      title: "Name the tools in the post",
      text: "Google Ads, Meta, HubSpot, GA4: marketing posts name tools precisely, and so does Otto's match check. Say the tool inside the line where you used it.",
    },
  ],
  mistakes: [
    {
      title: "Vanity numbers",
      text: "Followers and impressions without leads, sales or cost read as filler. Pair reach with the result it led to.",
    },
    {
      title: "“Handled social media”",
      text: "Otto's line check flags weak openings like “Handled” because they hide what you did. Start with the action and end with the number.",
    },
    {
      title: "Every certificate you have",
      text: "Two or three current certificates from the platforms you use are enough. A long list of short courses pushes your results down the page.",
    },
  ],
  faq: [
    {
      question: "What should a digital marketing resume include?",
      answer:
        "The channels you ran, the budgets you managed, and a result for each: leads, sales, cost per lead or return on ad spend. Add the tools you used and two or three current certificates.",
    },
    {
      question: "How do I show results if I don't know the exact numbers?",
      answer:
        "Use what you can stand behind: a range, a percentage, or a before and after from your reports. Otto asks for the number when he fixes a line and never makes one up.",
    },
    {
      question: "Should I include a portfolio for digital marketing?",
      answer:
        "A short one helps: two or three campaigns with the goal, what you did and the result. Leave out anything your employer would not want shared.",
    },
  ],
  related: ["business-development", "data-analyst", "product-manager"],
} as const satisfies RoleExample;
