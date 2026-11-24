import type { RoleExample } from "../types";

export const businessAnalyst: RoleExample = {
  slug: "business-analyst",
  role: "Business analyst",
  occupation: "13-1111.00",
  titles: ["Senior Business Analyst", "Management Analyst", "Operations Analyst"],
  updated: "2026-11-24",
  card: "Requirements, process maps and data that changed how a team works.",
  description:
    "A business analyst resume example with requirements, process and SQL lines that show what changed, plus the skills and tools BA posts ask for, and tips.",
  intro:
    "A business analyst sits between the people who run a process and the people who change it. The resume has to show both sides: what you found out, what you wrote down, and what got better once the change shipped. This example does that for a bank and an insurer.",
  person:
    "Natalie is made up: a business analyst with 5 years at a bank and an insurer in Charlotte, who moved up from claims operations. Names, companies and numbers are invented.",
  resume: {
    title: "Business analyst resume",
    template: "classic",
    basics: {
      name: "Natalie Reyes",
      headline: "Business Analyst",
      email: "natalie.reyes@example.com",
      phone: "+1 704 555 0123",
      location: "Charlotte, NC",
      links: [{ label: "LinkedIn", url: "linkedin.example.com/in/natalie-reyes" }],
    },
    summary:
      "Business analyst with 5 years in banking and insurance, turning messy processes into clear requirements and measurable fixes. Works in SQL, Excel and Power BI, and is as comfortable with operations staff as with engineers.",
    experience: [
      {
        company: "Carraway Bank",
        title: "Senior Business Analyst",
        location: "Charlotte, NC",
        startDate: "Feb 2024",
        endDate: "Present",
        bullets: [
          "Mapped the small business loan process across 4 teams and 23 handoffs, then wrote the requirements that cut approval time from 19 days to 8.",
          "Wrote 140 user stories with acceptance criteria for a new loan portal, and ran user testing with 12 underwriters that found 31 defects before launch.",
          "Used SQL on 3 years of loan data to show that 40% of rework came from 2 missing fields on the application form, which the team made required.",
          "Built a Power BI dashboard of loans by stage that 15 branch managers check daily, replacing a weekly emailed spreadsheet.",
        ],
      },
      {
        company: "Halberd Mutual Insurance",
        title: "Business Analyst",
        location: "Charlotte, NC",
        startDate: "Jun 2021",
        endDate: "Jan 2024",
        bullets: [
          "Documented the claims intake process and found 6 duplicate data entry steps, removing them in a release that saved adjusters 5 hours a week each.",
          "Gathered requirements from 30 adjusters for a claims status page, which cut status calls to the call center by 22%.",
        ],
      },
      {
        company: "Halberd Mutual Insurance",
        title: "Claims Operations Associate",
        location: "Charlotte, NC",
        startDate: "Jul 2019",
        endDate: "May 2021",
        bullets: [
          "Processed 60 auto claims a week and wrote the team's first how-to guide, which became the training material for 25 new hires.",
        ],
      },
    ],
    education: [
      {
        school: "Thornbury State University",
        degree: "B.S.",
        field: "Business Administration",
        startDate: "2015",
        endDate: "2019",
      },
    ],
    skills: [
      {
        label: "Analysis",
        items: [
          "Requirements gathering",
          "Process mapping",
          "User stories",
          "User acceptance testing",
          "Data analysis",
        ],
      },
      { label: "Tools", items: ["SQL", "Excel", "Power BI", "Jira", "Confluence", "Visio"] },
    ],
    certifications: [
      {
        name: "Certification of Capability in Business Analysis (CCBA)",
        issuer: "IIBA",
        date: "2023",
      },
    ],
  },
  lines: [
    {
      weak: "Gathered requirements from stakeholders.",
      strong:
        "Mapped the small business loan process across 4 teams and 23 handoffs, then wrote the requirements that cut approval time from 19 days to 8.",
    },
    {
      weak: "Involved in process improvement projects.",
      strong:
        "Documented the claims intake process and found 6 duplicate data entry steps, removing them in a release that saved adjusters 5 hours a week each.",
    },
    {
      weak: "Performed various data analysis tasks using SQL.",
      strong:
        "Used SQL on 3 years of loan data to show that 40% of rework came from 2 missing fields on the application form, which the team made required.",
    },
  ],
  skills: [
    {
      label: "Analysis",
      items: ["Data analysis", "Data modeling", "Root cause analysis", "Technical writing"],
    },
    {
      label: "Delivery",
      items: [
        "Agile",
        "Scrum",
        "Jira",
        "Confluence",
        "Stakeholder management",
        "Change management",
      ],
    },
    { label: "Data tools", items: ["SQL", "Excel", "Power BI", "Tableau", "Salesforce"] },
  ],
  tips: [
    {
      title: "Show the process before and after",
      text: "Days to approve, steps removed, errors, hours saved. A business analyst's work shows up in how the process runs after the change, so measure it before you start.",
    },
    {
      title: "Count the documents you wrote",
      text: "User stories, process maps, requirements and test cases. Say how many and who signed them off; it shows you can carry a change from a meeting room to a release.",
    },
    {
      title: "Put SQL in a line, not only a list",
      text: "Many business analyst posts ask for SQL or strong Excel. One line where a query found the cause of a problem proves it better than a skills list does.",
    },
  ],
  mistakes: [
    {
      title: "“Acted as a liaison between business and IT”",
      text: "That restates the job title. Say what the two sides agreed on because of you, and what shipped as a result.",
    },
    {
      title: "Only the tools, never the change",
      text: "Jira, Visio and Confluence are where the work lives, not the work itself. Each line needs a process, a decision or a number that moved.",
    },
    {
      title: "Hiding your operations years",
      text: "Time in claims, billing or a call center is why you understand the process. Keep that job on the page with one line that shows you improved how it ran.",
    },
  ],
  faq: [
    {
      question: "What should a business analyst resume include?",
      answer:
        "The processes or systems you analyzed, the requirements you wrote, the tools you used, and what changed after: time saved, errors cut or cost avoided. Add an ECBA, CCBA or CBAP certification if you hold one.",
    },
    {
      question: "Do business analysts need SQL on their resume?",
      answer:
        "Not every post requires it, but a lot of US posts ask for it, and it lets you check a problem in the data yourself. If you have used it, show one finding from a query in a line.",
    },
    {
      question: "How do I move from operations into a business analyst role?",
      answer:
        "Write your current job around the analysis inside it: a process you mapped, a report you built, a fix you proposed. The summary can say you are moving into business analysis.",
    },
    {
      question: "Is a business analyst the same as a data analyst?",
      answer:
        "They overlap. Business analysts focus on processes and the requirements for a change; data analysts focus on reporting and analysis. Lean your lines toward whichever the post asks for.",
    },
  ],
  related: ["data-analyst", "project-manager", "financial-analyst"],
};
