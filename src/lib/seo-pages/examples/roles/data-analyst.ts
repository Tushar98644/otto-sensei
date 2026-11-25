import type { RoleExample } from "../types";

export const dataAnalyst = {
  slug: "data-analyst",
  role: "Data analyst",
  occupation: "15-2051.01",
  titles: ["Business Intelligence Analyst", "BI Analyst", "Reporting Analyst"],
  updated: "2026-11-24",
  card: "SQL, Python and Power BI work that ends in a decision someone made.",
  description:
    "A data analyst resume example with SQL, Excel and Power BI lines that show the decision each analysis changed, plus the skills posts ask for and tips.",
  intro:
    "Every data analyst knows SQL and a dashboard tool, so that alone won't set you apart. What does is the decision your work changed: a price, a budget, a process. This example ends each line with one.",
  person:
    "Emily is made up: a data analyst with 3 years in retail and food delivery in Houston. Names, companies and numbers are invented.",
  resume: {
    title: "Data analyst resume",
    template: "classic",
    basics: {
      name: "Emily Nguyen",
      headline: "Data Analyst",
      email: "emily.nguyen@example.com",
      phone: "+1 713 555 0147",
      location: "Houston, TX",
      links: [{ label: "Portfolio", url: "emily-nguyen.example.com" }],
    },
    summary:
      "Data analyst with 3 years turning sales and delivery data into decisions for operations and marketing teams. Works mostly in SQL, Python and Power BI.",
    experience: [
      {
        company: "Zestly Foods",
        title: "Data Analyst",
        location: "Houston, TX",
        startDate: "May 2024",
        endDate: "Present",
        bullets: [
          "Built a Power BI dashboard of delivery times by area that 30 city managers use in their weekly review.",
          "Found that 18% of late orders came from 4 kitchens with one shared driver pool, which led to a staffing change that cut late orders by a third.",
          "Wrote SQL models in BigQuery for daily order metrics, replacing 12 manual Excel reports and saving the team 10 hours a week.",
          "Ran an A/B test on delivery-fee messaging across 200,000 orders, which kept a change that raised repeat orders by 4%.",
        ],
      },
      {
        company: "Juniper Lane Apparel",
        title: "MIS Analyst",
        location: "Houston, TX",
        startDate: "Jun 2022",
        endDate: "Apr 2024",
        bullets: [
          "Automated the weekly stock report with Python and Pandas, cutting it from 6 hours of copy-paste to 15 minutes.",
          "Built an Excel model of store-level sell-through that moved slow stock between 45 stores before the end-of-season sale.",
        ],
      },
    ],
    projects: [
      {
        name: "City rainfall and orders",
        tech: "Python, Tableau",
        link: "emily-nguyen.example.com/rain",
        bullets: [
          "Joined public rainfall data with 2 years of orders to show how rain shifts demand by hour, published as a Tableau story.",
        ],
      },
    ],
    education: [
      {
        school: "Cedar Ridge University",
        degree: "B.S.",
        field: "Statistics",
        startDate: "2018",
        endDate: "2022",
      },
    ],
    skills: [
      {
        label: "Analysis",
        items: ["SQL", "Python", "Pandas", "Excel", "Statistics", "A/B testing"],
      },
      { label: "BI tools", items: ["Power BI", "Tableau", "BigQuery", "Google Sheets"] },
    ],
    certifications: [
      {
        name: "Microsoft Certified: Power BI Data Analyst Associate",
        issuer: "Microsoft",
        date: "2024",
      },
    ],
  },
  lines: [
    {
      weak: "Created dashboards and reports for management.",
      strong:
        "Built a Power BI dashboard of delivery times by area that 30 city managers use in their weekly review.",
    },
    {
      weak: "Analyzed data to find insights.",
      strong:
        "Found that 18% of late orders came from 4 kitchens with one shared driver pool, which led to a staffing change that cut late orders by a third.",
    },
    {
      weak: "Responsible for weekly Excel reports.",
      strong:
        "Automated the weekly stock report with Python and Pandas, cutting it from 6 hours of copy-paste to 15 minutes.",
    },
  ],
  skills: [
    { label: "Querying and code", items: ["SQL", "Python", "Pandas", "Jupyter"] },
    {
      label: "Spreadsheets and BI",
      items: ["Excel", "Power BI", "Tableau", "Looker", "Google Sheets"],
    },
    { label: "Methods", items: ["Statistics", "A/B testing", "Data modeling", "ETL"] },
  ],
  tips: [
    {
      title: "End each line with the decision",
      text: "“Built a dashboard” is a task. “Built a dashboard that 30 managers use to plan staff” is a result. The decision is what the hiring manager is paying for.",
    },
    {
      title: "Say which tool, in the line",
      text: "Posts usually name SQL plus one of Power BI, Tableau or Looker. If you used the one they name, say it in the line where you used it, so Otto's match check finds it shown, not only listed.",
    },
    {
      title: "MIS roles count",
      text: "In India, many analysts start as MIS executives. Keep the title as it was and let the lines show the analysis: automation, models and reports that changed something.",
    },
  ],
  mistakes: [
    {
      title: "Listing every chart type",
      text: "Pie charts and pivot tables are not skills on their own. Name the tools, then show what one analysis changed.",
    },
    {
      title: "Insights without a number",
      text: "“Found insights that improved sales” can't be checked. Say what you found, how big it was, and what the team did next.",
    },
    {
      title: "A Kaggle list instead of work",
      text: "One project with real, messy data and a clear question beats five tutorial notebooks. Put job work first if you have it.",
    },
  ],
  faq: [
    {
      question: "What skills should a data analyst resume show?",
      answer:
        "SQL and one dashboard tool almost always, Excel nearly always, and Python or R often. Statistics and A/B testing matter for product and marketing teams. Show each one inside a line where you used it.",
    },
    {
      question: "Should I include a portfolio as a data analyst?",
      answer:
        "Yes, if you have one project you can explain well. Link a short write-up or dashboard with the question, the data, what you found and what someone should do about it.",
    },
    {
      question: "Is a data analyst resume different from a data scientist resume?",
      answer:
        "Mostly in emphasis. Analysts show decisions made from reporting and analysis; data scientists show models, experiments and how they reached production.",
    },
  ],
  related: ["data-scientist", "product-manager", "digital-marketing"],
} as const satisfies RoleExample;
