import { describe, expect, it } from "vitest";
import {
  bulletText,
  classifyHeading,
  dateStyle,
  extraKindOf,
  findDateRanges,
  findEmail,
  findLinks,
  findPhone,
  findSections,
  headingsInLine,
  headingTitle,
  matchHeading,
  splitInlineHeading,
  splitIntoSections,
} from "./sections";

describe("matchHeading", () => {
  it.each([
    ["WORK EXPERIENCE", "experience"],
    ["Professional Experience", "experience"],
    ["Employment History:", "experience"],
    ["Relevant Work Experience", "experience"],
    ["Selected Professional Experience", "experience"],
    ["Experience (continued)", "experience"],
    ["Internships", "experience"],
    ["Volunteer Experience", "experience"],
    ["W O R K  E X P E R I E N C E", "experience"],
    ["E X P E R I E N C E", "experience"],
    ["— EXPERIENCE —", "experience"],
    ["Technical Skills", "skills"],
    ["Core Competencies", "skills"],
    ["Skills & Tools", "skills"],
    ["SKILLS:", "skills"],
    ["Areas of Expertise", "skills"],
    ["Languages & Tools", "skills"],
    ["Profile", "summary"],
    ["About Me", "summary"],
    ["Professional Summary", "summary"],
    ["Career Objective", "summary"],
    ["Summary of Qualifications", "summary"],
    ["Licenses & Certifications", "certifications"],
    ["Certifications and Training", "certifications"],
    ["Personal Projects", "projects"],
    ["Open Source Contributions", "projects"],
    ["Academic Background", "education"],
    ["EDUCATION", "education"],
    ["Education & Training", "education"],
    ["  education  ", "education"],
  ])("maps %j to %s", (line, section) => {
    expect(matchHeading(line)).toBe(section);
  });

  it.each([
    "",
    "Jane Doe",
    "I have experience leading teams across education and skills.",
    "Experience with Python and Go",
    "Built an education platform for 2 million students",
    "• Experience",
    "- Skills",
    "jane@example.com",
    "Senior Software Engineer, Acme Corp\tJan 2021 - Present",
    "Skills: Python, Go",
    "Awards",
    "LANGUAGES",
    "This line is far too long to be a section heading even though it mentions experience",
  ])("rejects %j", (line) => {
    expect(matchHeading(line)).toBeNull();
  });

  it("only treats easily confused single words as headings in capitals or with a colon", () => {
    expect(classifyHeading("Leadership")).toBeNull();
    expect(classifyHeading("LEADERSHIP")).toBe("other");
    expect(classifyHeading("Leadership:")).toBe("other");
    expect(matchHeading("Tools")).toBeNull();
    expect(matchHeading("TOOLS")).toBe("skills");
  });
});

describe("findSections", () => {
  it("lists headings in reading order with their line numbers", () => {
    const lines = [
      "Jane Doe",
      "SUMMARY",
      "Engineer.",
      "Experience",
      "Acme",
      "AWARDS",
      "Skills",
      "Go",
    ];
    expect(findSections(lines)).toEqual([
      { lineIndex: 1, section: "summary", text: "SUMMARY" },
      { lineIndex: 3, section: "experience", text: "Experience" },
      { lineIndex: 6, section: "skills", text: "Skills" },
    ]);
  });

  it("finds side-by-side headings from two-column rows", () => {
    expect(headingsInLine("SKILLS\tEXPERIENCE").map((heading) => heading.kind)).toEqual([
      "skills",
      "experience",
    ]);
    expect(findSections(["CONTACT\tEXPERIENCE"])).toEqual([
      { lineIndex: 0, section: "experience", text: "EXPERIENCE" },
    ]);
  });
});

describe("splitIntoSections", () => {
  it("splits at headings and merges a repeated heading into the block above", () => {
    const blocks = splitIntoSections([
      "Jane",
      "EXPERIENCE",
      "Job A",
      "EXPERIENCE (CONTINUED)",
      "Job B",
      "LANGUAGES",
      "English",
      "INTERESTS",
      "Chess",
    ]);
    expect(blocks.map((block) => [block.kind, block.lines])).toEqual([
      [null, ["Jane"]],
      ["experience", ["Job A", "Job B"]],
      ["other", ["English"]],
      ["other", ["Chess"]],
    ]);
    expect(blocks[1]?.start).toBe(2);
  });

  it("keeps volunteer experience apart from the jobs above it", () => {
    const blocks = splitIntoSections([
      "EXPERIENCE",
      "Job A",
      "VOLUNTEER EXPERIENCE",
      "Tutor",
      "VOLUNTEER EXPERIENCE (CONTINUED)",
      "Mentor",
    ]);
    expect(blocks.map((block) => [block.kind, block.heading, block.lines])).toEqual([
      ["experience", "EXPERIENCE", ["Job A"]],
      ["experience", "VOLUNTEER EXPERIENCE", ["Tutor", "Mentor"]],
    ]);
  });
});

