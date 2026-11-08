import { describe, expect, it } from "vitest";
import { TEXT_LIMITS } from "@/config/plans";
import { extractDocx } from "@/lib/parse/docx";
import { extractPdf } from "@/lib/parse/pdf";
import { cleanResumePdf, templateDocx } from "@/lib/parse/test-fixtures";
import { heuristicParse } from "./heuristic-parse";
import { ResumeSchema, extrasOf, type ExtraSection, type Resume } from "./schema";

const NOW = 1_800_000_000_000;

function parse(text: string): Resume {
  const resume = heuristicParse(text, NOW);
  // Must always be storable as-is.
  expect(ResumeSchema.parse(resume)).toEqual(resume);
  expect(resume.source).toBe("import");
  return resume;
}

const bullets = (items: { text: string }[]) => items.map((item) => item.text);
const titles = (section: ExtraSection) => section.items.map((item) => item.title);
const items = (section: ExtraSection) =>
  section.items.map((item) => [item.title, item.subtitle, item.date, item.detail]);

describe("heuristicParse", () => {
  it("structures text extracted from a clean PDF", async () => {
    const { text } = await extractPdf(await cleanResumePdf());
    const resume = parse(text);

    expect(resume.basics).toMatchObject({
      name: "Jane Doe",
      headline: "Senior Software Engineer",
      email: "jane.doe@example.com",
      phone: "+1 555 123 4567",
      location: "Berlin, Germany",
    });
    expect(resume.summary).toBe(
      "Backend engineer with eight years of experience building payment and data systems for fast-growing companies. I like clear code, calm on-call rotations and teams that ship small changes often.",
    );
    expect(resume.experience).toHaveLength(2);
    expect(resume.experience[0]).toMatchObject({
      title: "Senior Software Engineer",
      company: "Acme Corp",
      startDate: "Jan 2021",
      endDate: "Present",
    });
    expect(bullets(resume.experience[0]?.bullets ?? [])).toEqual([
      "Built a payment API in Go that handles two million requests a day with 99.99% uptime.",
      // The wrapped second line is joined back onto its bullet.
      "Led a team of five engineers through a move to Kubernetes, cutting release time from two days to two hours.",
      "Mentored three junior developers, and all three were promoted within a year.",
    ]);
    expect(resume.experience[1]).toMatchObject({
      title: "Software Engineer",
      company: "Beta Labs",
      startDate: "Mar 2018",
      endDate: "Dec 2020",
    });
    expect(resume.experience[1]?.bullets).toHaveLength(3);
    expect(resume.education).toEqual([
      expect.objectContaining({
        school: "University of Somewhere",
        degree: "BSc",
        field: "Computer Science",
        startDate: "Sep 2014",
        endDate: "Jun 2018",
      }),
    ]);
    // "Languages: English, German" sits under Skills, so it stays a skill group.
    expect(resume.skills.map((group) => [group.label, group.items])).toEqual([
      ["", ["Python", "TypeScript", "Go", "PostgreSQL", "AWS", "Docker", "Kubernetes"]],
      ["Languages", ["English", "German"]],
    ]);
    expect(resume.extras).toEqual([]);
    expect(resume.sectionOrder).toEqual([
      "summary",
      "experience",
      "education",
      "skills",
      "projects",
      "certifications",
    ]);
    expect(resume.createdAt).toBe(NOW);
  });

  it("structures text extracted from a Word file, without inventing what isn't there", async () => {
    const { text } = await extractDocx(await templateDocx());
    const resume = parse(text);
    expect(resume.basics).toMatchObject({
      name: "Sam Rivera",
      email: "",
      phone: "+1 (415) 555-0134",
      location: "San Francisco, CA",
    });
    expect(resume.experience).toEqual([
      expect.objectContaining({
        title: "Lead Developer",
        company: "Contoso Ltd",
        startDate: "Feb 2019",
        endDate: "Present",
      }),
    ]);
    expect(bullets(resume.experience[0]?.bullets ?? [])).toContain(
      "Built a hiring dashboard used by 300 recruiters.",
    );
    expect(resume.education[0]).toMatchObject({
      school: "University of Somewhere",
      degree: "BA",
      field: "Economics",
      endDate: "2018",
    });
  });

  it("handles company-first headers, numbered bullets and dates on their own line", () => {
    const resume = parse(
      [
        "Tom Becker",
        "Berlin, Germany | tom.becker@example.de | +49 30 1234567 | linkedin.com/in/tombecker",
        "Experience",
        "Canva | Senior Product Designer | Mar 2020 - Present",
        "1. Led the redesign of the editor toolbar.",
        "2. Ran 40 user interviews.",
        "2019 – 2021",
        "Junior Analyst at Deutsche Bank",
        "1) Cleaned and joined five data sources.",
        "Shopify — Developer Intern\tSummer 2018",
        "- Built an internal dashboard.",
      ].join("\n"),
    );
    expect(resume.basics.links.map((link) => [link.label, link.url])).toEqual([
      ["LinkedIn", "linkedin.com/in/tombecker"],
    ]);
    expect(
      resume.experience.map((job) => [
        job.title,
        job.company,
        job.startDate,
        job.endDate,
        bullets(job.bullets),
      ]),
    ).toEqual([
      [
        "Senior Product Designer",
        "Canva",
        "Mar 2020",
        "Present",
        ["Led the redesign of the editor toolbar.", "Ran 40 user interviews."],
      ],
      [
        "Junior Analyst",
        "Deutsche Bank",
        "2019",
        "2021",
        ["Cleaned and joined five data sources."],
      ],
      ["Developer Intern", "Shopify", "Summer 2018", "", ["Built an internal dashboard."]],
    ]);
  });

  it("splits unbulleted jobs (as Word lists arrive) on their header lines", () => {
    const resume = parse(
      [
        "Sam Rivera",
        "Experience",
        "Lead Developer, Contoso Ltd",
        "Feb 2019 - Present",
        "Built a hiring dashboard used by 300 recruiters",
        "Mentored two junior engineers",
        "Fabrikam Inc",
        "Developer",
        "Jan 2016 - Jan 2019",
        "Wrote the billing service",
      ].join("\n"),
    );
    expect(resume.experience.map((job) => [job.title, job.company, bullets(job.bullets)])).toEqual([
      [
        "Lead Developer",
        "Contoso Ltd",
        ["Built a hiring dashboard used by 300 recruiters", "Mentored two junior engineers"],
      ],
      ["Developer", "Fabrikam Inc", ["Wrote the billing service"]],
    ]);
  });

  it("recognises places with state codes and keeps school names whole", () => {
    const resume = parse(
      [
        "Ana Silva",
        "Denver, CO | ana@example.com",
        "EXPERIENCE",
        "Analyst, Acme Corp, Boston, MA\tJun 2020 - Present",
        "• Built dashboards.",
        "EDUCATION",
        "University of Maryland, College Park, MD",
        "MS Data Science, 2020",
      ].join("\n"),
    );
    expect(resume.basics.location).toBe("Denver, CO");
    expect(resume.experience[0]).toMatchObject({
      title: "Analyst",
      company: "Acme Corp",
      location: "Boston, MA",
    });
    expect(resume.education[0]).toMatchObject({
      school: "University of Maryland",
      location: "College Park, MD",
      degree: "MS",
      field: "Data Science",
      endDate: "2020",
    });
  });

  it("reads projects, certifications, languages and labelled skill groups", () => {
    const resume = parse(
      [
        "Priya Nair",
        "PROJECTS",
        "Typeface Finder - A browser tool that names any font on a web page.",
        "github.com/priya/typeface-finder",
        "• Used by 12,000 designers in its first month.",
        "CERTIFICATIONS",
        "Google UX Design Certificate - Coursera, 2021",
        "Certified Scrum Product Owner (CSPO) | Scrum Alliance | Jan 2019",
        "SKILLS",
        "Python | SQL | Excel (Power Query, Pivot Tables)",
        "Tools: dbt, Airflow, Looker",
        "LANGUAGES",
        "English (native), Spanish",
        "REFERENCES",
        "Jo Smith, +44 20 7946 0000",
      ].join("\n"),
    );
    expect(resume.projects).toEqual([
      expect.objectContaining({
        name: "Typeface Finder",
        link: "github.com/priya/typeface-finder",
      }),
    ]);
    expect(bullets(resume.projects[0]?.bullets ?? [])).toEqual([
      "A browser tool that names any font on a web page.",
      "Used by 12,000 designers in its first month.",
    ]);
    expect(resume.certifications.map((cert) => [cert.name, cert.issuer, cert.date])).toEqual([
      ["Google UX Design Certificate", "Coursera", "2021"],
      ["Certified Scrum Product Owner (CSPO)", "Scrum Alliance", "Jan 2019"],
    ]);
    expect(resume.skills.map((group) => [group.label, group.items])).toEqual([
      ["", ["Python", "SQL", "Excel (Power Query, Pivot Tables)"]],
      ["Tools", ["dbt", "Airflow", "Looker"]],
    ]);
    expect(extrasOf(resume).map((section) => [section.kind, items(section)])).toEqual([
      [
        "languages",
        [
          ["English", "native", "", ""],
          ["Spanish", "", "", ""],
        ],
      ],
    ]);
    // A referee's phone number is never taken as the candidate's.
    expect(resume.basics.phone).toBe("");
  });

  it("keeps languages, awards, volunteering, publications and interests as extra sections", () => {
    const resume = parse(
      [
        "Lena Fischer",
        "EXPERIENCE",
        "Product Designer, Northwind\tJan 2021 - Present",
        "• Redesigned checkout for 2 million shoppers.",
        "VOLUNTEER EXPERIENCE",
        "Mentor, Code Club\t2019 - 2022",
        "• Taught 30 children to build their first website.",
        "HONORS & AWARDS",
        "• Designer of the Year | Northwind | 2023",
        "• Dean's List, University of Leeds",
        "PUBLICATIONS",
        "Designing calm dashboards - UX Collective, 2022",
        "Fischer, L. (2021). Forms people finish. Journal of Usability Studies, 16(2).",
        "LANGUAGES",
        "German (native), English – C2 | Spanish: conversational",
        "INTERESTS",
        "Bouldering, film photography, jazz piano",
        "REFERENCES",
        "Available on request.",
      ].join("\n"),
    );
    expect(resume.experience.map((job) => job.company)).toEqual(["Northwind"]);
    expect(resume.sectionOrder[0]).toBe("experience");
    expect(
      extrasOf(resume).map((section) => [section.kind, section.title, items(section)]),
    ).toEqual([
      ["volunteering", "Volunteer Experience", [["Mentor", "Code Club", "2019 – 2022", ""]]],
      [
        "awards",
        "Honors & Awards",
        [
          ["Designer of the Year", "Northwind", "2023", ""],
          ["Dean's List", "University of Leeds", "", ""],
        ],
      ],
      [
        "publications",
        "Publications",
        [
          ["Designing calm dashboards", "UX Collective", "2022", ""],
          [
            "",
            "",
            "",
            "Fischer, L. (2021). Forms people finish. Journal of Usability Studies, 16(2).",
          ],
        ],
      ],
      [
        "languages",
        "Languages",
        [
          ["German", "native", "", ""],
          ["English", "C2", "", ""],
          ["Spanish", "conversational", "", ""],
        ],
      ],
      ["custom", "Interests", [["", "", "", "Bouldering, film photography, jazz piano"]]],
    ]);
    expect(bullets(extrasOf(resume)[0]?.items[0]?.bullets ?? [])).toEqual([
      "Taught 30 children to build their first website.",
    ]);
  });

  it("gives bullets under an unmarked line to that entry, and joins a continued heading", () => {
    const resume = parse(
      [
        "Sam Okoye",
        "Awards",
        "Hackathon winner\t2020",
        "• Built a food bank app in 24 hours with a team of four.",
        "Community Service",
        "Food bank volunteer, Leeds Food Aid",
        "Sorted donations every Saturday for 2 years.",
        "Awards",
        "Best Paper Award | ACM CHI | 2019",
      ].join("\n"),
    );
    expect(
      extrasOf(resume).map((section) => [section.kind, section.title, items(section)]),
    ).toEqual([
      ["awards", "Awards", [["Hackathon winner", "", "2020", ""]]],
      [
        "volunteering",
        "Community Service",
        [
          [
            "Food bank volunteer",
            "Leeds Food Aid",
            "",
            "Sorted donations every Saturday for 2 years.",
          ],
        ],
      ],
      ["awards", "Awards", [["Best Paper Award", "ACM CHI", "2019", ""]]],
    ]);
    expect(bullets(extrasOf(resume)[0]?.items[0]?.bullets ?? [])).toEqual([
      "Built a food bank app in 24 hours with a team of four.",
    ]);
  });

  it("merges a section that carries on under the same heading", () => {
    const resume = parse(
      ["Ana", "AWARDS", "• Dean's List", "AWARDS (CONTINUED)", "• Hackathon winner"].join("\n"),
    );
    expect(extrasOf(resume).map((section) => [section.title, titles(section)])).toEqual([
      ["Awards", ["Dean's List", "Hackathon winner"]],
    ]);
  });

  it("puts everything in the summary when there are no headings to go on", () => {
    const resume = parse(
      [
        "Maria Lopez",
        "maria.lopez@example.com",
        "I am a teacher with ten years of experience in primary schools.",
        "Lincoln Elementary School, 2015 to 2024, Grade 3 teacher.",
        "Skills: Classroom management, Lesson planning, Spanish",
      ].join("\n"),
    );
    expect(resume.basics.name).toBe("Maria Lopez");
    expect(resume.summary).toBe(
      "I am a teacher with ten years of experience in primary schools. Lincoln Elementary School, 2015 to 2024, Grade 3 teacher.",
    );
    expect(resume.skills[0]?.items).toEqual(["Classroom management", "Lesson planning", "Spanish"]);
    expect(resume.experience).toEqual([]);
  });

  it("never throws and always returns a valid resume", () => {
    const inputs = [
      "",
      "   \n\n  ",
      "%PDF-1.7 \u0000\u0001 binary junk \uffff",
      "EXPERIENCE\nEXPERIENCE\nSKILLS",
      `Name\n${"EXPERIENCE\n".repeat(50)}${"• bullet that goes on and on ".repeat(200)}`,
      `A\nSKILLS\n${Array.from({ length: 500 }, (_, i) => `Skill${i}`).join(", ")}`,
      "x".repeat(TEXT_LIMITS.resumeChars * 2),
      `Jane\nEXPERIENCE\n${Array.from({ length: 80 }, (_, i) => `Engineer ${i}, Acme Corp\tJan 2001 - Present\n• Did thing ${i}`).join("\n")}`,
    ];
    for (const input of inputs) {
      const resume = parse(input);
      expect(resume.experience.length).toBeLessThanOrEqual(40);
      expect(resume.skills.every((group) => group.items.length <= 100)).toBe(true);
    }
  });

  it("keeps text as written and clips it to the schema's limits", () => {
    const longName = "Ö".repeat(250);
    const resume = parse(
      `${longName}\nEXPERIENCE\nEngineer, Acme Corp\t2020 - Present\n• ${"word ".repeat(400)}`,
    );
    expect(resume.basics.name).toBe("");
    expect(resume.experience[0]?.bullets[0]?.text.length).toBeLessThanOrEqual(1_000);
    const emoji = parse(`Jane 😀\nSUMMARY\n${"😀".repeat(2_000)}`);
    expect(emoji.summary.length).toBeLessThanOrEqual(3_000);
    // A clipped string never ends in half of a surrogate pair.
    expect(/[\ud800-\udbff]$/.test(emoji.summary)).toBe(false);
  });
});
