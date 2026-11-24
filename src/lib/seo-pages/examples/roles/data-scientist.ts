import type { RoleExample } from "../types";

export const dataScientist: RoleExample = {
  slug: "data-scientist",
  role: "Data scientist",
  occupation: "15-2051.00",
  titles: ["Machine Learning Engineer", "Applied Scientist", "Data Scientist II"],
  updated: "2026-11-24",
  card: "Models tied to a business result, and how each reached production.",
  description:
    "A data scientist resume example with machine learning lines that show the business result and how the model got to production, plus the skills posts name.",
  intro:
    "Data science resumes often read like course lists: models, libraries, metrics. Hiring managers want to know which model reached production and what it changed. This example ties every model to a result someone outside the team would care about.",
  person:
    "Maya is made up: a data scientist with 4 years in insurance and fintech in Boston. Names, companies and numbers are invented.",
  resume: {
    title: "Data scientist resume",
    template: "developer",
    basics: {
      name: "Maya Chen",
      headline: "Data Scientist",
      email: "maya.chen@example.com",
      phone: "+1 617 555 0146",
      location: "Boston, MA",
      links: [{ label: "Portfolio", url: "mayachen.example.com" }],
    },
    summary:
      "Data scientist with 4 years building pricing and fraud models in Python, from first notebook to production. Comfortable explaining a model to the people who have to trust it.",
    experience: [
      {
        company: "Hollowbrook Insurance",
        title: "Senior Data Scientist",
        location: "Boston, MA",
        startDate: "Jan 2024",
        endDate: "Present",
        bullets: [
          "Built a claims fraud model in Python with gradient boosting that flags 2 in 3 confirmed fraud cases, up from 1 in 3 with the old rules.",
          "Shipped the model as a FastAPI service on AWS with drift monitoring, scoring 40,000 claims a day.",
          "Ran a pricing experiment across 6 regions with a holdout group, showing a 3% margin gain before the full rollout.",
        ],
      },
      {
        company: "Ledgerloop",
        title: "Data Scientist",
        location: "Boston, MA",
        startDate: "Sep 2021",
        endDate: "Dec 2023",
        bullets: [
          "Trained a churn model with scikit-learn that let the support team call 500 at-risk customers a month, cutting churn in that group by 11%.",
          "Built a feature pipeline in Spark and Airflow that cut model training data prep from 2 days to 3 hours.",
          "Taught 25 analysts basic machine learning in a 6-week internal course with weekly exercises.",
        ],
      },
    ],
    projects: [
      {
        name: "Transit delay forecasts",
        tech: "PyTorch, Pandas",
        link: "mayachen.example.com/transit",
        bullets: [
          "Forecast bus delays from open city data with a small neural network, beating a seasonal baseline by 14% on a held-out month.",
        ],
      },
    ],
    education: [
      {
        school: "Harborview University",
        degree: "M.S.",
        field: "Statistics",
        startDate: "2020",
        endDate: "2021",
      },
      {
        school: "Harborview University",
        degree: "B.S.",
        field: "Mathematics",
        startDate: "2016",
        endDate: "2020",
      },
    ],
    skills: [
      { label: "Languages", items: ["Python", "SQL", "R"] },
      {
        label: "Modeling",
        items: ["scikit-learn", "PyTorch", "Machine learning", "Statistics", "A/B testing"],
      },
      { label: "Data and deployment", items: ["Spark", "Airflow", "AWS", "Docker", "MLOps"] },
    ],
  },
  lines: [
    {
      weak: "Built machine learning models using Python.",
      strong:
        "Built a claims fraud model in Python with gradient boosting that flags 2 in 3 confirmed fraud cases, up from 1 in 3 with the old rules.",
    },
    {
      weak: "Deployed models to production.",
      strong:
        "Shipped the model as a FastAPI service on AWS with drift monitoring, scoring 40,000 claims a day.",
    },
    {
      weak: "Worked with stakeholders on experiments.",
      strong:
        "Ran a pricing experiment across 6 regions with a holdout group, showing a 3% margin gain before the full rollout.",
    },
  ],
  skills: [
    { label: "Code", items: ["Python", "SQL", "NumPy", "Jupyter"] },
    {
      label: "Modeling",
      items: [
        "Machine learning",
        "Deep learning",
        "Statistics",
        "scikit-learn",
        "PyTorch",
        "TensorFlow",
      ],
    },
    {
      label: "Data and production",
      items: ["Pandas", "Spark", "Airflow", "AWS", "Docker", "MLOps"],
    },
  ],
  tips: [
    {
      title: "Translate the metric",
      text: "AUC 0.91 means little to a hiring manager outside the team. “Flags 2 in 3 fraud cases instead of 1 in 3” means the same and anyone can follow it. Give both if you like.",
    },
    {
      title: "Show the road to production",
      text: "Say how the model was served, how often it runs and how you knew it still worked. That is what separates a data scientist from a notebook.",
    },
    {
      title: "Name LLM work plainly",
      text: "If you have built with large language models, say what the system did, how you measured it and what it cost. “Worked on GenAI” tells the reader nothing.",
    },
  ],
  mistakes: [
    {
      title: "A list of algorithms",
      text: "Random forests, XGBoost, k-means and LSTMs in a row read like a syllabus. Mention the method inside the line where it solved a problem.",
    },
    {
      title: "Accuracy on an unbalanced problem",
      text: "“98% accuracy” on fraud is easy if fraud is 1% of cases, and interviewers know it. Use the metric that fits the problem, and say why.",
    },
    {
      title: "No sense of scale",
      text: "Rows, users, predictions a day, money at stake. Without one, the reader can't tell a class project from a production system.",
    },
  ],
  faq: [
    {
      question: "Should a data scientist resume list Kaggle competitions?",
      answer:
        "Only a strong finish, and only if you can talk about it. Job work and one well-explained project usually count for more.",
    },
    {
      question: "Do I need a master's degree on my resume?",
      answer:
        "List your highest degree and the field. Many teams hire without a master's if the work shows the skills; the experience section is where you prove it.",
    },
    {
      question: "How technical should a data scientist resume be?",
      answer:
        "Technical enough for the interviewer and plain enough for the recruiter who reads it first. Name the method and tools, then end the line with the business result.",
    },
  ],
  related: ["data-analyst", "backend-developer", "software-engineer"],
};
