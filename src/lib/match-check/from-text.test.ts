import { describe, expect, it } from "vitest";
import { matchCheckFromText, resumeTextLines } from "./from-text";
import { DESIGNER_POST, DESIGNER_RESUME } from "./test-fixtures";

describe("resumeTextLines", () => {
  const lines = resumeTextLines(DESIGNER_RESUME);
  const line = (start: string) => lines.find((item) => item.text.startsWith(start));

  it("names each line's place after the heading above it, in sentence case", () => {
    expect(line("Led the redesign")).toEqual({
      text: "Led the redesign of onboarding in Figma, lifting completion by 18%",
      place: "Work history",
      shown: true,
    });
    expect(line("Google UX")?.place).toBe("Certifications");
  });

  it("treats the skills list and the top lines as listed, and a summary as shown", () => {
    expect(line("TOOLS:")).toMatchObject({ place: "Tools", shown: false });
    expect(line("JORDAN ELLIS")).toMatchObject({ place: "Top of your resume", shown: false });
    expect(line("Product Designer |")?.shown).toBe(false);
    expect(line("Designer who ships")).toMatchObject({ place: "Profile", shown: true });
  });

  it("counts a spoken language in a languages section as shown", () => {
    expect(line("English (native)")).toMatchObject({ place: "Languages", shown: true });
    expect(resumeTextLines("Languages\nPython, Go, SQL")[0]?.shown).toBe(false);
  });

  it("treats an inline 'Languages:' list of programming languages as listed, and spoken ones as shown", () => {
    const inline = resumeTextLines(
      "TECHNICAL SKILLS\nLanguages: Python, Go, TypeScript\nSpoken languages: Spanish (native)",
    );
    expect(inline).toEqual([
      { text: "Languages: Python, Go, TypeScript", place: "Languages", shown: false },
      { text: "Spoken languages: Spanish (native)", place: "Spoken languages", shown: true },
    ]);
    const check = matchCheckFromText(
      "JANE DOE\nTECHNICAL SKILLS\nLanguages: Python, Go, TypeScript",
      "Requirements\n- Strong Python",
    );
    expect(check.rows[0]).toMatchObject({ term: "Python", status: "listed" });
  });
});

describe("a paragraph that ends in a skills list", () => {
  it("keeps the list apart, so a skill only in it is listed", () => {
    const resume =
      "Frontend developer building dashboards in React. Skills: JavaScript, React, Git. Languages: Spanish (native)";
    expect(resumeTextLines(resume)).toEqual([
      {
        text: "Frontend developer building dashboards in React.",
        place: "Top of your resume",
        shown: true,
      },
      { text: "Skills: JavaScript, React, Git.", place: "Skills", shown: false },
      { text: "Languages: Spanish (native)", place: "Languages", shown: true },
    ]);
    const check = matchCheckFromText(resume, "Requirements\n- JavaScript\n- React");
    expect(check.rows.map((row) => [row.term, row.status])).toEqual([
      ["JavaScript", "listed"],
      ["React", "shown"],
    ]);
  });

  it("doesn't split a sentence at a colon that isn't a heading", () => {
    expect(resumeTextLines("Cut costs by 30%. Result: two more launches a year.")).toHaveLength(1);
  });
});

describe("matchCheckFromText", () => {
  it("compares pasted resume text with a pasted post", () => {
    const check = matchCheckFromText(DESIGNER_RESUME, DESIGNER_POST);
    expect(
      check.rows.map((row) => [row.term, row.importance, row.status, row.where?.place]),
    ).toEqual([
      ["Figma", "must", "shown", "Work history"],
      ["Prototyping", "must", "shown", "Work history"],
      ["Usability testing", "must", "shown", "Work history"],
      ["User research", "must", "missing", undefined],
      ["Design systems", "must", "shown", "Work history"],
      ["Spanish", "nice", "shown", "Languages"],
      ["Framer", "nice", "shown", "Work history"],
      ["Webflow", "nice", "listed", "Tools"],
      ["HTML", "nice", "missing", undefined],
      ["CSS", "nice", "missing", undefined],
    ]);
    expect(check).toMatchObject({
      total: 10,
      found: 7,
      shown: 6,
      listed: 1,
      must: { found: 4, total: 5 },
      nice: { found: 3, total: 5 },
      asks: ["5+ years designing digital products"],
    });
  });

  it("handles empty input", () => {
    expect(matchCheckFromText("", "")).toMatchObject({ total: 0, found: 0, rows: [] });
    expect(matchCheckFromText("", DESIGNER_POST).found).toBe(0);
  });
});
