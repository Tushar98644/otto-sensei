import type { RoleExample } from "../types";

export const frontendDeveloper: RoleExample = {
  slug: "frontend-developer",
  role: "Frontend developer",
  occupation: "15-1252.00",
  titles: ["Front End Engineer", "Frontend Engineer", "Full Stack Developer", "Software Engineer"],
  updated: "2026-11-24",
  card: "React and TypeScript, with speed and accessibility in numbers.",
  description:
    "A frontend developer resume example with React and TypeScript lines that show results, the skills posts ask for, and how to show speed and accessibility.",
  intro:
    "A frontend resume has to prove two things in a few seconds: that you build interfaces people use, and that you care how fast and accessible they are. This example shows both with numbers a hiring manager can check.",
  person:
    "Daniel is made up: a frontend developer with 5 years at product companies, working remotely from Minneapolis. Names, companies and numbers are invented.",
  resume: {
    title: "Frontend developer resume",
    template: "modern",
    basics: {
      name: "Daniel Okafor",
      headline: "Frontend Developer",
      email: "daniel.okafor@example.com",
      phone: "+1 612 555 0142",
      location: "Minneapolis, MN (remote)",
      links: [{ label: "Portfolio", url: "danielokafor.example.com" }],
    },
    summary:
      "Frontend developer with 5 years building React and TypeScript apps for online stores and SaaS dashboards. Known for fast pages, tidy design systems and accessible forms.",
    experience: [
      {
        company: "Brightkart",
        title: "Senior Frontend Developer",
        location: "Remote",
        startDate: "Feb 2023",
        endDate: "Present",
        bullets: [
          "Rebuilt the product page in Next.js with server rendering, cutting Largest Contentful Paint from 3.9 s to 1.6 s on mid-range phones.",
          "Led the move of 120 components into a shared design system in Storybook, used by 4 product teams.",
          "Fixed 64 WCAG issues in checkout after an audit, and added Playwright checks so new ones fail the build.",
          "Mentored 2 junior developers through code reviews and pairing; both now own features end to end.",
        ],
      },
      {
        company: "Cobaltwave",
        title: "Frontend Developer",
        location: "Minneapolis, MN",
        startDate: "Jun 2020",
        endDate: "Jan 2023",
        bullets: [
          "Built the analytics dashboard in React, TypeScript and D3.js that 900 customer accounts open each week.",
          "Cut the main JavaScript bundle from 780 KB to 310 KB by splitting routes and replacing two heavy chart libraries.",
          "Wrote unit tests in Jest for the billing screens, raising coverage from 35% to 80% in 6 months.",
        ],
      },
    ],
    projects: [
      {
        name: "Color contrast checker",
        tech: "TypeScript, Vite",
        link: "danielokafor.example.com/contrast",
        bullets: [
          "Made a free browser tool that checks text colors against WCAG contrast ratios, with 2,000 monthly visitors.",
        ],
      },
    ],
    education: [
      {
        school: "Westbridge University",
        degree: "Bachelor of Science",
        field: "Computer Science",
        startDate: "2016",
        endDate: "2020",
      },
    ],
    skills: [
      { label: "Languages", items: ["TypeScript", "JavaScript", "HTML", "CSS"] },
      {
        label: "Frameworks",
        items: ["React", "Next.js", "Redux", "Tailwind CSS", "D3.js"],
      },
      { label: "Quality", items: ["Jest", "Playwright", "Storybook", "WCAG", "Figma"] },
    ],
  },
  lines: [
    {
      weak: "Developed various UI components for the website.",
      strong:
        "Led the move of 120 components into a shared design system in Storybook, used by 4 product teams.",
    },
    {
      weak: "Improved website performance.",
      strong:
        "Rebuilt the product page in Next.js with server rendering, cutting Largest Contentful Paint from 3.9 s to 1.6 s on mid-range phones.",
    },
    {
      weak: "Made the site accessible.",
      strong:
        "Fixed 64 WCAG issues in checkout after an audit, and added Playwright checks so new ones fail the build.",
    },
  ],
  skills: [
    { label: "Languages", items: ["JavaScript", "TypeScript", "HTML", "CSS"] },
    { label: "Frameworks", items: ["React", "Next.js", "Vue", "Angular", "Redux", "Tailwind CSS"] },
    {
      label: "Testing and craft",
      items: ["Jest", "Cypress", "Playwright", "WCAG", "Figma", "Git"],
    },
  ],
  tips: [
    {
      title: "Measure speed the way teams do",
      text: "Name the metric and the device: Largest Contentful Paint on a mid-range phone, bundle size in KB, time to interactive. “Made it faster” gives the interviewer nothing to ask about.",
    },
    {
      title: "Link one live thing",
      text: "A portfolio or a live project lets the reader click instead of trusting you. Put the link in the header, and make sure it loads on a phone.",
    },
    {
      title: "Name the framework the post names",
      text: "If the post asks for React and your work was in React, say React in the line, not only “JavaScript frameworks”. Otto's match check looks for the post's own words.",
    },
  ],
  mistakes: [
    {
      title: "A screenshot portfolio inside the resume",
      text: "Images and design-tool layouts look good to people and read as nothing to hiring software. Keep the resume to text and link the visuals.",
    },
    {
      title: "Every library you have imported",
      text: "Lodash and Axios don't win interviews. List the frameworks and tools you chose and can defend, and leave the rest for the conversation.",
    },
    {
      title: "Vague words like “various” and “several”",
      text: "Otto's line check flags them because they hide the size. Count the components, the pages or the teams instead.",
    },
  ],
  faq: [
    {
      question: "Should a frontend developer resume be designed?",
      answer:
        "Keep it plain. Your portfolio shows your design sense; the resume has to read cleanly in hiring software, which mixes up columns, icons and text boxes. One column of real text is safest.",
    },
    {
      question: "Is React enough, or do I need other frameworks?",
      answer:
        "Match the post. Many teams hire for React with TypeScript, but some ask for Vue or Angular. Name what you have really used, and tailor the order to each job.",
    },
    {
      question: "Do I need a portfolio as a frontend developer?",
      answer:
        "It helps a lot. One or two live projects with a short note on what you built and why are worth more than a long list of tutorials.",
    },
  ],
  related: ["software-engineer", "ui-ux-designer", "backend-developer"],
};
