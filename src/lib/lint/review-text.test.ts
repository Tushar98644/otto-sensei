import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en/lint";
import es from "@/i18n/messages/es/lint";
import {
  emptyResume,
  newBullet,
  newEducation,
  newExperience,
  newProject,
  type Resume,
} from "@/lib/resume/schema";
import { reviewResume } from "./review";
import { localizeReview, rebuildReview } from "./review-text";

function resume(): Resume {
  const base = emptyResume(0);
  return {
    ...base,
    summary: "I am a results-driven team player.",
    experience: [
      {
        ...newExperience(),
        title: "Engineer",
        company: "",
        startDate: "",
        bullets: [
          "Responsible for managing the company website",
          "I built the billing system for 40 clients",
          "Fixed bugs",
        ].map((text) => newBullet(text)),
      },
      {
        ...newExperience(),
        title: "Analyst",
        company: "Northwind",
        startDate: "2020",
        bullets: ["Worked on various things", "Wrote guides for support"].map((text) =>
          newBullet(text),
        ),
      },
    ],
    projects: [{ ...newProject(), bullets: [newBullet("Helped with the launch")] }],
    education: [{ ...newEducation(), bullets: [newBullet("Led several projects")] }],
    skills: [
      {
        id: "s",
        label: "Tools",
        items: ["Figma", "Excel", "Tableau", "Jira", "Notion", "Asana", "Miro"],
      },
    ],
  };
}

describe("the review's words", () => {
  it("rebuild exactly what the checks wrote in English", () => {
    const review = reviewResume(resume());
    const kinds = new Set(review.items.map((item) => item.copy?.kind));
    expect([...kinds].sort()).toEqual(["firstLook", "group", "headline", "skills", "summary"]);
    expect(rebuildReview(review, en, "en")).toEqual(review);
    expect(localizeReview(review, en, "en")).toBe(review);
  });

  it("read in Spanish", () => {
    const review = localizeReview(reviewResume(resume()), es, "es");
    const byId = new Map(review.items.map((item) => [item.id, item]));
    expect(byId.get("first-look")?.title).toBe(
      "A 1 trabajo le falta el puesto, la empresa o las fechas",
    );
    expect(byId.get("first-look")?.lines[0]?.message).toBe("Sin empresa o fechas.");
    expect(byId.get("headline")?.title).toBe(es.review.headline.title);
    expect(byId.get("skills-unshown")?.reason).toMatch(/^Figma, Excel, Tableau, Jira, Notion y 2 /);
    const duty = byId.get("duty");
    expect(duty?.title).toBe("2 líneas suenan a descripción del puesto");
    expect(duty?.lines[0]?.place).toBe("Engineer");
    const project = review.items
      .flatMap((item) => item.lines)
      .find((line) => line.text === "Helped with the launch");
    expect(project?.place).toBe("Proyecto");
    expect(review.top.every((item) => review.items.includes(item))).toBe(true);
  });
});
