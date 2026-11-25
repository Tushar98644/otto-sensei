import type { RoleExample } from "../types";

export const dataEngineer = {
  slug: "data-engineer",
  role: "Data engineer",
  occupation: "15-1243.01",
  titles: [
    "Data Engineer",
    "Analytics Engineer",
    "ETL Developer",
    "Big Data Engineer",
    "Data Platform Engineer",
  ],
  updated: "2026-11-24",
  card: "Pipelines with their volume, freshness, failures and cost in each line.",
  description:
    "A data engineer resume example with Spark, Airflow and SQL lines that show volume, freshness and cost, plus the skills data posts ask for and mistakes.",
  intro:
    "A data engineer's work shows up as tables other people trust. The resume has to say how much data moved, how fresh it arrived, how often it broke and what it cost to run. This example puts one of those numbers in every line.",
  person:
    "Marcus is made up: a data engineer with 5 years in banking and retail analytics, based in Charlotte, North Carolina. Names, companies and numbers are invented.",
  resume: {
    title: "Data engineer resume",
    template: "developer",
    basics: {
      name: "Marcus Hall",
      headline: "Data Engineer",
      email: "marcus.hall@example.com",
      phone: "+1 704 555 0143",
      location: "Charlotte, NC",
      links: [{ label: "GitHub", url: "github.example.com/marcus-hall" }],
    },
    summary:
      "Data engineer with 5 years building batch and streaming pipelines in Python, SQL and Spark. Focused on tables that land on time, pass their checks and cost less to run each quarter.",
    experience: [
      {
        company: "Tidewater Payments",
        title: "Data Engineer",
        location: "Charlotte, NC",
        startDate: "Mar 2023",
        endDate: "Present",
        bullets: [
          "Rebuilt 40 nightly Airflow pipelines on Spark and Snowflake, cutting the run from 6 hours to 70 minutes so finance reports land before 7:00 each morning.",
          "Moved card transaction events from hourly batch loads to Kafka streams, bringing fraud dashboards from 60 minutes behind to under 2.",
          "Added dbt tests to 220 models, catching about 35 broken loads a quarter before analysts opened a report.",
          "Cut the Snowflake bill by 31% by clustering the 5 largest tables and suspending idle warehouses after 5 minutes.",
        ],
      },
      {
        company: "Pinecrest Outfitters",
        title: "ETL Developer",
        location: "Raleigh, NC",
        startDate: "Jun 2021",
        endDate: "Feb 2023",
        bullets: [
          "Wrote Python ETL jobs that loaded sales from 180 stores into Redshift every night, replacing 12 hand-run spreadsheet exports.",
          "Designed a star schema for orders and returns that 30 analysts query in Tableau, cutting dashboard load time from 40 seconds to 6.",
          "Set up alerts for late and empty loads, lowering missed morning reports from 9 a month to 1.",
        ],
      },
    ],
    education: [
      {
        school: "Piedmont State University",
        degree: "B.S.",
        field: "Computer Science",
        startDate: "2017",
        endDate: "2021",
      },
    ],
    skills: [
      { label: "Languages", items: ["Python", "SQL", "Scala"] },
      { label: "Pipelines", items: ["Spark", "Airflow", "dbt", "Kafka"] },
      { label: "Warehouses and cloud", items: ["Snowflake", "Redshift", "PostgreSQL", "AWS"] },
    ],
    certifications: [
      { name: "Databricks Certified Data Engineer Associate", issuer: "Databricks", date: "2024" },
    ],
  },
  lines: [
    {
      weak: "Worked on data pipelines for the finance team.",
      strong:
        "Rebuilt 40 nightly Airflow pipelines on Spark and Snowflake, cutting the run from 6 hours to 70 minutes so finance reports land before 7:00 each morning.",
    },
    {
      weak: "Responsible for data quality across the warehouse.",
      strong:
        "Added dbt tests to 220 models, catching about 35 broken loads a quarter before analysts opened a report.",
    },
    {
      weak: "Helped move reporting to real-time streaming.",
      strong:
        "Moved card transaction events from hourly batch loads to Kafka streams, bringing fraud dashboards from 60 minutes behind to under 2.",
    },
  ],
  skills: [
    { label: "Languages and processing", items: ["Python", "SQL", "Scala", "Spark", "Pandas"] },
    {
      label: "Pipelines and modeling",
      items: ["Airflow", "dbt", "Kafka", "ETL", "Data modeling", "Data warehousing"],
    },
    {
      label: "Warehouses and cloud",
      items: ["Snowflake", "BigQuery", "Redshift", "Databricks", "AWS", "Terraform"],
    },
  ],
  tips: [
    {
      title: "Give every pipeline a size and a clock",
      text: "Rows a day, terabytes a month, how long a run takes and when the data lands. A reader can't judge a pipeline without its size and its deadline, so put both in the line.",
    },
    {
      title: "Name who reads your tables",
      text: "Finance reports, fraud dashboards, a pricing model: saying who uses the data shows why the pipeline mattered, and hands the interviewer a good first question.",
    },
    {
      title: "Count failures you stopped",
      text: "Late loads, failed runs, broken data caught by tests before anyone saw it. Data teams track these, so a before and after says more than “improved data quality”.",
    },
  ],
  mistakes: [
    {
      title: "A stack with no data in it",
      text: "Spark, Airflow, Kafka, Snowflake and dbt on one line could describe any data engineer. Put each tool next to the job it did and the number it moved.",
    },
    {
      title: "“Big data” with no size",
      text: "Two terabytes a day and 80 gigabytes a week are both real jobs, and very different ones. Write the volume you handled instead of the label.",
    },
    {
      title: "Only the happy path",
      text: "Interviewers ask about the night a pipeline failed. A line on backfills, late data or a schema change you absorbed shows you have run pipelines in production, not only written them.",
    },
  ],
  faq: [
    {
      question: "What should a data engineer resume include?",
      answer:
        "The pipelines you built, the tools they ran on, and numbers for volume, run time, freshness, failures or cost. Add the teams that used the data, a short skills list and a certification if you have one.",
    },
    {
      question: "Is a data engineer resume different from a data analyst resume?",
      answer:
        "Yes. An analyst's lines end with a decision someone made from the numbers; an engineer's lines end with data that arrived faster, cleaner or cheaper. If you are moving from analysis into engineering, lead with the pipelines you built for your own reports.",
    },
    {
      question: "Do I need a cloud certification as a data engineer?",
      answer:
        "It helps when a post names one, but lines showing you ran pipelines in that cloud count for more. One current certification from the platform you use most is plenty.",
    },
  ],
  related: ["data-analyst", "backend-developer", "data-scientist"],
} as const satisfies RoleExample;
