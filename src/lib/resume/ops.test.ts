import { describe, expect, it } from "vitest";
import {
  TITLE_MAX,
  addSkills,
  cleanTitle,
  cloneResume,
  copyTitle,
  displayName,
  findBullet,
  isTitleTaken,
  listBullets,
  reorderBullets,
  resumeToText,
  setBulletText,
  suggestedFileName,
  resumeTitle,
  titleFromFileName,
  titleKey,
  touch,
  uniqueTitle,
  uploadTitle,
  visibleResume,
} from "./ops";
import { emptyResume, type Experience, type Resume } from "./schema";

function job(overrides: Partial<Experience>): Experience {
  return {
    id: "job",
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    bullets: [],
    ...overrides,
  };
}

function fixture(): Resume {
  return {
    ...emptyResume(1_000),
    id: "resume-1",
    basics: {
      name: "Jane Doe",
      headline: "Backend Engineer",
      email: "jane@example.com",
      phone: "+1 555 0100",
      location: "Berlin",
      links: [{ id: "l1", label: "GitHub", url: "github.com/jane" }],
    },
    summary: "Backend engineer who likes boring, reliable systems.",
    experience: [
      job({
        id: "job-1",
        company: "Stripe",
        title: "Backend Engineer",
        location: "Remote",
        startDate: "Jan 2022",
        endDate: "Present",
        bullets: [
          { id: "b1", text: "Cut payment retries 30%" },
          { id: "b2", text: "Built a ledger service" },
          { id: "b3", text: "Led 4 engineers" },
        ],
      }),
      job({ id: "job-2", title: "Intern", bullets: [{ id: "b4", text: "Wrote tests" }] }),
    ],
    projects: [
      {
        id: "proj-1",
        name: "Side project",
        link: "",
        bullets: [{ id: "b5", text: "Built a CLI" }],
      },
    ],
    education: [
      {
        id: "edu-1",
        school: "MIT",
        degree: "BSc",
        field: "Physics",
        location: "Cambridge",
        startDate: "2016",
        endDate: "2020",
        bullets: [{ id: "b6", text: "Dean's list" }],
      },
    ],
    skills: [
      { id: "s1", label: "Languages", items: ["TypeScript", "Go"] },
      { id: "s2", label: "Tools", items: ["Docker"] },
    ],
    certifications: [{ id: "c1", name: "AWS Solutions Architect", issuer: "Amazon", date: "2023" }],
  };
}

describe("listBullets", () => {
  it("lists experience, then projects, then education", () => {
    expect(listBullets(fixture()).map((ref) => [ref.bulletId, ref.section, ref.parentId])).toEqual([
      ["b1", "experience", "job-1"],
      ["b2", "experience", "job-1"],
      ["b3", "experience", "job-1"],
      ["b4", "experience", "job-2"],
      ["b5", "projects", "proj-1"],
      ["b6", "education", "edu-1"],
    ]);
  });

  it("describes each bullet's parent", () => {
    const [first] = listBullets(fixture());
    expect(first).toEqual({
      bulletId: "b1",
      text: "Cut payment retries 30%",
      section: "experience",
      parentId: "job-1",
      parentLabel: "Backend Engineer at Stripe",
      roleTitle: "Backend Engineer",
      company: "Stripe",
    });
  });

  it.each([
    [{ title: "Backend Engineer", company: "Stripe" }, "Backend Engineer at Stripe"],
    [{ title: "Backend Engineer", company: "" }, "Backend Engineer"],
    [{ title: "", company: "Stripe" }, "Stripe"],
    [{ title: "", company: "" }, "Experience"],
  ])("labels experience %j as %s", (fields, label) => {
    const resume = {
      ...emptyResume(0),
      experience: [job({ ...fields, bullets: [{ id: "b", text: "x" }] })],
    };
    expect(listBullets(resume)[0]?.parentLabel).toBe(label);
  });

  it.each([
    ["Side project", "Side project"],
    ["", "Project"],
  ])("labels project %j as %s", (name, label) => {
    const resume = {
      ...emptyResume(0),
      projects: [{ id: "p", name, link: "", bullets: [{ id: "b", text: "x" }] }],
    };
    expect(listBullets(resume)[0]).toMatchObject({
      parentLabel: label,
      roleTitle: name,
      company: "",
    });
  });

  it.each([
    [{ degree: "BSc", school: "MIT" }, "BSc, MIT"],
    [{ degree: "BSc", school: "" }, "BSc"],
    [{ degree: "", school: "MIT" }, "MIT"],
    [{ degree: "", school: "" }, "Education"],
  ])("labels education %j as %s", (fields, label) => {
    const resume = {
      ...emptyResume(0),
      education: [
        {
          id: "e",
          field: "",
          location: "",
          startDate: "",
          endDate: "",
          bullets: [{ id: "b", text: "x" }],
          ...fields,
        },
      ],
    };
    expect(listBullets(resume)[0]).toMatchObject({
      parentLabel: label,
      roleTitle: fields.degree,
      company: fields.school,
    });
  });

  it("returns nothing for a resume without bullets", () => {
    expect(listBullets(emptyResume(0))).toEqual([]);
  });
});

