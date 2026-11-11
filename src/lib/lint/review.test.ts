import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { MAX_TOP, rankReview, reviewResume, type ReviewItem } from "./review";

function job(id: string, bullets: string[], fields: Partial<Resume["experience"][number]> = {}) {
  return {
    id,
    title: "Engineer",
    company: "Acme",
    location: "",
    startDate: "Jan 2022",
    endDate: "Present",
    bullets: bullets.map((text, index) => ({ id: `${id}-${index}`, text })),
    ...fields,
  };
}

function resume(fields: Partial<Resume>): Resume {
  return {
    ...emptyResume(0),
    basics: { ...emptyResume(0).basics, name: "Sam Lee", headline: "Backend engineer" },
    ...fields,
  };
}

const ids = (items: readonly ReviewItem[]) => items.map((item) => item.id);

describe("reviewResume", () => {
  it("groups line problems into one item each, with a counted title", () => {
    const review = reviewResume(
      resume({
        experience: [
          job("a", [
            "Responsible for the billing service",
            "Worked on the CI pipeline with GitHub Actions",
            "Developed REST APIs in Node.js for the tracking platform",
          ]),
        ],
      }),
    );
    const duty = review.items.find((item) => item.id === "duty");
    expect(duty).toMatchObject({
      severity: "high",
      title: "2 lines read like a job description",
      more: 0,
      target: { kind: "line", bulletId: "a-0" },
    });
    expect(duty?.lines.map((line) => line.place)).toEqual(["Engineer at Acme", "Engineer at Acme"]);
    expect(review.items.find((item) => item.id === "no-result")?.title).toBe(
      "1 line doesn't say what changed",
    );
  });

  it("ranks fixes so a missing result comes before a missing number", () => {
    const review = reviewResume(
      resume({
        experience: [
          job("a", [
            "Improved the onboarding flow for new users",
            "Developed REST APIs in Node.js for the tracking platform",
            "Responsible for the billing service",
          ]),
        ],
      }),
    );
    expect(ids(review.items)).toEqual(["duty", "no-result", "no-number"]);
  });

  it("keeps 'could use a number' out of the top three while anything else is left", () => {
    const review = reviewResume(
      resume({
        summary: "Hardworking engineer. I like hard problems.",
        experience: [
          job("a", [
            "Improved the onboarding flow for new users",
            "Improved the search page for returning users",
            "Developed REST APIs in Node.js for the tracking platform",
            "Responsible for the billing service",
          ]),
        ],
      }),
    );
    expect(review.top).toHaveLength(MAX_TOP);
    expect(ids(review.top)).toEqual(["duty", "no-result", "summary-voice"]);
    expect(ids(review.top)).not.toContain("no-number");
  });

  it("lets 'could use a number' fill a place only when nothing else is left", () => {
    const review = reviewResume(
      resume({ experience: [job("a", ["Improved the onboarding flow for new users"])] }),
    );
    expect(ids(review.top)).toEqual(["no-number"]);
  });

  it("caps the lines a number item lists and counts the rest", () => {
    const lines = Array.from(
      { length: 7 },
      (_, i) => `Improved report number${"s".repeat(i)} for the sales leads`,
    );
    const review = reviewResume(resume({ experience: [job("a", lines)] }));
    const numbers = review.items.find((item) => item.id === "no-number");
    expect(numbers?.lines).toHaveLength(3);
    expect(numbers?.more).toBe(4);
    expect(numbers?.title).toBe("7 lines could use a number");
  });

  it("checks the summary's voice and points at the summary", () => {
    const review = reviewResume(resume({ summary: "Results-driven engineer. I ship fast." }));
    const item = review.items.find((entry) => entry.id === "summary-voice");
    expect(item).toMatchObject({
      severity: "high",
      title: "Your summary uses stock phrases and I",
      target: { kind: "summary" },
    });
    expect(item?.lines[0]?.message).toContain('"Results-driven"');
  });

  it("names a job missing its title, company or dates", () => {
    const review = reviewResume(
      resume({
        experience: [
          job("a", ["Cut costs 20% by moving jobs to spot instances"], { startDate: "" }),
          job("b", ["Cut costs 20% by moving jobs to spot instances"], { company: "", title: "" }),
          job("c", ["Cut costs 20% by moving jobs to spot instances"], {
            startDate: "",
            hidden: true,
          }),
        ],
      }),
    );
    const item = review.items.find((entry) => entry.id === "first-look");
    expect(item?.title).toBe("2 jobs are missing a title, company or dates");
    expect(item?.lines.map((line) => line.message)).toEqual([
      "No dates.",
      "No job title or company.",
    ]);
    expect(item?.target).toEqual({ kind: "entry", entryId: "a" });
    expect(review.top[0]?.id).toBe("first-look");
  });

  it("lists skills no job or project line shows", () => {
    const review = reviewResume(
      resume({
        experience: [job("a", ["Cut p95 latency 40% with a Redis cache in Go"])],
        skills: [
          {
            id: "s",
            label: "Tools",
            items: ["Go", "Redis", "Kubernetes", "AWS", "Clear writing for busy readers"],
          },
        ],
      }),
    );
    const item = review.items.find((entry) => entry.id === "skills-unshown");
    expect(item?.title).toBe("2 skills are only in your Skills list");
    expect(item?.reason).toMatch(
      /^Kubernetes and AWS: no job or project line shows you using them\./,
    );
    expect(item?.severity).toBe("low");
  });

  it("asks for a headline when there is none", () => {
    const base = resume({});
    const review = reviewResume({ ...base, basics: { ...base.basics, headline: "" } });
    expect(review.items.find((item) => item.id === "headline")?.target).toEqual({ kind: "basics" });
  });

  it("finds nothing in a resume that follows the rules", () => {
    const review = reviewResume(
      resume({
        summary: "Backend engineer who builds payment systems in Go.",
        experience: [job("a", ["Cut p95 latency 40% by adding a Redis cache in Go"])],
        skills: [{ id: "s", label: "", items: ["Go", "Redis"] }],
      }),
    );
    expect(review).toEqual({ items: [], top: [] });
  });

  it("leaves hidden lines out", () => {
    const review = reviewResume(
      resume({
        experience: [
          {
            ...job("a", ["Responsible for the billing service"]),
            bullets: [{ id: "a-0", text: "Responsible for the billing service", hidden: true }],
          },
        ],
      }),
    );
    expect(ids(review.items)).not.toContain("duty");
  });
});

describe("rankReview", () => {
  const item = (id: ReviewItem["id"], severity: "high" | "low"): ReviewItem => ({
    id,
    severity,
    title: id,
    reason: "",
    lines: [],
    more: 0,
    target: null,
  });

  it("puts warnings before tips, then follows the fixed order", () => {
    const { items, top } = rankReview([
      item("no-number", "low"),
      item("tense", "low"),
      item("first-person", "high"),
      item("duty", "high"),
    ]);
    expect(ids(items)).toEqual(["duty", "first-person", "tense", "no-number"]);
    expect(ids(top)).toEqual(["duty", "first-person", "tense"]);
  });
});
