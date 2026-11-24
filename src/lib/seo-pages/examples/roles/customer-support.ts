import type { RoleExample } from "../types";

export const customerSupport: RoleExample = {
  slug: "customer-support",
  role: "Customer support",
  occupation: "43-4051.00",
  titles: [
    "Customer Support Specialist",
    "Customer Support Executive",
    "Customer Service Representative",
  ],
  updated: "2026-11-24",
  card: "Volume, response time and CSAT, from specialist to team lead.",
  description:
    "A customer support resume example with lines that show resolution time, CSAT and volume, plus the help desk tools and skills support posts ask for.",
  intro:
    "Support teams run on numbers: tickets a day, first response time, CSAT, escalations. A support resume that uses them reads like someone who already knows the job. This example moves from voice support to a team lead role.",
  person:
    "Luis is made up: a customer support team lead with 5 years in voice and chat support for an online store, based in San Antonio. Names, companies and numbers are invented.",
  resume: {
    title: "Customer support resume",
    template: "classic",
    basics: {
      name: "Luis Ortega",
      headline: "Customer Support Team Lead",
      email: "luis.ortega@example.com",
      phone: "+1 210 555 0163",
      location: "San Antonio, TX",
      links: [{ label: "Portfolio", url: "luis-ortega.example.com" }],
    },
    summary:
      "Customer support lead with 5 years in voice, chat and email support for an online store with 2 million customers. Keeps queues short, answers kind, and fixes the causes behind repeat tickets.",
    experience: [
      {
        company: "Brightkart",
        title: "Customer Support Team Lead",
        location: "San Antonio, TX",
        startDate: "Jan 2024",
        endDate: "Present",
        bullets: [
          "Lead a team of 12 on chat and email, keeping first response under 2 minutes and CSAT at 92% through the holiday sale.",
          "Wrote 45 help articles in Zendesk for the top refund and delivery questions, cutting those tickets by 25%.",
          "Set up a weekly review of repeat tickets with the delivery team, which fixed a ZIP code bug behind 1,500 tickets a month.",
        ],
      },
      {
        company: "Brightkart",
        title: "Customer Support Specialist",
        location: "San Antonio, TX",
        startDate: "Aug 2021",
        endDate: "Dec 2023",
        bullets: [
          "Answered 70 to 90 chats and calls a day in Spanish and English, with a CSAT of 94% over 2 years.",
          "Trained 20 new hires on refunds and escalations, cutting their time to full workload from 6 weeks to 4.",
          "Won the quarterly quality award twice out of 80 agents for call audits and resolution time.",
        ],
      },
    ],
    education: [
      {
        school: "Harborview University",
        degree: "B.A.",
        field: "English",
        startDate: "2017",
        endDate: "2021",
      },
    ],
    skills: [
      {
        label: "Support",
        items: ["Customer support", "Customer service", "Help desk", "Escalation handling"],
      },
      { label: "Tools", items: ["Zendesk", "Freshdesk", "Google Sheets", "Excel"] },
      { label: "Languages", items: ["Spanish", "English"] },
    ],
  },
  lines: [
    {
      weak: "Handled customer queries over chat and phone.",
      strong:
        "Answered 70 to 90 chats and calls a day in Spanish and English, with a CSAT of 94% over 2 years.",
    },
    {
      weak: "Team player who thrives in a fast-paced environment.",
      strong:
        "Lead a team of 12 on chat and email, keeping first response under 2 minutes and CSAT at 92% through the holiday sale.",
    },
    {
      weak: "Helped new hires learn the process.",
      strong:
        "Trained 20 new hires on refunds and escalations, cutting their time to full workload from 6 weeks to 4.",
    },
  ],
  skills: [
    {
      label: "Support",
      items: ["Customer support", "Customer service", "Technical support", "Help desk"],
    },
    { label: "Tools", items: ["Zendesk", "Freshdesk", "Intercom", "Salesforce", "CRM"] },
    { label: "Office tools", items: ["Excel", "Google Sheets", "Microsoft Office"] },
  ],
  tips: [
    {
      title: "Quote the metrics your team reports",
      text: "Tickets or calls a day, first response time, resolution time, CSAT and quality scores. If you don't know an exact figure, use a range you can stand behind.",
    },
    {
      title: "Show you fix causes, not only tickets",
      text: "Help articles that cut a ticket type, a bug you got fixed, a process you changed. That is what moves you from specialist to lead.",
    },
    {
      title: "List your languages",
      text: "Many support jobs in India and abroad hire for a language. Name each one you can support customers in, in a skills line or a Languages section.",
    },
  ],
  mistakes: [
    {
      title: "“Team player in a fast-paced environment”",
      text: "Otto's line check flags these as stock phrases: every support resume has them. A CSAT score under pressure says the same thing and proves it.",
    },
    {
      title: "Process names nobody outside knows",
      text: "Internal names for queues and tools mean nothing to a new employer. Say what the process was in plain words.",
    },
    {
      title: "Hiding a BPO background",
      text: "Voice process experience at a BPO is real support experience. Name the client industry if you can, and show the numbers.",
    },
  ],
  faq: [
    {
      question: "What skills should a customer support resume show?",
      answer:
        "The channels you handled (voice, chat, email), the help desk tools you used, your languages, and numbers for volume, response time and CSAT.",
    },
    {
      question: "How do I move from customer support to a team lead role?",
      answer:
        "Show the lead work you already do: training new joiners, quality audits, help articles, covering the queue. Give a number for each, and say the move you want in your summary.",
    },
    {
      question: "Should I mention night shifts or rotational shifts?",
      answer:
        "Only if the job asks for them. If a post says rotational shifts, one line saying you have worked them answers the question before it is asked.",
    },
  ],
  related: ["hr", "business-development", "fresher"],
};