describe("findBullet", () => {
  it("finds a bullet by id, or returns null", () => {
    expect(findBullet(fixture(), "b5")?.parentLabel).toBe("Side project");
    expect(findBullet(fixture(), "nope")).toBeNull();
  });
});

describe("setBulletText", () => {
  it.each(["b2", "b5", "b6"])("changes only bullet %s", (bulletId) => {
    const before = fixture();
    const after = setBulletText(before, bulletId, "New text");
    const changed = listBullets(after).filter(
      (ref, i) => ref.text !== listBullets(before)[i]?.text,
    );
    expect(changed.map((ref) => [ref.bulletId, ref.text])).toEqual([[bulletId, "New text"]]);
  });

  it("doesn't mutate its input", () => {
    const before = fixture();
    const snapshot = structuredClone(before);
    setBulletText(before, "b1", "Changed");
    expect(before).toEqual(snapshot);
  });

  it("keeps untouched entries by reference", () => {
    const before = fixture();
    const after = setBulletText(before, "b1", "Changed");
    expect(after.experience[1]).toBe(before.experience[1]);
    expect(after.projects[0]).toBe(before.projects[0]);
  });

  it("leaves every bullet alone for an unknown id", () => {
    expect(listBullets(setBulletText(fixture(), "nope", "x"))).toEqual(listBullets(fixture()));
  });
});

describe("touch", () => {
  it("sets updatedAt only", () => {
    const resume = fixture();
    expect(touch(resume, 5_000)).toEqual({ ...resume, updatedAt: 5_000 });
  });
});

describe("cloneResume", () => {
  it("gives the copy a new id and timestamps but keeps nested ids", () => {
    const original = fixture();
    const copy = cloneResume(original, {}, 9_000);
    expect(copy.id).not.toBe(original.id);
    expect(copy).toMatchObject({ createdAt: 9_000, updatedAt: 9_000 });
    expect(listBullets(copy).map((ref) => ref.bulletId)).toEqual(
      listBullets(original).map((ref) => ref.bulletId),
    );
    expect(copy.experience.map((j) => j.id)).toEqual(["job-1", "job-2"]);
    expect(copy.skills.map((g) => g.id)).toEqual(["s1", "s2"]);
  });

  it("applies overrides last", () => {
    const copy = cloneResume(fixture(), { title: "Tailored", source: "tailored" }, 9_000);
    expect(copy).toMatchObject({ title: "Tailored", source: "tailored" });
  });

  it("makes a deep copy", () => {
    const original = fixture();
    const copy = cloneResume(original);
    copy.experience[0]?.bullets.push({ id: "b9", text: "Added" });
    copy.basics.links.pop();
    expect(original.experience[0]?.bullets).toHaveLength(3);
    expect(original.basics.links).toHaveLength(1);
  });
});

describe("reorderBullets", () => {
  const order = (resume: Resume) => resume.experience[0]?.bullets.map((b) => b.id);

  it("reorders when given an exact permutation", () => {
    const after = reorderBullets(fixture(), "job-1", ["b3", "b1", "b2"]);
    expect(order(after)).toEqual(["b3", "b1", "b2"]);
    expect(after.experience[0]?.bullets[0]?.text).toBe("Led 4 engineers");
    expect(after.experience[1]).toEqual(fixture().experience[1]);
  });

  it.each([
    ["a missing id", ["b3", "b1"]],
    ["an extra id", ["b3", "b1", "b2", "b9"]],
    ["a repeated id", ["b3", "b1", "b1"]],
    ["an unknown id", ["b3", "b1", "b9"]],
    ["an id from another entry", ["b3", "b1", "b4"]],
    ["no ids", []],
  ])("returns the resume unchanged for %s", (_, ids) => {
    const resume = fixture();
    expect(reorderBullets(resume, "job-1", ids)).toBe(resume);
  });

  it("returns the resume unchanged for an unknown entry", () => {
    const resume = fixture();
    expect(reorderBullets(resume, "nope", ["b1", "b2", "b3"])).toBe(resume);
  });
});

