import { describe, expect, it } from "vitest";
import { ResumeSchema, emptyResume, type Resume } from "@/lib/resume/schema";
import { publicResume, shareSnapshot } from "./snapshot";

function resume(): Resume {
  return {
    ...emptyResume(1_000),
    id: "resume-1",
    title: "Acme, second try",
    source: "tailored",
    basics: {
      name: "Maya Chen",
      headline: "Product designer",
      email: "maya@example.com",
      phone: "+1 415 555 0100",
      location: "Lisbon, Portugal",
      links: [{ id: "l1", label: "Site", url: "mayachen.design" }],
    },
    summary: "Designs calm tools for busy teams.",
    experience: [
      {
        id: "e1",
        company: "Northwind",
        title: "Senior designer",
        location: "Remote",
        startDate: "2021",
        endDate: "Present",
        bullets: [
          { id: "b1", text: "Cut onboarding time by 40%." },
          { id: "b2", text: "Draft line I hid.", hidden: true },
        ],
      },
      {
        id: "e2",
        company: "Hidden Co",
        title: "Intern",
        location: "",
        startDate: "2019",
        endDate: "2019",
        bullets: [],
        hidden: true,
      },
    ],
    skills: [{ id: "s1", label: "", items: ["Figma", "Research"] }],
    hiddenSections: ["skills"],
    tailor: {
      baseResumeId: "base-1",
      jobTitle: "Lead designer",
      company: "Acme",
      keywords: ["design systems"],
      createdAt: 900,
      coverLetter: "Dear Acme team, ...",
    },
    updatedAt: 2_000,
  };
}

describe("shareSnapshot", () => {
  it("keeps only what the PDF prints", () => {
    const snapshot = shareSnapshot(resume());
    expect(snapshot.experience.map((job) => job.id)).toEqual(["e1"]);
    expect(snapshot.experience[0]!.bullets.map((bullet) => bullet.id)).toEqual(["b1"]);
    expect(snapshot.skills).toEqual([]);
    expect(snapshot.sectionOrder).not.toContain("skills");
  });

  it("drops the tailoring notes and the owner's own name for the file", () => {
    const snapshot = shareSnapshot(resume());
    expect(snapshot.tailor).toBeNull();
    expect(snapshot.title).toBe("");
    expect(JSON.stringify(snapshot)).not.toMatch(/Acme|Dear|second try|Draft line|Hidden Co/);
  });

  it("keeps the version and stays a valid resume", () => {
    const snapshot = shareSnapshot(resume());
    expect(snapshot.id).toBe("resume-1");
    expect(snapshot.updatedAt).toBe(2_000);
    expect(ResumeSchema.safeParse(snapshot).success).toBe(true);
  });
});

describe("publicResume", () => {
  it("hides email and phone unless the owner shows them", () => {
    const snapshot = shareSnapshot(resume());
    const hidden = publicResume(snapshot, false);
    expect(hidden.basics.email).toBe("");
    expect(hidden.basics.phone).toBe("");
    expect(hidden.basics.location).toBe("Lisbon, Portugal");
    expect(hidden.basics.links).toHaveLength(1);
    expect(publicResume(snapshot, true).basics.email).toBe("maya@example.com");
  });
});
