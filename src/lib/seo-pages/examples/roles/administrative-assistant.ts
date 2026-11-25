import type { RoleExample } from "../types";

export const administrativeAssistant = {
  slug: "administrative-assistant",
  role: "Administrative assistant",
  occupation: "43-6014.00",
  titles: ["Office Assistant", "Office Administrator", "Secretary"],
  updated: "2026-11-24",
  card: "Calendars, travel, records and office systems that save other people time.",
  description:
    "An administrative assistant resume example with lines on calendars, travel, records and office systems, plus the Microsoft Office skills posts ask for.",
  intro:
    "Administrative work is easy to undersell, because when it goes well nobody notices it. This example makes the work visible: how many people you supported, how many meetings and trips you booked, and the time or money your systems saved.",
  person:
    "Ashley is made up: an administrative assistant with 4 years at an engineering firm in Pittsburgh, who started at a gym front desk. Names, companies and numbers are invented.",
  resume: {
    title: "Administrative assistant resume",
    template: "modern",
    basics: {
      name: "Ashley Turner",
      headline: "Administrative Assistant",
      email: "ashley.turner@example.com",
      phone: "+1 412 555 0175",
      location: "Pittsburgh, PA",
      links: [{ label: "LinkedIn", url: "linkedin.example.com/in/ashley-turner" }],
    },
    summary:
      "Administrative assistant with 4 years supporting a 60-person engineering office and its 3 principals. Runs calendars, travel, records and supplies, and builds simple systems in Microsoft Office so requests stop slipping.",
    experience: [
      {
        company: "Calloway & Strand Engineering",
        title: "Administrative Assistant",
        location: "Pittsburgh, PA",
        startDate: "Sep 2022",
        endDate: "Present",
        bullets: [
          "Managed calendars for 3 principals, booking about 45 meetings a week across 4 time zones with no double bookings in 2025.",
          "Booked travel for 60 engineers, about 300 trips a year, keeping spend 11% under budget by using the company's airline and hotel rates.",
          "Moved 9,000 paper project files into a SharePoint library with one naming rule, cutting the time to find a drawing from 20 minutes to 2.",
          "Set up a shared supply order in Excel for the office, bringing monthly supply spend from $2,300 down to $1,700.",
        ],
      },
      {
        company: "Calloway & Strand Engineering",
        title: "Receptionist",
        location: "Pittsburgh, PA",
        startDate: "Jan 2022",
        endDate: "Aug 2022",
        bullets: [
          "Answered about 70 calls and greeted 25 visitors a day, routing each to the right engineer within 5 minutes.",
        ],
      },
      {
        company: "Bellwether Fitness",
        title: "Front Desk Associate",
        location: "Pittsburgh, PA",
        startDate: "May 2020",
        endDate: "Dec 2021",
        bullets: [
          "Checked in 300 members a day and answered billing questions, keeping member complaints under 2 a month.",
          "Built a class sign-up sheet in Google Sheets that cut no-shows for full classes by 30%.",
        ],
      },
    ],
    education: [
      {
        school: "Brightwater Community College",
        degree: "A.A.S.",
        field: "Office Administration",
        startDate: "2018",
        endDate: "2020",
      },
    ],
    skills: [
      {
        label: "Office work",
        items: [
          "Calendar management",
          "Travel planning",
          "Minute taking",
          "Data entry",
          "Event planning",
        ],
      },
      {
        label: "Tools",
        items: ["Microsoft Office", "Excel", "Outlook", "SharePoint", "Google Workspace", "Zoom"],
      },
    ],
    certifications: [
      {
        name: "Microsoft Office Specialist: Excel Associate",
        issuer: "Microsoft",
        date: "2023",
      },
    ],
  },
  lines: [
    {
      weak: "Handled calendars and scheduling for executives.",
      strong:
        "Managed calendars for 3 principals, booking about 45 meetings a week across 4 time zones with no double bookings in 2025.",
    },
    {
      weak: "Duties included filing and record keeping.",
      strong:
        "Moved 9,000 paper project files into a SharePoint library with one naming rule, cutting the time to find a drawing from 20 minutes to 2.",
    },
    {
      weak: "Detail-oriented team player with excellent communication skills.",
      strong:
        "Booked travel for 60 engineers, about 300 trips a year, keeping spend 11% under budget by using the company's airline and hotel rates.",
    },
  ],
  skills: [
    {
      label: "Office work",
      items: [
        "Calendar management",
        "Minute taking",
        "Data entry",
        "Event planning",
        "Customer service",
      ],
    },
    {
      label: "Software",
      items: [
        "Microsoft Office",
        "Microsoft Word",
        "Excel",
        "PowerPoint",
        "SharePoint",
        "Google Workspace",
      ],
    },
    { label: "Office finances", items: ["Bookkeeping", "QuickBooks"] },
  ],
  tips: [
    {
      title: "Count who you supported",
      text: "Say how many people, which roles, and how big the office was. Supporting 3 principals and a 60-person team sets the scope before the reader gets to the details.",
    },
    {
      title: "Turn routines into numbers",
      text: "Meetings booked a week, trips a year, calls a day, invoices processed. These are easy to estimate honestly, and they show how much you keep moving.",
    },
    {
      title: "Show one system you built",
      text: "A filing rule, a shared tracker, a supply order, an onboarding checklist. One line about something you set up that saved time shows you improve the office, not only run it.",
    },
  ],
  mistakes: [
    {
      title: "A list of soft skills",
      text: "“Organized, reliable, detail-oriented” is on almost every admin resume. Let the lines prove it instead: zero double bookings or travel kept under budget says the same thing with evidence.",
    },
    {
      title: "Leaving out the software",
      text: "Admin posts nearly always name Microsoft Office or Google Workspace, and often Excel by name. List the ones you use, and show your strongest one in a line.",
    },
    {
      title: "Dropping the front desk job",
      text: "Reception and other customer-facing jobs show volume, patience and judgment. Keep them, with one or two lines that count the calls, visitors or members you dealt with.",
    },
  ],
  faq: [
    {
      question: "What skills should an administrative assistant resume show?",
      answer:
        "Calendar management, scheduling and travel, Microsoft Office or Google Workspace with Excel named, data entry and record keeping, and customer service. Show the strongest ones in a line with a number.",
    },
    {
      question: "How do I write an administrative assistant resume with no experience?",
      answer:
        "Use any job where you organized people, money or information: retail, reception, volunteering or a school club. Count what you handled, and add a Microsoft Office certification if you have one.",
    },
    {
      question: "Should an administrative assistant resume be one page?",
      answer:
        "Yes, for most people. Keep the last 10 years, give older jobs one line each, and keep the skills section short and specific.",
    },
    {
      question:
        "What's the difference between an administrative assistant and an executive assistant?",
      answer:
        "An executive assistant usually supports one or two senior leaders closely, often managing their time and inbox. An administrative assistant usually supports a team or an office. Use the title you held and show who you supported.",
    },
  ],
  related: ["customer-support", "hr", "operations-manager"],
} as const satisfies RoleExample;
