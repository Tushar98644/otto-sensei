import type { RoleExample } from "../types";

export const softwareEngineer: RoleExample = {
  slug: "software-engineer",
  role: "Software engineer",
  occupation: "15-1252.00",
  titles: [
    "Software Developer",
    "Software Development Engineer",
    "Associate Software Engineer",
    "Full Stack Developer",
  ],
  updated: "2026-11-22",
  card: "Four years on payment systems, with the stack and a number in every line.",
  description:
    "A complete software engineer resume example with lines that show impact, the skills job posts name, title tips for India and abroad, and mistakes to skip.",
  intro:
    "Hiring managers read a software engineer resume for three things: what you shipped, how big it was, and the stack you did it in. This example puts all three in each line, so both people and hiring software find them.",
  person:
    "Priya is made up: a backend-leaning engineer with 4 years on payment systems in Bengaluru. Names, companies and numbers are invented; copy the shape, not the facts.",
  resume: {
    title: "Software engineer resume",
    template: "developer",
    basics: {
      name: "Priya Raman",
      headline: "Software Engineer",
      email: "priya.raman@example.com",
      phone: "+91 50000 41827",
      location: "Bengaluru, India",
      links: [{ label: "Portfolio", url: "priya-raman.example.com" }],
    },
    summary:
      "Software engineer with 4 years on payment systems in Java, Go and AWS. Owns services from design review to on-call, and measures them after launch.",
    experience: [
      {
        company: "Paysprout",
        title: "Software Engineer II",
        location: "Bengaluru",
        startDate: "Apr 2024",
        endDate: "Present",
        bullets: [
          "Built an idempotency layer for UPI payment callbacks in Go, cutting duplicate refunds from 0.4% of payouts to under 0.05%.",
          "Moved the settlement report from a nightly batch job to Kafka streams, so merchants see settled amounts within 10 minutes.",
          "Led the move of 14 services from EC2 to Kubernetes on AWS with one other engineer, with no customer-facing downtime.",
          "Wrote the on-call runbook and Grafana alert rules, cutting pages per week from 22 to 6 over two quarters.",
        ],
      },
      {
        company: "Quillstack",
        title: "Software Engineer",
        location: "Pune",
        startDate: "Jul 2021",
        endDate: "Mar 2024",
        bullets: [
          "Shipped a REST API for invoice exports in Java and Spring Boot, now used by 1,800 small businesses each month.",
          "Cut p95 latency of the invoice search endpoint from 1.2 s to 280 ms by adding composite indexes and a Redis cache.",
          "Added contract tests to the CI/CD pipeline that caught 9 breaking API changes before release in one year.",
        ],
      },
    ],
    projects: [
      {
        name: "ledgerlite",
        tech: "Go, PostgreSQL",
        link: "priya-raman.example.com/ledgerlite",
        bullets: [
          "Published an open-source double-entry ledger library that 3 teams at Paysprout now use for wallet balances.",
        ],
      },
    ],
    education: [
      {
        school: "Kaveri Institute of Technology",
        degree: "B.Tech",
        field: "Computer Science and Engineering",
        startDate: "2017",
        endDate: "2021",
      },
    ],
    skills: [
      { label: "Languages", items: ["Java", "Go", "Python", "SQL"] },
      {
        label: "Backend",
        items: ["Spring Boot", "Kafka", "PostgreSQL", "Redis", "REST", "gRPC"],
      },
      { label: "Cloud", items: ["AWS", "Kubernetes", "Docker", "Terraform", "Grafana"] },
    ],
    certifications: [
      { name: "AWS Certified Developer – Associate", issuer: "Amazon Web Services", date: "2023" },
    ],
  },
  lines: [
    {
      weak: "Responsible for maintaining the payments backend.",
      strong:
        "Kept the payments backend at 99.95% uptime for a year by adding health checks, retries and a tested failover runbook.",
    },
    {
      weak: "Worked on improving the performance of our APIs.",
      strong:
        "Cut p95 latency of the invoice search API from 1.2 s to 280 ms by adding composite indexes and a Redis cache.",
    },
    {
      weak: "We migrated our services to Kubernetes.",
      strong:
        "Moved 14 services from EC2 to Kubernetes on AWS with one other engineer, with no customer-facing downtime.",
    },
  ],
  skills: [
    { label: "Languages", items: ["Java", "Python", "Go", "TypeScript", "SQL"] },
    {
      label: "Frameworks and data",
      items: ["Spring Boot", "Node.js", "PostgreSQL", "Redis", "Kafka", "REST"],
    },
    {
      label: "Cloud and delivery",
      items: ["AWS", "Docker", "Kubernetes", "CI/CD", "Git", "Linux"],
    },
  ],
  tips: [
    {
      title: "Put the stack inside the line",
      text: "“Cut latency with a Redis cache” shows Redis at work. A skill that sits only in your Skills list counts for less, with recruiters and with Otto's match check, which marks it as listed rather than shown.",
    },
    {
      title: "Give every line a size",
      text: "Requests a second, users, services, money moved, minutes saved. One number is enough to turn a task into a result, and it gives the interviewer something to ask about.",
    },
    {
      title: "Write the title both ways",
      text: "If your company says SDE-2, write “Software Engineer II (SDE-2)”. Recruiters in India search for SDE titles; employers abroad search for “software engineer”, and both should find you.",
    },
  ],
  mistakes: [
    {
      title: "A skills list of 40 tools",
      text: "List what you would be happy to be interviewed on. Tools you touched once invite questions you can't answer, and they bury the ones that matter for the job.",
    },
    {
      title: "Lines about the team, not you",
      text: "“We migrated our services” hides your part. Otto's line check flags “we” for this reason: say what you did, even if others helped.",
    },
    {
      title: "Two columns and skill bars",
      text: "Hiring software reads straight across columns and can't read a bar. One column of real text keeps your jobs, dates and skills in the right order.",
    },
  ],
  faq: [
    {
      question: "How long should a software engineer resume be?",
      answer:
        "One page for most people with under 5 years of work. After that, two pages is fine if every line earns its place. Otto's recruiter view flags anything longer than two pages.",
    },
    {
      question: "Should I add my GitHub or portfolio link?",
      answer:
        "Yes, if it shows work you would like to talk about. A link to empty or abandoned repositories does more harm than no link. Pin your best two or three projects first.",
    },
    {
      question: "Should I put my CTC or notice period on my resume?",
      answer:
        "No. Recruiters in India ask for current CTC, expected CTC and notice period in the application form or on the first call. Keep the resume for your work; give those numbers when asked.",
    },
  ],
  related: ["backend-developer", "frontend-developer", "fresher"],
};
