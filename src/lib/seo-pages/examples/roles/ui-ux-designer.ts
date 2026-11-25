import type { RoleExample } from "../types";

export const uiUxDesigner = {
  slug: "ui-ux-designer",
  role: "UI/UX designer",
  occupation: "15-1255.00",
  titles: ["Product Designer", "UX Designer", "UI Designer", "Interaction Designer"],
  updated: "2026-11-24",
  card: "Plain text that links the portfolio, with research and results in each line.",
  description:
    "A UI/UX designer resume example in plain text that hiring software can read, with lines that show research and results, the skills posts name and tips.",
  intro:
    "Designers are tempted to make the resume a showpiece, but hiring software reads a designed layout as scrambled text. The fix is a plain resume that links to your portfolio, with lines that show the research behind each design and what changed after it shipped.",
  person:
    "Hannah is made up: a product designer with 4 years in edtech and fintech in Denver. Names, companies and numbers are invented.",
  resume: {
    title: "UI/UX designer resume",
    template: "modern",
    basics: {
      name: "Hannah Larson",
      headline: "Product Designer (UI/UX)",
      email: "hannah.larson@example.com",
      phone: "+1 303 555 0164",
      location: "Denver, CO",
      links: [{ label: "Portfolio", url: "hannah-larson.example.com" }],
    },
    summary:
      "Product designer with 4 years designing learning and payment apps used on low-cost Android phones. Starts with research, designs in Figma, and checks the numbers after launch.",
    experience: [
      {
        company: "Larkspur Learning",
        title: "Product Designer",
        location: "Denver, CO",
        startDate: "Mar 2024",
        endDate: "Present",
        bullets: [
          "Redesigned the course player after 18 usability tests with students in 3 cities, raising lesson completion from 42% to 55%.",
          "Built a design system in Figma with 90 components and dark mode, cutting design-to-build time for new screens by about half.",
          "Designed a Spanish and English onboarding flow that lifted day-7 retention for new learners from 21% to 27%.",
        ],
      },
      {
        company: "Coralbay Banking",
        title: "UI/UX Designer",
        location: "Boulder, CO",
        startDate: "Jul 2022",
        endDate: "Feb 2024",
        bullets: [
          "Redesigned the bill payment flow from 7 screens to 4, which cut support calls about failed payments by 30%.",
          "Ran 2 rounds of card sorting with 40 customers to rebuild the app menu, then tested it with a clickable prototype.",
          "Wrote accessibility guidelines for color contrast and touch targets that the 3 app teams now follow.",
        ],
      },
    ],
    education: [
      {
        school: "Riverside Institute of Design",
        degree: "B.F.A.",
        field: "Interaction Design",
        startDate: "2018",
        endDate: "2022",
      },
    ],
    skills: [
      {
        label: "Design",
        items: ["UX design", "UI design", "Interaction design", "Design systems", "Prototyping"],
      },
      { label: "Research", items: ["User research", "Usability testing", "Wireframing"] },
      { label: "Tools", items: ["Figma", "Framer", "Miro", "Adobe Illustrator"] },
    ],
  },
  lines: [
    {
      weak: "Designed screens for the mobile app.",
      strong:
        "Redesigned the bill payment flow from 7 screens to 4, which cut support calls about failed payments by 30%.",
    },
    {
      weak: "Did user research and usability testing.",
      strong:
        "Redesigned the course player after 18 usability tests with students in 3 cities, raising lesson completion from 42% to 55%.",
    },
    {
      weak: "Created a design system.",
      strong:
        "Built a design system in Figma with 90 components and dark mode, cutting design-to-build time for new screens by about half.",
    },
  ],
  skills: [
    {
      label: "Design",
      items: [
        "UX design",
        "UI design",
        "Interaction design",
        "Design systems",
        "Prototyping",
        "Wireframing",
      ],
    },
    { label: "Research", items: ["User research", "Usability testing", "Accessibility"] },
    { label: "Tools", items: ["Figma", "Sketch", "Adobe XD", "Framer", "Miro"] },
  ],
  tips: [
    {
      title: "Let the portfolio carry the visuals",
      text: "Put the portfolio link in the header and keep the resume to plain text. A recruiter skims the resume first; the portfolio is where they see your work.",
    },
    {
      title: "Pair each design with research and a result",
      text: "How many people you tested with, what you changed because of it, and what moved after launch. That three-part line is what design leads look for.",
    },
    {
      title: "Say who the users were",
      text: "Students on low-cost phones, bank customers paying bills, warehouse staff with gloves on. The context shows you designed for real people, not for a Dribbble shot.",
    },
  ],
  mistakes: [
    {
      title: "A resume built in a design tool",
      text: "Columns, text boxes and icons from a design tool often come out of hiring software in the wrong order, or not at all. Otto's recruiter view shows you exactly what it reads.",
    },
    {
      title: "Skill bars and ratings",
      text: "“Figma: 4 out of 5 stars” can't be read by software and means nothing to people. List the tools; show the skill in your lines.",
    },
    {
      title: "Only screens, no outcomes",
      text: "“Designed the onboarding” is a task. Add what changed: completion, retention, fewer support tickets or faster builds.",
    },
  ],
  faq: [
    {
      question: "Should a UI/UX designer have a creative resume?",
      answer:
        "Keep the resume plain and let your portfolio be creative. Many employers read resumes through hiring software first, and designed layouts often come out scrambled.",
    },
    {
      question: "Should I put my portfolio link on my resume?",
      answer:
        "Yes, at the top, next to your email. Make sure it opens fast on a phone and that the first case study is your best one.",
    },
    {
      question: "Is product designer the same as UI/UX designer?",
      answer:
        "The titles overlap a lot, and Otto's job matching treats them as the same kind of job. Use the title from the post you are applying to in your headline.",
    },
  ],
  related: ["frontend-developer", "product-manager", "digital-marketing"],
} as const satisfies RoleExample;
