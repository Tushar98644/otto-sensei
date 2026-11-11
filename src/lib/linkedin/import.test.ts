import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { ResumeSchema } from "@/lib/resume/validation";
import { csvRecords, parseCsv } from "./csv";
import { linkedInToResume, LinkedInImportError, readLinkedInExport } from "./import";

const NOW = Date.UTC(2026, 10, 7);

// Shaped like a real "Get a copy of your data" export: BOM, CRLF, quoted multi-line fields.
const PROFILE =
  "﻿First Name,Last Name,Maiden Name,Address,Birth Date,Headline,Summary,Industry,Zip Code,Geo Location,Twitter Handles,Websites,Instant Messengers\r\n" +
  'Ana,Souza,,"12 Rua Augusta, Lisbon",,"Product Designer, Fintech","I design calm money apps.\r\nPreviously at two startups.",Design,1100,"Lisbon, Portugal",,"[PORTFOLIO:https://ana.design],[COMPANY:https://contoso.com]",\r\n';
const POSITIONS =
  "Company Name,Title,Description,Location,Started On,Finished On\r\n" +
  'Contoso,Senior Product Designer,"• Led the redesign of the payments flow\r\n• Cut checkout steps from 5 to 3, ""quick pay""",Lisbon,Mar 2022,\r\n' +
  "Fabrikam,Product Designer,Designed onboarding for 2 apps,Remote,Jan 2019,Feb 2022\r\n";
const EDUCATION =
  "School Name,Start Date,End Date,Notes,Degree Name,Activities\r\n" +
  "University of Porto,2014,2018,,Bachelor of Arts - BA,Design society\r\n";
const SKILLS = "Name\r\nFigma\r\nUser Research\r\nfigma\r\n";
const CERTS = "Name,Url,Authority,Started On,Finished On,License Number\r\nGoogle UX Design,,Coursera,Jun 2020,,ABC123\r\n";
const LANGUAGES = "Name,Proficiency\r\nPortuguese,Native or bilingual proficiency\r\nEnglish,Full professional proficiency\r\n";
const HONORS = "Title,Description,Issued On\r\nDesign Award,Best fintech app,Nov 2023\r\n";
const PROJECTS = "Title,Description,Url,Started On,Finished On\r\nBudget app,Side project for 1k users,https://budget.example.com,Jan 2021,\r\n";
const EMAILS =
  "Email Address,Confirmed,Primary,Updated On\r\nold@example.com,Yes,No,\r\nana@example.com,Yes,Yes,\r\n";

describe("parseCsv", () => {
  it("keeps commas, doubled quotes and line breaks inside quoted fields", () => {
    expect(parseCsv('a,"b, c","say ""hi""\nthere"\r\n1,2,3')).toEqual([
      ["a", "b, c", 'say "hi"\nthere'],
      ["1", "2", "3"],
    ]);
  });

  it("treats a quote mid-field as a literal character", () => {
    expect(parseCsv('24" monitor,ok')).toEqual([['24" monitor', "ok"]]);
  });

  it("finds the header row after a notes preamble", () => {
    const text = 'Notes:\n"When exporting, some fields may be blank."\n\nFirst Name,Last Name\nAna,Souza\n';
    expect(csvRecords(text, ["First Name"])).toEqual([{ "first name": "Ana", "last name": "Souza" }]);
  });
});

describe("linkedInToResume", () => {
  const all = {
    profile: PROFILE,
    positions: POSITIONS,
    education: EDUCATION,
    skills: SKILLS,
    certifications: CERTS,
    languages: LANGUAGES,
    honors: HONORS,
    projects: PROJECTS,
    emails: EMAILS,
  };

  it("maps every file into a valid resume", () => {
    const { resume, counts } = linkedInToResume(all, NOW);
    expect(ResumeSchema.safeParse(resume).success).toBe(true);
    expect(resume.source).toBe("import");
    expect(resume.basics).toMatchObject({
      name: "Ana Souza",
      headline: "Product Designer, Fintech",
      email: "ana@example.com",
      location: "Lisbon, Portugal",
    });
    // The street address is private and never copied.
    expect(JSON.stringify(resume)).not.toContain("Rua Augusta");
    expect(resume.basics.links.map((l) => l.url)).toEqual(["https://ana.design", "https://contoso.com"]);
    expect(resume.summary).toContain("Previously at two startups.");

    const [current, past] = resume.experience;
    expect(current).toMatchObject({ company: "Contoso", startDate: "Mar 2022", endDate: "Present" });
    expect(current?.bullets.map((b) => b.text)).toEqual([
      "Led the redesign of the payments flow",
      'Cut checkout steps from 5 to 3, "quick pay"',
    ]);
    expect(past).toMatchObject({ endDate: "Feb 2022", bullets: [{ text: "Designed onboarding for 2 apps" }] });

    expect(resume.education[0]).toMatchObject({ school: "University of Porto", degree: "Bachelor of Arts - BA" });
    expect(resume.education[0]?.bullets.map((b) => b.text)).toEqual(["Activities: Design society"]);
    expect(resume.skills).toEqual([expect.objectContaining({ label: "", items: ["Figma", "User Research"] })]);
    expect(resume.certifications[0]).toMatchObject({ name: "Google UX Design", issuer: "Coursera", date: "Jun 2020" });
    expect(resume.projects[0]).toMatchObject({ name: "Budget app", link: "https://budget.example.com" });

    const languages = resume.extras?.find((s) => s.kind === "languages");
    expect(languages?.items.map((i) => [i.title, i.subtitle])).toEqual([
      ["Portuguese", "Native or bilingual proficiency"],
      ["English", "Full professional proficiency"],
    ]);
    const awards = resume.extras?.find((s) => s.kind === "awards");
    expect(awards?.items[0]).toMatchObject({ title: "Design Award", date: "Nov 2023", detail: "Best fintech app" });
    expect(counts).toEqual({ jobs: 2, schools: 1, skills: 2, certifications: 1, projects: 1, languages: 2, honors: 1 });
  });

  it("refuses a ZIP without the profile, positions or education files", () => {
    expect(() => linkedInToResume({ skills: SKILLS }, NOW)).toThrow(LinkedInImportError);
  });
});

describe("readLinkedInExport", () => {
  it("reads the CSVs from a real ZIP, inside a folder and in any case", async () => {
    const zip = new JSZip();
    zip.file("Basic_LinkedInDataExport_11-07-2026/Profile.csv", PROFILE);
    zip.file("Basic_LinkedInDataExport_11-07-2026/Positions.csv", POSITIONS);
    zip.file("Basic_LinkedInDataExport_11-07-2026/Jobs/Job Applications.csv", "Application Date\n");
    const bytes = await zip.generateAsync({ type: "uint8array" });
    const { resume, counts } = await readLinkedInExport(bytes, NOW);
    expect(resume.basics.name).toBe("Ana Souza");
    expect(counts.jobs).toBe(2);
  });

  it("says plainly when the file isn't a ZIP", async () => {
    await expect(readLinkedInExport(new TextEncoder().encode("not a zip"), NOW)).rejects.toMatchObject({
      code: "not_zip",
    });
  });
});