describe("addSkills", () => {
  it("adds new skills to the first group", () => {
    const after = addSkills(fixture(), ["Kubernetes", "Rust"]);
    expect(after.skills.map((g) => g.items)).toEqual([
      ["TypeScript", "Go", "Kubernetes", "Rust"],
      ["Docker"],
    ]);
  });

  it("skips skills any group already has, ignoring case and spaces", () => {
    const after = addSkills(fixture(), ["typescript", " DOCKER ", "go", "Terraform"]);
    expect(after.skills[0]?.items).toEqual(["TypeScript", "Go", "Terraform"]);
  });

  it("trims and drops empty items", () => {
    expect(addSkills(fixture(), ["  Rust  ", "", "   "]).skills[0]?.items.at(-1)).toBe("Rust");
  });

  it("drops exact repeats within one call", () => {
    expect(addSkills(fixture(), ["Rust", "Rust"]).skills[0]?.items).toEqual([
      "TypeScript",
      "Go",
      "Rust",
    ]);
  });

  it("returns the same resume when nothing is new", () => {
    const resume = fixture();
    expect(addSkills(resume, ["Go", "docker", " "])).toBe(resume);
  });

  it("creates an unlabeled group when there is none", () => {
    const after = addSkills(emptyResume(0), ["SQL"]);
    expect(after.skills).toHaveLength(1);
    expect(after.skills[0]).toMatchObject({ label: "", items: ["SQL"] });
    expect(after.skills[0]?.id).toBeTruthy();
  });

  it("doesn't mutate its input", () => {
    const resume = fixture();
    addSkills(resume, ["Rust"]);
    expect(resume.skills[0]?.items).toEqual(["TypeScript", "Go"]);
  });

  it("ignores case between items added in one call", () => {
    expect(addSkills(fixture(), ["Rust", "rust"]).skills[0]?.items).toEqual([
      "TypeScript",
      "Go",
      "Rust",
    ]);
  });

  it("never grows the first group past the schema's 100 items", () => {
    const many = Array.from({ length: 120 }, (_, i) => `Skill ${i}`);
    const after = addSkills(fixture(), many);
    expect(after.skills[0]?.items).toHaveLength(100);
    expect(after.skills[0]?.items.slice(0, 3)).toEqual(["TypeScript", "Go", "Skill 0"]);
    const full = addSkills(after, ["Rust"]);
    expect(full).toBe(after);
  });
});

describe("displayName", () => {
  it("falls back when the name is blank", () => {
    expect(displayName(fixture())).toBe("Jane Doe");
    expect(displayName({ ...fixture(), basics: { ...fixture().basics, name: "  " } })).toBe(
      "Untitled resume",
    );
  });
});

describe("resume titles", () => {
  it("names a resume by its title, else its person", () => {
    expect(resumeTitle({ ...fixture(), title: "  Design roles " })).toBe("Design roles");
    expect(resumeTitle({ ...fixture(), title: " " })).toBe("Jane Doe");
  });

  it("tidies a typed name: trimmed, one space between words, capped", () => {
    expect(cleanTitle("  Design\n\n roles\t2026  ")).toBe("Design roles 2026");
    expect(cleanTitle("   ")).toBe("");
    expect(cleanTitle("x".repeat(TITLE_MAX + 50))).toHaveLength(TITLE_MAX);
  });

  it("marks a copy, and a long title gives up its end rather than the marker", () => {
    expect(copyTitle({ ...fixture(), title: "Design roles" })).toBe("Design roles (copy)");
    expect(copyTitle({ ...fixture(), title: "" })).toBe("Jane Doe (copy)");
    const long = copyTitle({ ...fixture(), title: "y".repeat(TITLE_MAX) });
    expect(long).toHaveLength(TITLE_MAX);
    expect(long.endsWith(" (copy)")).toBe(true);
  });
});

