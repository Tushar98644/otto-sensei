import type { RoleExample } from "../types";

export const financialAnalyst: RoleExample = {
  slug: "financial-analyst",
  role: "Financial analyst",
  occupation: "13-2051.00",
  titles: ["FP&A Analyst", "Senior Financial Analyst", "Corporate Finance Analyst"],
  updated: "2026-11-24",
  card: "Forecasts, models and budgets tied to a decision the business made.",
  description:
    "A financial analyst resume example with FP&A lines on forecasts, budgets and models that drove a decision, plus the Excel and finance skills posts ask for.",
  intro:
    "Financial analysts are judged on whether leaders trust their numbers enough to act on them. So each line here names the model or forecast, how close it came, and the decision it fed: a price, a budget, or a store that never opened.",
  person:
    "Ryan is made up: an FP&A analyst with 4 years at a home goods retailer in Dallas, who started with a summer internship at a bank. Names, companies and numbers are invented.",
  resume: {
    title: "Financial analyst resume",
    template: "compact",
    basics: {
      name: "Ryan Patel",
      headline: "Financial Analyst, FP&A",
      email: "ryan.patel@example.com",
      phone: "+1 214 555 0136",
      location: "Dallas, TX",
      links: [{ label: "LinkedIn", url: "linkedin.example.com/in/ryan-patel" }],
    },
    summary:
      "Financial analyst with 4 years in FP&A for a $600M retailer, building the forecasts, budgets and pricing models leaders use to decide. Works in Excel, SQL and NetSuite, and explains the numbers in a one-page memo.",
    experience: [
      {
        company: "Kestrel Home Goods",
        title: "Senior Financial Analyst",
        location: "Dallas, TX",
        startDate: "Apr 2024",
        endDate: "Present",
        bullets: [
          "Built the monthly sales forecast for 85 stores in Excel and SQL, bringing error down from 9% to 3.5% by adding promotions and weather to the model.",
          "Modeled the payback of 6 proposed stores and recommended dropping the 2 that missed a 3-year payback, saving $7M in capital.",
          "Ran the monthly budget-to-actual review with 9 department heads, explaining every gap over $50,000 in a one-page memo.",
          "Automated the month-end variance pack with Power Query, cutting it from 3 days to 4 hours.",
        ],
      },
      {
        company: "Kestrel Home Goods",
        title: "Financial Analyst",
        location: "Dallas, TX",
        startDate: "Jul 2022",
        endDate: "Mar 2024",
        bullets: [
          "Priced a new delivery fee with a model of 400,000 orders, adding $2.1M a year in margin with no measurable drop in orders.",
          "Prepared the annual budget for 4 departments totaling $38M and delivered it 2 weeks before the board deadline.",
        ],
      },
      {
        company: "Copperline Bank",
        title: "Financial Analyst Intern",
        location: "Dallas, TX",
        startDate: "Jun 2021",
        endDate: "Aug 2021",
        bullets: [
          "Built a cash flow model for 25 small business loan reviews that 3 credit officers used in their approval memos.",
        ],
      },
    ],
    education: [
      {
        school: "Copperfield State University",
        degree: "B.B.A.",
        field: "Finance",
        startDate: "2018",
        endDate: "2022",
      },
    ],
    skills: [
      {
        label: "Finance",
        items: ["Financial modeling", "Forecasting", "Budgeting", "Variance analysis", "FP&A"],
      },
      { label: "Tools", items: ["Excel", "SQL", "Power Query", "NetSuite", "Power BI"] },
    ],
    certifications: [{ name: "CFA Level I (passed)", issuer: "CFA Institute", date: "2023" }],
  },
  lines: [
    {
      weak: "Prepared monthly variance reports.",
      strong:
        "Ran the monthly budget-to-actual review with 9 department heads, explaining every gap over $50,000 in a one-page memo.",
    },
    {
      weak: "Tasked with building the sales forecast.",
      strong:
        "Built the monthly sales forecast for 85 stores in Excel and SQL, bringing error down from 9% to 3.5% by adding promotions and weather to the model.",
    },
    {
      weak: "Assisted with financial modeling for new store openings.",
      strong:
        "Modeled the payback of 6 proposed stores and recommended dropping the 2 that missed a 3-year payback, saving $7M in capital.",
    },
  ],
  skills: [
    {
      label: "Finance",
      items: ["Financial modeling", "Financial analysis", "Forecasting", "Budgeting", "FP&A"],
    },
    { label: "Spreadsheets and data", items: ["Excel", "VBA", "Power Query", "SQL", "Power BI"] },
    { label: "Systems and credentials", items: ["NetSuite", "SAP", "GAAP", "CFA"] },
  ],
  tips: [
    {
      title: "Say how close the forecast came",
      text: "Forecast error, budget variance, how often leaders used the model. Accuracy is the number a finance manager cares about most, and few resumes give it.",
    },
    {
      title: "Tie each model to a decision",
      text: "A model nobody acted on is homework. Name what the business did because of it: a price it changed, a store it skipped, a budget it moved.",
    },
    {
      title: "Show the size of what you covered",
      text: "Revenue, budget or portfolio size tells a reader your level at once. Write it as a dollar figure inside the line, like a $38M budget across 4 departments.",
    },
  ],
  mistakes: [
    {
      title: "“Prepared financial reports”",
      text: "Every analyst does. Say which report, who read it, and what they changed after reading it.",
    },
    {
      title: "Listing Excel and stopping there",
      text: "Excel is assumed for this job. Say what you built in it, like a driver-based forecast, a three-statement model or an automated variance pack, and what it saved.",
    },
    {
      title: "Claiming the company's results",
      text: "If the company beat its targets, that is not your line. Keep to the forecast, analysis or decision you owned, with its own number.",
    },
  ],
  faq: [
    {
      question: "What skills should a financial analyst resume show?",
      answer:
        "Financial modeling, forecasting and budgeting, nearly always Excel, and often SQL, a BI tool and the company's ERP, such as NetSuite or SAP. Show each one inside a line where it produced a number.",
    },
    {
      question: "Should I put CFA progress on my resume?",
      answer:
        "Yes, if it fits the job. Write the level you passed and the year, or that you are a Level II candidate with the exam date. It counts for more in investment roles than in FP&A.",
    },
    {
      question: "Is FP&A the same as a financial analyst role?",
      answer:
        "FP&A is one kind of financial analyst: planning, budgeting and forecasting inside a company. Investment and credit analysts are other kinds. Use the post's title if your work matches it.",
    },
  ],
  related: ["accountant", "data-analyst", "business-analyst"],
};