describe("extraKindOf", () => {
  it.each([
    ["LANGUAGES", "languages"],
    ["Spoken Languages", "languages"],
    ["Awards", "awards"],
    ["HONORS & AWARDS", "awards"],
    ["Honours", "awards"],
    ["Scholarships", "awards"],
    ["VOLUNTEERING", "volunteering"],
    ["Volunteer Experience", "volunteering"],
    ["Community Volunteering", "volunteering"],
    ["Community Service", "volunteering"],
    ["Publications", "publications"],
    ["Selected Publications", "publications"],
    ["Interests", "custom"],
    ["Hobbies & Interests", "custom"],
    ["PROFESSIONAL MEMBERSHIPS", "custom"],
  ] as const)("%s becomes %s", (line, kind) => {
    expect(extraKindOf(line)).toBe(kind);
  });

  it.each([
    "References",
    "Personal Details",
    "Contact Information",
    "CONTACT",
    "Experience",
    "Work and Volunteer Experience",
    "Programming Languages",
    "Skills",
    "Volunteering",
    "Led a team of five",
  ])("keeps %s out of the extras", (line) => {
    expect(extraKindOf(line)).toBeNull();
  });
});

describe("headingTitle", () => {
  it("tidies a heading into a section title", () => {
    expect(headingTitle("HONORS & AWARDS:")).toBe("Honors & Awards");
    expect(headingTitle("AWARDS AND HONORS")).toBe("Awards and Honors");
    expect(headingTitle("— VOLUNTEER WORK (CONTINUED) —")).toBe("Volunteer Work");
    expect(headingTitle("Languages spoken")).toBe("Languages spoken");
  });
});

describe("splitInlineHeading", () => {
  it("splits a labelled line", () => {
    expect(splitInlineHeading("Technical Skills: Python, Go")).toEqual({
      kind: "skills",
      label: "Technical Skills",
      rest: "Python, Go",
    });
    expect(splitInlineHeading("Built: a thing")).toBeNull();
  });
});

describe("line patterns", () => {
  it("strips bullet markers, including Word's private-use bullet glyph", () => {
    expect(bulletText("• Built a thing")).toBe("Built a thing");
    expect(bulletText("- Built a thing")).toBe("Built a thing");
    expect(bulletText("1. Built a thing")).toBe("Built a thing");
    expect(bulletText("\uf0b7 Built a thing")).toBe("Built a thing");
    expect(bulletText("o Built a thing")).toBe("Built a thing");
    expect(bulletText("-5% churn")).toBeNull();
    expect(bulletText("2019 - 2021")).toBeNull();
    expect(bulletText("Built a thing")).toBeNull();
  });

  it("finds date ranges as written", () => {
    expect(findDateRanges("Acme Corp\tJan 2021 - Present")).toEqual([
      { text: "Jan 2021 - Present", start: "Jan 2021", end: "Present", index: 10 },
    ]);
    expect(findDateRanges("2019 – 2021").map((range) => [range.start, range.end])).toEqual([
      ["2019", "2021"],
    ]);
    expect(findDateRanges("03/2020 to 06/2022").map((range) => [range.start, range.end])).toEqual([
      ["03/2020", "06/2022"],
    ]);
    expect(findDateRanges("September 2019 — current")[0]?.end).toBe("current");
    expect(findDateRanges("Managed 2000-3000 users")).toEqual([]);
  });

  it("classifies date styles", () => {
    expect(dateStyle("Jan 2021")).toBe("month-name");
    expect(dateStyle("January 2021")).toBe("month-name");
    expect(dateStyle("01/2021")).toBe("numeric");
    expect(dateStyle("2021")).toBe("year");
    expect(dateStyle("Summer 2021")).toBe("season");
  });

  it("finds emails and international phone numbers, not dates or ids", () => {
    expect(findEmail("Contact: jane.doe+jobs@example.co.uk.")).toBe("jane.doe+jobs@example.co.uk");
    expect(findPhone("Call +1 (415) 555-0134 today")).toBe("+1 (415) 555-0134");
    expect(findPhone("+44 20 7946 0958")).toBe("+44 20 7946 0958");
    expect(findPhone("07700 900123")).toBe("07700 900123");
    expect(findPhone("555.123.4567")).toBe("555.123.4567");
    expect(findPhone("2019 - 2021")).toBeNull();
    expect(findPhone("12.05.2021")).toBeNull();
    expect(findPhone("Order 1234567")).toBeNull();
    expect(findPhone("Grew revenue 25% to 3.4M")).toBeNull();
  });

  it("finds profile links and labels them by site", () => {
    expect(
      findLinks("linkedin.com/in/jane-doe | https://github.com/jane | www.janedoe.dev."),
    ).toEqual([
      { label: "LinkedIn", url: "linkedin.com/in/jane-doe" },
      { label: "GitHub", url: "https://github.com/jane" },
      { label: "janedoe.dev", url: "www.janedoe.dev" },
    ]);
  });
});