describe("suggestedFileName", () => {
  const named = (name: string, company?: string): Resume => ({
    ...fixture(),
    basics: { ...fixture().basics, name },
    tailor:
      company === undefined
        ? null
        : { baseResumeId: "resume-1", jobTitle: "Engineer", company, keywords: [], createdAt: 0 },
  });

  it.each([
    ["Jane Doe", undefined, "Jane-Doe-Resume.pdf"],
    ["  Jane   Doe  ", undefined, "Jane-Doe-Resume.pdf"],
    ["Jane Doe", "Stripe", "Jane-Doe-Stripe-Resume.pdf"],
    ["Jane Doe", "Stripe, Inc.", "Jane-Doe-Stripe-Inc-Resume.pdf"],
    ["Jane Doe", "", "Jane-Doe-Resume.pdf"],
    ["José Ñúñez", undefined, "José-Ñúñez-Resume.pdf"],
    ["Zoë O'Brien-Smith", "Société Générale", "Zoë-O-Brien-Smith-Société-Générale-Resume.pdf"],
    ["李小龍", "腾讯", "李小龍-腾讯-Resume.pdf"],
    ["محمد علي", undefined, "محمد-علي-Resume.pdf"],
    ["Jane/Doe: v2?", undefined, "Jane-Doe-v2-Resume.pdf"],
  ])("%s at %s -> %s", (name, company, expected) => {
    expect(suggestedFileName(named(name, company))).toBe(expected);
  });

  it("doesn't repeat Resume when there is no name", () => {
    expect(suggestedFileName(named(""))).toBe("Resume.pdf");
  });

  it("doesn't leave a double hyphen when the company has no letters", () => {
    expect(suggestedFileName(named("Jane Doe", "???"))).toBe("Jane-Doe-Resume.pdf");
  });

  it("keeps accented names intact when they arrive decomposed (NFD)", () => {
    const name = suggestedFileName(named("Renée Smith")).normalize("NFC");
    expect(name).toBe("Renée-Smith-Resume.pdf");
  });
});

describe("resumeToText", () => {
  it("renders the header, then each section in order", () => {
    expect(resumeToText(fixture()).split("\n")).toEqual([
      "Jane Doe",
      "Backend Engineer",
      "jane@example.com | +1 555 0100 | Berlin",
      "github.com/jane",
      "",
      "SUMMARY",
      "Backend engineer who likes boring, reliable systems.",
      "",
      "EXPERIENCE",
      "Backend Engineer | Stripe | Remote",
      "Jan 2022 - Present",
      "- Cut payment retries 30%",
      "- Built a ledger service",
      "- Led 4 engineers",
      "Intern",
      "- Wrote tests",
      "",
      "PROJECTS",
      "Side project",
      "- Built a CLI",
      "",
      "EDUCATION",
      "BSc | Physics | MIT | Cambridge",
      "2016 - 2020",
      "- Dean's list",
      "",
      "SKILLS",
      "Languages: TypeScript, Go",
      "Tools: Docker",
      "",
      "CERTIFICATIONS",
      "AWS Solutions Architect | Amazon | 2023",
    ]);
  });

  it("follows sectionOrder and leaves out sections that aren't in it", () => {
    const text = resumeToText({ ...fixture(), sectionOrder: ["skills", "experience"] });
    const headings = text.split("\n").filter((line) => /^[A-Z]+$/.test(line));
    expect(headings).toEqual(["SKILLS", "EXPERIENCE"]);
    expect(text.indexOf("Languages: TypeScript, Go")).toBeLessThan(text.indexOf("Stripe"));
    expect(text).not.toContain("Dean's list");
  });

  it("skips empty sections and blank header fields", () => {
    const resume: Resume = {
      ...emptyResume(0),
      basics: {
        name: "Jane Doe",
        headline: "",
        email: "",
        phone: "",
        location: "Lagos",
        links: [],
      },
      skills: [{ id: "s", label: "", items: ["SQL", "Excel"] }],
    };
    expect(resumeToText(resume)).toBe("Jane Doe\nLagos\n\nSKILLS\nSQL, Excel");
  });

  it("returns an empty string for an empty resume", () => {
    expect(resumeToText(emptyResume(0))).toBe("");
  });

  it("leaves out links without a URL", () => {
    const resume: Resume = {
      ...emptyResume(0),
      basics: {
        ...emptyResume(0).basics,
        name: "Jane Doe",
        links: [
          { id: "a", label: "GitHub", url: "" },
          { id: "b", label: "Site", url: "" },
        ],
      },
    };
    expect(resumeToText(resume)).toBe("Jane Doe");
  });

  it("leaves out blank bullets", () => {
    const resume: Resume = {
      ...emptyResume(0),
      basics: { ...emptyResume(0).basics, name: "Jane Doe" },
      experience: [
        job({
          title: "Engineer",
          bullets: [
            { id: "a", text: "Shipped it" },
            { id: "b", text: "   " },
          ],
        }),
      ],
    };
    expect(resumeToText(resume)).toBe("Jane Doe\n\nEXPERIENCE\nEngineer\n- Shipped it");
  });
});

