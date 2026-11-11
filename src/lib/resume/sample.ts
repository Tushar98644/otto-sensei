import {
  DEFAULT_SECTION_ORDER,
  DEFAULT_TEMPLATE,
  newBullet,
  newId,
  type Experience,
  type Resume,
  type SkillGroup,
} from "./schema";

function job(fields: Omit<Experience, "id" | "bullets">, bullets: string[]): Experience {
  return { id: newId(), ...fields, bullets: bullets.map((text) => newBullet(text)) };
}

function skills(label: string, items: string[]): SkillGroup {
  return { id: newId(), label, items };
}

export function createSampleResume(now = Date.now()): Resume {
  return {
    id: newId(),
    version: 1,
    title: "Sample resume",
    basics: {
      name: "Jordan Ellis",
      headline: "Product Marketing Manager",
      email: "jordan.ellis@example.com",
      phone: "+1 555 014 2398",
      location: "Remote",
      links: [{ id: newId(), label: "Portfolio", url: "portfolio.example.com/jordan-ellis" }],
    },
    summary:
      "Results-driven product marketer with 7 years in B2B software. I turn complex features " +
      "into clear stories that help sales teams win deals.",
    experience: [
      job(
        {
          company: "Brightloop",
          title: "Product Marketing Manager",
          location: "Remote",
          startDate: "Mar 2022",
          endDate: "Present",
        },
        [
          "Led the launch of an analytics add-on that reached 1,200 paying teams and $1.4M in yearly revenue in its first 12 months.",
          "Responsible for creating sales enablement materials for the sales team.",
          "Rebuilt the pricing page with the design and growth teams, lifting trial-to-paid conversion from 9% to 13% in one quarter.",
          "I worked closely with product managers to define messaging for various new features.",
          "Ran customer interviews to sharpen positioning for mid-size companies.",
        ],
      ),
      job(
        {
          company: "Northwind Analytics",
          title: "Marketing Specialist",
          location: "",
          startDate: "Jun 2019",
          endDate: "Feb 2022",
        },
        [
          "Grew the email newsletter from 8,000 to 31,000 subscribers in two years by testing new content formats every week.",
          "Helped with the company blog and social media channels.",
          "Team player who thrives under pressure in a fast-paced environment.",
          "Coordinated 14 partner webinars that brought in 2,300 sign-ups and 410 sales-qualified leads.",
        ],
      ),
      job(
        {
          company: "Fieldnote Studio",
          title: "Marketing Coordinator",
          location: "",
          startDate: "Aug 2017",
          endDate: "May 2019",
        },
        [
          "Managed the events calendar and booked venues for trade shows.",
          "Wrote customer case studies that the sales team used in late-stage deals.",
        ],
      ),
    ],
    education: [
      {
        id: newId(),
        school: "Westbridge University",
        degree: "Bachelor of Arts",
        field: "Communication",
        location: "",
        startDate: "2013",
        endDate: "2017",
        bullets: [],
      },
    ],
    projects: [
      {
        id: newId(),
        name: "Product launch checklist",
        link: "example.com/launch-checklist",
        bullets: [
          newBullet(
            "Published a free product launch checklist that more than 3,000 marketers have downloaded.",
          ),
        ],
      },
    ],
    skills: [
      skills("Marketing", [
        "Positioning",
        "Messaging",
        "Go-to-market strategy",
        "Competitive analysis",
        "Pricing",
        "Customer research",
      ]),
      skills("Tools", ["HubSpot", "Salesforce", "Google Analytics", "Figma", "Notion", "SQL"]),
    ],
    certifications: [
      {
        id: newId(),
        name: "Product Marketing Certification",
        issuer: "Marketing Skills Academy",
        date: "2021",
      },
    ],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    source: "sample",
    tailor: null,
    template: DEFAULT_TEMPLATE,
    extras: [],
    createdAt: now,
    updatedAt: now,
  };
}
