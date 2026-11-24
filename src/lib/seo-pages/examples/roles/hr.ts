import type { RoleExample } from "../types";

export const hr: RoleExample = {
  slug: "hr",
  role: "HR",
  occupation: "13-1071.00",
  titles: ["HR Generalist", "HR Executive", "Talent Acquisition Specialist", "HR Business Partner"],
  updated: "2026-11-24",
  card: "Recruiting and generalist work in numbers: time to hire, retention, cases closed.",
  description:
    "An HR resume example for generalist and recruiting roles, with lines that show hiring speed, retention and process, plus the HR skills and tools to list.",
  intro:
    "HR people read resumes all day, so they notice a vague one at once. Theirs needs the same things they look for in others: numbers for hiring and retention, the systems they ran, and the problems they fixed. This example covers recruiting and generalist work.",
  person:
    "Nadia is made up: an HR generalist with 5 years in IT services and retail in Phoenix, with a recruiting background. Names, companies and numbers are invented.",
  resume: {
    title: "HR resume",
    template: "classic",
    basics: {
      name: "Nadia Khoury",
      headline: "HR Generalist",
      email: "nadia.khoury@example.com",
      phone: "+1 602 555 0179",
      location: "Phoenix, AZ",
      links: [{ label: "Portfolio", url: "nadia-khoury.example.com" }],
    },
    summary:
      "HR generalist with 5 years in recruiting, onboarding and employee relations for teams of 300 to 1,200 people. Fixes slow processes with simple tools and clear policies.",
    experience: [
      {
        company: "Quillstack",
        title: "HR Generalist",
        location: "Phoenix, AZ",
        startDate: "Mar 2023",
        endDate: "Present",
        bullets: [
          "Cut time to hire for engineering roles from 52 to 34 days by adding structured interviews and a 48-hour feedback rule.",
          "Rebuilt onboarding for 220 new hires a year, raising 90-day retention from 81% to 90%.",
          "Moved PTO, attendance and payroll inputs into one HRIS, ending 3 spreadsheets and monthly payroll errors.",
          "Investigated and closed 40 employee relations cases a year, each with written findings.",
        ],
      },
      {
        company: "Sunbird Retail",
        title: "Talent Acquisition Specialist",
        location: "Phoenix, AZ",
        startDate: "Jun 2021",
        endDate: "Feb 2023",
        bullets: [
          "Hired 180 store staff and 25 managers in 2022 across 30 stores, mostly through referrals and campus recruiting.",
          "Started an employee referral bonus that brought 35% of hires, at a third of the agency cost per hire.",
          "Ran 6 campus hiring events a year at colleges in Arizona and New Mexico, filling 60 trainee roles.",
        ],
      },
    ],
    education: [
      {
        school: "Lakeside University",
        degree: "MBA",
        field: "Human Resources",
        startDate: "2019",
        endDate: "2021",
      },
    ],
    skills: [
      {
        label: "HR",
        items: [
          "Talent acquisition",
          "Employee relations",
          "Performance management",
          "Onboarding",
          "Payroll",
        ],
      },
      { label: "Tools", items: ["Workday", "Excel", "Google Workspace", "LinkedIn Recruiter"] },
    ],
  },
  lines: [
    {
      weak: "Responsible for end-to-end recruitment.",
      strong:
        "Cut time to hire for engineering roles from 52 to 34 days by adding structured interviews and a 48-hour feedback rule.",
    },
    {
      weak: "Handled employee onboarding.",
      strong:
        "Rebuilt onboarding for 220 new hires a year, raising 90-day retention from 81% to 90%.",
    },
    {
      weak: "Hardworking HR professional with attention to detail.",
      strong:
        "Moved PTO, attendance and payroll inputs into one HRIS, ending 3 spreadsheets and monthly payroll errors.",
    },
  ],
  skills: [
    {
      label: "People work",
      items: ["Talent acquisition", "Recruiting", "Employee relations", "Performance management"],
    },
    { label: "Operations", items: ["Payroll", "HRIS", "Change management"] },
    { label: "Tools", items: ["Workday", "Excel", "Google Workspace", "Microsoft Office"] },
  ],
  tips: [
    {
      title: "Use the numbers you already track",
      text: "Time to hire, offer acceptance, 90-day retention, attrition, cases closed. HR teams track these anyway; one per line turns duties into results.",
    },
    {
      title: "Name the systems",
      text: "Workday, SAP SuccessFactors, Darwinbox, Keka, Greenhouse: posts often name the HRIS or recruiting system, so say which ones you ran.",
    },
    {
      title: "Keep confidential things confidential",
      text: "Count the cases and say how they ended, but never name people or describe a case in detail. Recruiters notice, and it counts in your favour.",
    },
  ],
  mistakes: [
    {
      title: "“End-to-end recruitment”",
      text: "It says you did the whole job but not how well. Otto's line check flags “Responsible for” openings like this one; add how many roles, how fast, and from which sources.",
    },
    {
      title: "Personal details from an old format",
      text: "Date of birth, marital status and a photo still appear on many Indian resume templates. Most employers don't need them, and they invite bias. Leave them off.",
    },
    {
      title: "A wall of soft skills",
      text: "“People person, good listener, hardworking” is what everyone writes. Show the same thing with a line about a case you closed or a policy you fixed.",
    },
  ],
  faq: [
    {
      question: "What should an HR resume include?",
      answer:
        "Your HR areas (recruiting, generalist, payroll or learning), the size of the workforce you supported, and numbers like time to hire or retention. Add the HR systems you used.",
    },
    {
      question: "Should I list labour law knowledge on my HR resume?",
      answer:
        "If the job needs it, show it in a line: policies you wrote or audits you passed. A bare list of acts means less than one example of applying them.",
    },
    {
      question: "How do I move from recruiting to an HR generalist role?",
      answer:
        "Keep your recruiting results and add any generalist work you did: onboarding, policy, employee relations or payroll inputs. A summary line can name the move you want.",
    },
  ],
  related: ["customer-support", "business-development", "product-manager"],
};
