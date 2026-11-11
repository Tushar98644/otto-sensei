import { describe, expect, it } from "vitest";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume } from "@/lib/resume/schema";
import { SavedRequirementSchema } from "@/lib/resume/validation";
import { savedRequirements } from "./saved-job";

// savedRequirements reads by hand (no zod on the board), so it must keep the schema's rules.
function withRequirements(requirements: unknown): Resume {
  const resume = createSampleResume(0);
  return {
    ...resume,
    tailor: {
      baseResumeId: "base",
      jobTitle: "Engineer",
      company: "Stripe",
      keywords: ["Go"],
      createdAt: 0,
      requirements,
    } as Resume["tailor"],
  };
}

const viaSchema = (items: unknown[]) => {
  const out = items.flatMap((item) => {
    const parsed = SavedRequirementSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  return out.length > 0 ? out : null;
};

describe("savedRequirements", () => {
  it("reads each entry exactly as SavedRequirementSchema does", () => {
    const entries: unknown[] = [
      { text: "Go in production", importance: "must", terms: ["Go"] },
      { text: "Mentoring", importance: "unknown", terms: [] },
      { text: "Kubernetes", terms: "k8s" },
      { text: "Too many terms", importance: "nice", terms: Array.from({ length: 9 }, () => "x") },
      { text: "A long term", importance: "must", terms: ["y".repeat(101)] },
      { text: "Not text", importance: "must", terms: [3] },
      { text: "x".repeat(301), importance: "must", terms: [] },
      { text: 42 },
      null,
      ["text"],
      "Go",
      { text: "Extra keys", importance: "nice", terms: ["Go"], weight: 3 },
    ];
    for (const entry of entries) {
      expect(savedRequirements(withRequirements([entry])), JSON.stringify(entry)).toEqual(
        viaSchema([entry]),
      );
    }
    expect(savedRequirements(withRequirements(entries))).toEqual(viaSchema(entries));
  });

  it("drops a list that isn't one, or is longer than a copy keeps", () => {
    expect(savedRequirements(withRequirements("Go"))).toBeNull();
    const one = { text: "Go", importance: "must", terms: ["Go"] };
    expect(savedRequirements(withRequirements(Array.from({ length: 41 }, () => one)))).toBeNull();
    expect(savedRequirements(withRequirements(Array.from({ length: 40 }, () => one)))).toHaveLength(
      40,
    );
    expect(savedRequirements(withRequirements([]))).toBeNull();
    expect(savedRequirements(null)).toBeNull();
  });
});