describe("unique resume names", () => {
  const named = (id: string, title: string) => ({ ...emptyResume(), id, title });

  it("compares names the way people read them", () => {
    expect(titleKey("  Café   Resume ")).toBe(titleKey("cafe resume"));
  });

  it("numbers a taken name and skips numbers already used", () => {
    const list = [named("a", "Sample resume"), named("b", "Sample resume (2)")];
    expect(uniqueTitle("Sample resume", list)).toBe("Sample resume (3)");
    expect(uniqueTitle("sample RESUME", list)).toBe("sample RESUME (3)");
    expect(uniqueTitle("Design roles", list)).toBe("Design roles");
  });

  it("lets a resume keep its own name", () => {
    const list = [named("a", "Sample resume")];
    expect(isTitleTaken("Sample resume", list, "a")).toBe(false);
    expect(isTitleTaken("Sample resume", list, "b")).toBe(true);
  });

  it("cleans a file name into a title", () => {
    expect(titleFromFileName("Maya_Chen-Resume 2024.pdf")).toBe("Maya Chen Resume 2024");
    expect(titleFromFileName(".pdf")).toBe("");
  });

  it("names uploads after the person, then the file", () => {
    const read = (name: string) => ({
      ...emptyResume(),
      basics: { ...emptyResume().basics, name },
    });
    expect(uploadTitle(read("Maya  Chen "), "maya.pdf")).toBe("Maya Chen");
    expect(uploadTitle(read("  "), "Maya_Chen-Resume 2024.pdf")).toBe("Maya Chen Resume 2024");
    expect(uploadTitle(read(""), ".pdf")).toBe("My resume");
  });
});

