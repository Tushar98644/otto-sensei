import type { RoleExample } from "../types";

export const graphicDesigner = {
  slug: "graphic-designer",
  role: "Graphic designer",
  occupation: "27-1024.00",
  titles: ["Graphic Designer", "Visual Designer", "Brand Designer", "Production Artist"],
  updated: "2026-11-24",
  card: "Brand, print and social work with the volume and results behind it.",
  description:
    "A graphic designer resume example with brand, print and social lines that show volume, speed and results, plus the Adobe and Figma skills posts ask for.",
  intro:
    "Your portfolio shows how your work looks; your resume shows how you work. Hiring managers read it for volume, speed, the brands you handled and what the designs did for the business. This example puts a number on each.",
  person:
    "Jasmine is made up: a graphic designer with 5 years at a design studio and an in-house brand team, based in Nashville, Tennessee. Names, companies and numbers are invented.",
  resume: {
    title: "Graphic designer resume",
    template: "modern",
    basics: {
      name: "Jasmine Carter",
      headline: "Graphic Designer",
      email: "jasmine.carter@example.com",
      phone: "+1 615 555 0129",
      location: "Nashville, TN",
      links: [{ label: "Portfolio", url: "jasmine-carter.example.com" }],
    },
    summary:
      "Graphic designer with 5 years in brand, packaging and digital design for food and music brands. Works quickly in Adobe Creative Cloud and Figma, and builds templates that keep small teams on brand.",
    experience: [
      {
        company: "Riverbend Coffee Co.",
        title: "Graphic Designer",
        location: "Nashville, TN",
        startDate: "Apr 2023",
        endDate: "Present",
        bullets: [
          "Redesigned packaging for 14 coffee blends in Illustrator and InDesign, helping lift grocery sales by 21% in the first year.",
          "Built a Figma brand kit of 120 templates for social posts, menus and signage, cutting design requests from 35 a week to 12.",
          "Designed 6 email and landing page layouts a month with the marketing team, raising email click rates from 2.4% to 3.8%.",
          "Prepared 300 print files a year for 4 printers with zero rejected jobs, keeping every seasonal launch on its date.",
        ],
      },
      {
        company: "Copper Street Creative",
        title: "Junior Graphic Designer",
        location: "Nashville, TN",
        startDate: "Jun 2021",
        endDate: "Mar 2023",
        bullets: [
          "Designed 40 logos and brand identities for restaurants, venues and record labels, with 90% approved in 2 rounds or fewer.",
          "Made 25 animated social ads a month in After Effects for a concert promoter, lifting ticket link clicks by 34%.",
          "Retouched 2,000 product photos in Photoshop and Lightroom for 3 online stores, turning each batch around in 48 hours.",
        ],
      },
    ],
    education: [
      {
        school: "Southern Lakes College of Art and Design",
        degree: "B.F.A.",
        field: "Graphic Design",
        startDate: "2017",
        endDate: "2021",
      },
    ],
    skills: [
      { label: "Design", items: ["Illustrator", "Photoshop", "InDesign", "Figma"] },
      { label: "Motion and photo", items: ["After Effects", "Premiere Pro", "Lightroom"] },
      { label: "Craft", items: ["Typography", "Packaging", "Print production"] },
    ],
  },
  lines: [
    {
      weak: "Did graphic design for social media.",
      strong:
        "Made 25 animated social ads a month in After Effects for a concert promoter, lifting ticket link clicks by 34%.",
    },
    {
      weak: "Responsible for packaging design.",
      strong:
        "Redesigned packaging for 14 coffee blends in Illustrator and InDesign, helping lift grocery sales by 21% in the first year.",
    },
    {
      weak: "Created various templates for the marketing team.",
      strong:
        "Built a Figma brand kit of 120 templates for social posts, menus and signage, cutting design requests from 35 a week to 12.",
    },
  ],
  skills: [
    {
      label: "Design tools",
      items: ["Illustrator", "Photoshop", "InDesign", "Figma", "Adobe Creative Cloud", "Canva"],
    },
    {
      label: "Motion and photo",
      items: ["After Effects", "Premiere Pro", "Motion design", "Lightroom"],
    },
    {
      label: "Digital and systems",
      items: ["Design systems", "UI design", "HTML", "CSS", "Social media", "Accessibility"],
    },
  ],
  tips: [
    {
      title: "Count what you shipped",
      text: "Pieces a month, campaigns a year, files sent to print. Volume tells an in-house team you can keep up, and it's a number most designers forget to give.",
    },
    {
      title: "Connect the design to a result",
      text: "Sales after new packaging, clicks after a new ad, fewer requests after a template kit. You don't need to claim all the credit; “helping lift sales” is honest and still useful.",
    },
    {
      title: "Let the portfolio do the showing",
      text: "Put the link in your header and name the matching project in a line. The resume says what happened; the portfolio shows how it looked.",
    },
  ],
  mistakes: [
    {
      title: "A resume designed like a poster",
      text: "Columns, icons and skill bars look good to you and break when hiring software reads them. Keep the resume plain and save the craft for the portfolio.",
    },
    {
      title: "Software ratings out of five",
      text: "Four stars in Photoshop means nothing to a reader. List the tools, then show them at work in lines with real projects.",
    },
    {
      title: "Only describing how it looked",
      text: "“Clean, modern, bold” are taste words. Add the brand, the format and what the work did, so a reader who isn't a designer can see the value.",
    },
  ],
  faq: [
    {
      question: "What should a graphic designer resume include?",
      answer:
        "Your design tools, the brands and formats you worked on, a portfolio link, and numbers for volume, turnaround or results. Keep it to one page unless you have well over 10 years of work.",
    },
    {
      question: "Do I need a degree to get hired as a graphic designer?",
      answer:
        "Many posts ask for a bachelor's degree in design or a related field, but a strong portfolio often matters more. If you are self-taught, list courses and certificates under education and lead with your best client work.",
    },
    {
      question: "Is a graphic designer the same as a UI designer?",
      answer:
        "No. A graphic designer works on brand, print, packaging and marketing; a UI designer designs the screens people use. Otto's job matching files them as different jobs, so match your headline to the post.",
    },
  ],
  related: ["ui-ux-designer", "marketing-manager", "digital-marketing"],
} as const satisfies RoleExample;
