import type { RoleExample } from "../types";

export const backendDeveloper: RoleExample = {
  slug: "backend-developer",
  role: "Backend developer",
  occupation: "15-1252.00",
  titles: ["Backend Engineer", "Software Engineer", "Software Developer"],
  updated: "2026-11-24",
  card: "Services that show load, latency, uptime and what they cost to run.",
  description:
    "A backend developer resume example with Java and Python lines that show scale, uptime and cost, plus the skills backend posts ask for and common mistakes.",
  intro:
    "Backend work is often invisible, so the resume has to make it visible: how much traffic, how reliable, how much it cost, and what changed because of you. This example turns each of those into a number.",
  person:
    "Ethan is made up: a backend developer with 3 years in logistics software in Columbus, Ohio. Names, companies and numbers are invented.",
  resume: {
    title: "Backend developer resume",
    template: "minimal",
    basics: {
      name: "Ethan Brooks",
      headline: "Backend Developer",
      email: "ethan.brooks@example.com",
      phone: "+1 614 555 0115",
      location: "Columbus, OH",
      links: [{ label: "Portfolio", url: "ethan-brooks.example.com" }],
    },
    summary:
      "Backend developer with 3 years building order and tracking services in Java, Python and PostgreSQL. Focused on services that stay up at peak and cost less to run.",
    experience: [
      {
        company: "Fernway Logistics",
        title: "Backend Developer",
        location: "Columbus, OH",
        startDate: "Aug 2023",
        endDate: "Present",
        bullets: [
          "Built the shipment tracking API in Spring Boot that serves 1,200 requests a second at peak with a p99 under 150 ms.",
          "Moved order events from database polling to Kafka, cutting PostgreSQL load by 60% during holiday sales.",
          "Cut the monthly AWS bill by 28% by right-sizing instances and moving cold logs to cheaper storage.",
        ],
      },
      {
        company: "Grainwise",
        title: "Associate Software Engineer",
        location: "Columbus, OH",
        startDate: "Jul 2022",
        endDate: "Jul 2023",
        bullets: [
          "Wrote a Python service with FastAPI that pulls commodity prices from 40 sources every hour for the pricing team.",
          "Added Docker and GitHub Actions to 6 services, cutting the time from merge to production from 2 days to 25 minutes.",
          "Fixed a race condition in stock updates that caused 3% of orders to oversell, found by replaying production logs.",
        ],
      },
    ],
    projects: [
      {
        name: "Rate limiter",
        tech: "Go, Redis",
        link: "ethan-brooks.example.com/rate-limiter",
        bullets: [
          "Wrote a token-bucket rate limiter with a Redis backend and load-tested it to 20,000 requests a second.",
        ],
      },
    ],
    education: [
      {
        school: "Northgate State University",
        degree: "B.S.",
        field: "Information Technology",
        startDate: "2018",
        endDate: "2022",
      },
    ],
    skills: [
      { label: "Languages", items: ["Java", "Python", "Go", "SQL"] },
      {
        label: "Services and data",
        items: ["Spring Boot", "FastAPI", "Kafka", "PostgreSQL", "Redis", "Microservices"],
      },
      { label: "Infrastructure", items: ["AWS", "Docker", "GitHub Actions", "Linux", "Datadog"] },
    ],
  },
  lines: [
    {
      weak: "Handled backend development for the tracking system.",
      strong:
        "Built the shipment tracking API in Spring Boot that serves 1,200 requests a second at peak with a p99 under 150 ms.",
    },
    {
      weak: "Helped reduce cloud costs.",
      strong:
        "Cut the monthly AWS bill by 28% by right-sizing instances and moving cold logs to cheaper storage.",
    },
    {
      weak: "Was involved in setting up CI/CD.",
      strong:
        "Added Docker and GitHub Actions to 6 services, cutting the time from merge to production from 2 days to 25 minutes.",
    },
  ],
  skills: [
    { label: "Languages", items: ["Java", "Python", "Go", "Node.js", "SQL"] },
    {
      label: "Data and messaging",
      items: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Kafka", "RabbitMQ"],
    },
    {
      label: "Architecture and cloud",
      items: ["Microservices", "REST", "System design", "AWS", "Docker", "Kubernetes"],
    },
  ],
  tips: [
    {
      title: "Show load, latency and uptime",
      text: "Requests a second, p99 latency, error rate, uptime. These are the numbers backend interviewers ask about, so putting one in a line starts the conversation you want.",
    },
    {
      title: "Money is a result too",
      text: "A lower cloud bill, fewer servers or less on-call time is a result any manager understands. Say how much, and what you changed to get it.",
    },
    {
      title: "Explain the domain in a few words",
      text: "“Shipment tracking”, “card refunds”, “commodity prices”: a short noun tells the reader what the system did, so the numbers mean something.",
    },
  ],
  mistakes: [
    {
      title: "Only listing technologies",
      text: "A line that reads “Java, Spring Boot, Kafka, Docker” says what you used, not what you did. Put the tools inside a line with a result.",
    },
    {
      title: "Hiding behind “was involved in”",
      text: "Otto's line check flags passive and weak openings like this, because the reader can't tell what you did. Start with your own verb: built, cut, moved, fixed.",
    },
    {
      title: "Leaving out the scale",
      text: "A queue that handles 50 messages a day and one that handles 50,000 a second are different jobs. Say which one yours was.",
    },
  ],
  faq: [
    {
      question: "What should a backend developer resume include?",
      answer:
        "Your languages and frameworks, the systems you built, and numbers for load, latency, uptime or cost. Add one project if your job work is under NDA, and keep it to one or two pages.",
    },
    {
      question: "Should I mention system design on my resume?",
      answer:
        "Show it rather than claim it. A line about splitting a service, adding a queue or designing for peak traffic tells the reader more than the words “system design” in a skills list.",
    },
    {
      question: "Which format suits a backend resume?",
      answer:
        "Any plain, one-column format. This example uses Minimal, which comes with Pro; Classic and Compact are free and read just as cleanly.",
    },
  ],
  related: ["software-engineer", "data-scientist", "fresher"],
};