describe("extras and hidden items", () => {
  function withExtras(): Resume {
    return {
      ...fixture(),
      extras: [
        {
          id: "x-vol",
          kind: "volunteering",
          title: "Volunteering",
          items: [
            {
              id: "x-vol-1",
              title: "Mentor",
              subtitle: "Code Club",
              date: "2019 – 2022",
              detail: "Weekly sessions for beginners.",
              bullets: [
                { id: "xb1", text: "Taught 30 children to code" },
                { id: "xb2", text: "Old line", hidden: true },
              ],
            },
          ],
        },
        {
          id: "x-lang",
          kind: "languages",
          title: "",
          items: [
            {
              id: "x-lang-1",
              title: "Spanish",
              subtitle: "Fluent",
              date: "",
              detail: "",
              bullets: [],
            },
            {
              id: "x-lang-2",
              title: "French",
              subtitle: "Basic",
              date: "",
              detail: "",
              bullets: [],
              hidden: true,
            },
          ],
        },
        {
          id: "x-hidden",
          kind: "awards",
          title: "Awards",
          hidden: true,
          items: [
            {
              id: "x-aw",
              title: "Hackathon winner",
              subtitle: "",
              date: "2020",
              detail: "",
              bullets: [{ id: "xb3", text: "Won it" }],
            },
          ],
        },
      ],
    };
  }

  it("lists the lines of extra sections after the standard ones", () => {
    const refs = listBullets(withExtras());
    expect(refs.map((ref) => ref.bulletId)).toEqual(["b1", "b2", "b3", "b4", "b5", "b6", "xb1"]);
    expect(refs.at(-1)).toEqual({
      bulletId: "xb1",
      text: "Taught 30 children to code",
      section: "extras",
      parentId: "x-vol-1",
      parentLabel: "Mentor at Code Club",
      roleTitle: "Mentor",
      company: "Code Club",
    });
  });

  it("skips hidden lines, entries and sections, unless asked for them", () => {
    const resume: Resume = {
      ...withExtras(),
      hiddenSections: ["education"],
      experience: fixture().experience.map((entry) =>
        entry.id === "job-2"
          ? { ...entry, hidden: true }
          : {
              ...entry,
              bullets: entry.bullets.map((b) => (b.id === "b2" ? { ...b, hidden: true } : b)),
            },
      ),
    };
    expect(listBullets(resume).map((ref) => ref.bulletId)).toEqual(["b1", "b3", "b5", "xb1"]);
    expect(listBullets(resume, { includeHidden: true }).map((ref) => ref.bulletId)).toEqual([
      "b1",
      "b2",
      "b3",
      "b4",
      "b5",
      "b6",
      "xb1",
      "xb2",
      "xb3",
    ]);
    expect(findBullet(resume, "b4")?.parentId).toBe("job-2");
    expect(findBullet(resume, "xb3")?.section).toBe("extras");
  });

  it("edits the text of a line in an extra section", () => {
    const resume = withExtras();
    const after = setBulletText(resume, "xb1", "Taught 40 children to code");
    expect(after.extras?.[0]?.items[0]?.bullets[0]?.text).toBe("Taught 40 children to code");
    expect(after.extras?.[1]).toBe(resume.extras?.[1]);
    expect(after.experience).toEqual(resume.experience);
    expect(setBulletText(emptyResume(0), "xb1", "x").extras).toEqual([]);
  });

  it("writes extra sections into the plain text, after the ordered sections, without hidden items", () => {
    const text = resumeToText(withExtras());
    expect(
      text.endsWith(
        [
          "CERTIFICATIONS",
          "AWS Solutions Architect | Amazon | 2023",
          "",
          "VOLUNTEERING",
          "Mentor | Code Club | 2019 – 2022",
          "Weekly sessions for beginners.",
          "- Taught 30 children to code",
          "",
          "LANGUAGES",
          "Spanish | Fluent",
        ].join("\n"),
      ),
    ).toBe(true);
    expect(text).not.toMatch(/Old line|French|Hackathon/);
  });

  it("uses the person's own section titles and leaves hidden sections out of the text", () => {
    const resume: Resume = {
      ...fixture(),
      sectionTitles: { experience: "Work history", skills: "  " },
      hiddenSections: ["projects", "summary"],
      skills: [
        { id: "s1", label: "Languages", items: ["TypeScript"], hidden: true },
        fixture().skills[1]!,
      ],
      certifications: [{ ...fixture().certifications[0]!, hidden: true }],
    };
    const headings = resumeToText(resume)
      .split("\n")
      .filter((line) => /^[A-Z ]+$/.test(line));
    expect(headings).toEqual(["WORK HISTORY", "EDUCATION", "SKILLS"]);
    expect(resumeToText(resume)).not.toMatch(/Side project|TypeScript|AWS|boring/);
  });

  it("gives the page as it prints", () => {
    const resume: Resume = { ...withExtras(), hiddenSections: ["skills"] };
    const shown = visibleResume(resume);
    expect(shown.skills).toEqual([]);
    expect(shown.sectionOrder).not.toContain("skills");
    expect(shown.hiddenSections).toEqual([]);
    expect(shown.extras?.map((section) => section.id)).toEqual(["x-vol", "x-lang"]);
    expect(shown.extras?.[0]?.items[0]?.bullets.map((b) => b.id)).toEqual(["xb1"]);
    expect(shown.extras?.[1]?.items.map((item) => item.id)).toEqual(["x-lang-1"]);
    expect(shown.experience[0]).toBe(resume.experience[0]);
  });

  it("reorders the shown lines of a job and leaves hidden ones where they were", () => {
    const resume: Resume = {
      ...fixture(),
      experience: fixture().experience.map((entry) =>
        entry.id === "job-1"
          ? {
              ...entry,
              bullets: entry.bullets.map((b) => (b.id === "b2" ? { ...b, hidden: true } : b)),
            }
          : entry,
      ),
    };
    const ids = (r: Resume) => r.experience[0]?.bullets.map((b) => b.id);
    expect(ids(reorderBullets(resume, "job-1", ["b3", "b1"]))).toEqual(["b3", "b2", "b1"]);
    expect(ids(reorderBullets(resume, "job-1", ["b2", "b3", "b1"]))).toEqual(["b2", "b3", "b1"]);
    expect(reorderBullets(resume, "job-1", ["b3"])).toBe(resume);
  });

  it("adds confirmed skills to the first group that prints", () => {
    const resume: Resume = {
      ...fixture(),
      skills: [
        { id: "s1", label: "Old", items: ["Go"], hidden: true },
        { id: "s2", label: "Tools", items: ["Docker"] },
      ],
    };
    const after = addSkills(resume, ["Go", "docker"]);
    expect(after.skills.map((group) => group.items)).toEqual([["Go"], ["Docker", "Go"]]);
    const allHidden = addSkills({ ...resume, skills: [resume.skills[0]!] }, ["Go"]);
    expect(allHidden.skills.map((group) => [group.label, group.items])).toEqual([
      ["", ["Go"]],
      ["Old", ["Go"]],
    ]);
  });
});
