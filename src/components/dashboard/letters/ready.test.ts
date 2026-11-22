import { describe, expect, it } from "vitest";
import type { LetterEntry } from "./entries";
import { asEmail, emailSubject, letterGroups, readyTargets, targetForGroup } from "./ready";
import type { WriteTarget } from "./write-targets";

function entry(key: string, patch: Partial<LetterEntry>): LetterEntry {
  return {
    key,
    kind: "letter",
    question: "",
    text: "Dear team,\n\nI'd like to apply.",
    warnings: [],
    demo: false,
    company: "",
    role: "",
    jobUrl: "",
    resumeId: null,
    resumeTitle: "",
    createdAt: 1_000,
    writingId: key,
    copyId: null,
    applicationId: null,
    ...patch,
  };
}

function target(value: string, patch: Partial<WriteTarget>): WriteTarget {
  return {
    value,
    from: "application",
    label: value,
    title: "",
    company: "",
    url: "",
    jobId: null,
    applicationId: null,
    resumeId: null,
    resumeNote: null,
    post: { kind: "paste" },
    at: 1_000,
    ...patch,
  };
}

describe("readyTargets", () => {
  it("keeps only jobs with no cover letter yet", () => {
    const targets = [
      target("application:a", { applicationId: "a", company: "Stripe", title: "Designer" }),
      target("application:b", { applicationId: "b", company: "Linear", title: "Designer" }),
      target("job:c", {
        from: "job",
        company: "Figma",
        title: "Designer",
        url: "https://figma.com/jobs/1",
      }),
    ];
    const entries = [
      entry("w1", { applicationId: "a", company: "Stripe", role: "Designer" }),
      entry("w2", { kind: "outreach", applicationId: "b", company: "Linear", role: "Designer" }),
      entry("w3", { jobUrl: "https://figma.com/jobs/1", company: "Figma", role: "Designer" }),
    ];
    expect(readyTargets(targets, entries).map((item) => item.value)).toEqual(["application:b"]);
  });

  it("matches the same company and role when nothing else links them", () => {
    const targets = [
      target("copy:x", { from: "copy", company: "Notion Inc.", title: "Product Designer" }),
    ];
    const entries = [entry("w1", { company: "notion", role: "product  designer" })];
    expect(readyTargets(targets, entries)).toEqual([]);
  });
});

describe("letterGroups", () => {
  it("puts every piece for one job together, newest job first", () => {
    const groups = letterGroups([
      entry("old", { company: "Stripe", role: "Designer", createdAt: 1 }),
      entry("app", { company: "Stripe", role: "Designer", applicationId: "a", createdAt: 5 }),
      entry("other", { company: "Linear", role: "Designer", createdAt: 3 }),
    ]);
    expect(groups.map((group) => group.entries.map((item) => item.key))).toEqual([
      ["app", "old"],
      ["other"],
    ]);
    expect(groups[0]?.applicationId).toBe("a");
  });

  it("keeps pieces with no job apart", () => {
    const groups = letterGroups([entry("a", {}), entry("b", {})]);
    expect(groups).toHaveLength(2);
  });
});

describe("targetForGroup", () => {
  it("uses the known job when there is one, or builds one from the piece", () => {
    const known = target("application:a", { applicationId: "a", company: "Stripe" });
    const [group] = letterGroups([
      entry("w", { applicationId: "a", company: "Stripe", jobUrl: "https://stripe.com/jobs/1" }),
    ]);
    expect(targetForGroup(group!, [known])).toBe(known);
    const built = targetForGroup(group!, []);
    expect(built.post).toEqual({ kind: "link", url: "https://stripe.com/jobs/1" });
    expect(built.applicationId).toBe("a");
  });
});

describe("email copy", () => {
  it("names the role and the person in the subject", () => {
    expect(emailSubject("Product Designer", "Maya Chen")).toBe(
      "Application for Product Designer – Maya Chen",
    );
    expect(emailSubject("", "")).toBe("Application");
    expect(asEmail("Hi", " Body \n")).toBe("Subject: Hi\n\nBody");
  });
});
