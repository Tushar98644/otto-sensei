import { describe, expect, it } from "vitest";
import { emptyResume, newBullet, newExperience, type Resume } from "@/lib/resume/schema";
import { emailLink, webLink } from "./links";
import { buildPdfModel } from "./model";
import { defaultPageSize, isPdfPageSize } from "./page-size";

function resume(patch: Partial<Resume> = {}): Resume {
  return { ...emptyResume(0), ...patch };
}

describe("webLink", () => {
  it("shows a short address and links the full one", () => {
    expect(webLink(" https://www.linkedin.com/in/maya/ ")).toEqual({
      text: "linkedin.com/in/maya",
      href: "https://www.linkedin.com/in/maya/",
    });
  });

  it("adds https to a bare domain", () => {
    expect(webLink("github.com/maya")).toEqual({ text: "github.com/maya", href: "https://github.com/maya" });
  });

  it("never links anything but the web", () => {
    expect(webLink("javascript:alert(1)")?.href).toBeNull();
    expect(webLink("my portfolio")).toEqual({ text: "my portfolio", href: null });
    expect(webLink("   ")).toBeNull();
  });
});

describe("emailLink", () => {
  it("links a valid address and leaves anything else as text", () => {
    expect(emailLink("maya@example.com")).toEqual({ text: "maya@example.com", href: "mailto:maya@example.com" });
    expect(emailLink("maya at example")).toEqual({ text: "maya at example", href: null });
  });
});

describe("buildPdfModel", () => {
  it("skips empty sections, entries, bullets and contact fields", () => {
    const job = { ...newExperience(), bullets: [newBullet(""), newBullet("  ")] };
    const model = buildPdfModel(
      resume({
        basics: { name: "Maya", headline: "", email: "", phone: "+1 555 0100", location: "", links: [] },
        experience: [job, { ...newExperience(), title: "Engineer", bullets: [newBullet("Built things.")] }],
        skills: [{ id: "k", label: "Tools", items: ["", " "] }],
      }),
    );
    expect(model.contact).toEqual([[{ text: "+1 555 0100", href: null }]]);
    expect(model.sections.map((section) => section.key)).toEqual(["experience"]);
    const [experience] = model.sections;
    expect(experience?.key === "experience" && experience.entries).toEqual([
      expect.objectContaining({ title: "Engineer", org: "", bullets: [expect.objectContaining({ text: "Built things." })] }),
    ]);
  });

  it("follows the section order and ignores repeats", () => {
    const model = buildPdfModel(
      resume({
        summary: "Hi.",
        skills: [{ id: "k", label: "", items: ["Go"] }],
        sectionOrder: ["skills", "summary", "skills"],
      }),
    );
    expect(model.sections.map((section) => section.title)).toEqual(["Skills", "Summary"]);
  });

  it("strips bullet markers people typed, so the PDF never prints two", () => {
    const job = {
      ...newExperience(),
      title: "Engineer",
      bullets: [newBullet("• Led a team"), newBullet("- Cut costs"), newBullet("-20% churn"), newBullet("* Shipped")],
    };
    const [section] = buildPdfModel(resume({ experience: [job] })).sections;
    const texts = section?.key === "experience" ? section.entries[0]?.bullets.map((bullet) => bullet.text) : [];
    expect(texts).toEqual(["Led a team", "Cut costs", "-20% churn", "Shipped"]);
  });

  it("leads with the company when there is no title, and joins dates with a dash", () => {
    const job = { ...newExperience(), company: "Stripe", startDate: "2019", endDate: "Present" };
    const [section] = buildPdfModel(resume({ experience: [job] })).sections;
    expect(section?.key === "experience" && section.entries[0]).toMatchObject({ title: "Stripe", org: "", dates: "2019 – Present" });
  });

  it("names the document after the person and reports characters it changed", () => {
    const model = buildPdfModel(resume({ basics: { ...emptyResume(0).basics, name: "Łukasz Wójcik" } }));
    expect(model.meta).toEqual({ title: "Łukasz Wójcik - Resume", author: "Łukasz Wójcik", subject: "" });
    expect(model.changedCharacters).toEqual([]);
    const cjk = buildPdfModel(resume({ basics: { ...emptyResume(0).basics, name: "王芳 Wang" } }));
    expect(cjk.name).toBe("Wang");
    expect(cjk.changedCharacters).toEqual(["王", "芳"]);
  });

  it("keeps a project's tools and dates, and dates a run of roles from first to last", () => {
    const model = buildPdfModel(
      resume({
        projects: [
          {
            id: "p1",
            name: "Ledger Lint",
            link: "",
            tech: "Go, SQL",
            startDate: "2022",
            endDate: "Present",
            bullets: [],
          },
          { id: "p2", name: "Old project", link: "", bullets: [] },
        ],
        experience: [
          { id: "e1", company: "Acme", title: "Lead", location: "", startDate: "Jan 2021", endDate: "Present", bullets: [] },
          { id: "e2", company: "Acme", title: "Engineer", location: "", startDate: "Mar 2018", endDate: "Dec 2020", bullets: [] },
        ],
        sectionOrder: ["experience", "projects"],
      }),
    );
    const [jobs, projects] = model.sections;
    expect(projects?.key === "projects" && projects.entries).toMatchObject([
      { title: "Ledger Lint", tech: "Go, SQL", dates: "2022 – Present" },
      { title: "Old project", dates: "" },
    ]);
    expect(projects?.key === "projects" && projects.entries[1]!.tech).toBeUndefined();
    expect(jobs?.key === "experience" && jobs.entries[0]!.company?.dates).toBe("Mar 2018 – Present");
    expect(model.basics?.links).toEqual([]);
  });

  it("falls back to the resume title without a name", () => {
    expect(buildPdfModel(resume({ title: "Design roles" })).meta.title).toBe("Design roles");
  });
});

describe("page size", () => {
  it("defaults to Letter in North America and A4 elsewhere", () => {
    expect(defaultPageSize("en-US")).toBe("LETTER");
    expect(defaultPageSize("en-CA")).toBe("LETTER");
    expect(defaultPageSize("es-MX")).toBe("LETTER");
    expect(defaultPageSize("en-GB")).toBe("A4");
    expect(defaultPageSize("de")).toBe("A4");
    expect(defaultPageSize("en-IN")).toBe("A4");
    expect(defaultPageSize("not a locale")).toBe("LETTER");
    expect(defaultPageSize(undefined)).toBe("LETTER");
  });

  it("recognizes stored values", () => {
    expect(isPdfPageSize("A4")).toBe(true);
    expect(isPdfPageSize("a4")).toBe(false);
  });
});
