import { describe, expect, it } from "vitest";
import type { Application } from "@/lib/applications/schema";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume } from "@/lib/resume/schema";
import {
  emptyForm,
  formFromApplication,
  fromDateInput,
  patchFrom,
  prefillFor,
  switchResume,
  toDateInput,
  validateForm,
  versionChoices,
  type ApplicationFormValues,
  type JobDraft,
} from "./form";

const NOW = new Date(2026, 10, 7, 9, 30).getTime();

function resume(overrides: Partial<Resume> = {}): Resume {
  return { ...createSampleResume(1_000), ...overrides };
}

function tailored(jobTitle: string, company: string, overrides: Partial<Resume> = {}): Resume {
  return resume({
    title: `${jobTitle} at ${company}`,
    source: "tailored",
    tailor: { baseResumeId: "base", jobTitle, company, keywords: [], createdAt: 1_000 },
    ...overrides,
  });
}

const DRAFT: JobDraft = {
  title: "Product Manager",
  company: "Stripe",
  link: "stripe.com/jobs/123",
  posting: { url: "https://stripe.com/jobs/listing/123" },
};

function values(overrides: Partial<ApplicationFormValues> = {}): ApplicationFormValues {
  return {
    resumeId: "",
    company: "Stripe",
    role: "Product Manager",
    jobUrl: "",
    appliedOn: toDateInput(NOW),
    status: "applied",
    notes: "",
    ...overrides,
  };
}

describe("date input helpers", () => {
  it("round-trips a local day at noon and refuses days that don't exist", () => {
    const at = fromDateInput("2026-02-28");
    expect(at).toBe(new Date(2026, 1, 28, 12).getTime());
    expect(toDateInput(at ?? 0)).toBe("2026-02-28");
    expect(fromDateInput("2026-02-30")).toBeNull();
    expect(fromDateInput("28/02/2026")).toBeNull();
    expect(fromDateInput("")).toBeNull();
  });
});

describe("versionChoices", () => {
  it("lists tailored copies first, newest edit first", () => {
    const base = resume({ title: "General", updatedAt: 9_000 });
    const older = tailored("PM", "Linear", { updatedAt: 2_000 });
    const newer = tailored("PM", "Stripe", { updatedAt: 5_000 });
    expect(versionChoices([base, older, newer]).map((choice) => choice.label)).toEqual([
      "PM at Stripe (tailored)",
      "PM at Linear (tailored)",
      "General",
    ]);
  });
});

describe("prefillFor", () => {
  it("takes company and role from a tailored copy, and the link while the job draft matches", () => {
    expect(prefillFor(tailored("Product Manager", "Stripe"), DRAFT)).toEqual({
      company: "Stripe",
      role: "Product Manager",
      jobUrl: "https://stripe.com/jobs/listing/123",
    });
    expect(
      prefillFor(tailored("Product Manager", "Stripe"), { ...DRAFT, posting: null }),
    ).toMatchObject({
      jobUrl: "https://stripe.com/jobs/123",
    });
    expect(prefillFor(tailored("Designer", "Figma"), DRAFT)).toEqual({
      company: "Figma",
      role: "Designer",
      jobUrl: "",
    });
  });

  it("leaves everything empty for resumes that weren't tailored, or none", () => {
    const empty = { company: "", role: "", jobUrl: "" };
    expect(prefillFor(resume(), DRAFT)).toEqual(empty);
    expect(prefillFor(null, DRAFT)).toEqual(empty);
    expect(
      prefillFor(tailored("", ""), { title: "", company: "", link: "https://x.com/1" }),
    ).toEqual(empty);
  });

  it("starts a new form on today with the picked version", () => {
    const copy = tailored("Product Manager", "Stripe");
    expect(emptyForm(NOW, copy, null)).toEqual({
      resumeId: copy.id,
      company: "Stripe",
      role: "Product Manager",
      jobUrl: "",
      appliedOn: "2026-11-07",
      status: "applied",
      notes: "",
    });
  });
});

describe("switchResume", () => {
  it("refills what still came from the old pick, and keeps what was typed", () => {
    const stripe = tailored("Product Manager", "Stripe");
    const figma = tailored("Designer", "Figma");
    const start = emptyForm(NOW, stripe, null);
    expect(switchResume(start, stripe, figma, null)).toMatchObject({
      resumeId: figma.id,
      company: "Figma",
      role: "Designer",
    });
    const typed = { ...start, company: "Stripe Payments" };
    expect(switchResume(typed, stripe, figma, null)).toMatchObject({
      company: "Stripe Payments",
      role: "Designer",
    });
    expect(switchResume(typed, stripe, null, null)).toMatchObject({
      resumeId: "",
      company: "Stripe Payments",
    });
  });
});

describe("validateForm", () => {
  const titles = new Map([["copy-1", "Product Manager at Stripe"]]);

  it("returns the cleaned body the API takes", () => {
    const result = validateForm(
      values({
        resumeId: "copy-1",
        company: "  Stripe ",
        jobUrl: "stripe.com/jobs/1",
        notes: " Ask Sam ",
      }),
      titles,
      NOW,
    );
    expect(result).toEqual({
      ok: true,
      body: {
        resumeId: "copy-1",
        jobId: null,
        resumeTitle: "Product Manager at Stripe",
        company: "Stripe",
        role: "Product Manager",
        jobUrl: "https://stripe.com/jobs/1",
        appliedAt: new Date(2026, 10, 7, 12).getTime(),
        status: "applied",
        notes: "Ask Sam",
      },
    });
    expect(validateForm(values(), titles, NOW)).toMatchObject({
      ok: true,
      body: { resumeId: null, resumeTitle: "" },
    });
  });

  it("puts a plain message on each field that's wrong", () => {
    const result = validateForm(
      values({
        company: " ",
        jobUrl: "ftp://files",
        appliedOn: "2026-11-08",
        notes: "x".repeat(501),
      }),
      titles,
      NOW,
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        company: "Add the company you applied to.",
        jobUrl: "That doesn't look like a web link. Paste the full address.",
        appliedOn: "That day hasn't come yet.",
        notes: "Keep notes under 500 characters.",
      },
    });
    expect(validateForm(values({ appliedOn: "" }), titles, NOW)).toMatchObject({
      ok: false,
      errors: { appliedOn: "Pick the day you applied." },
    });
    expect(validateForm(values({ appliedOn: "1999-12-31" }), titles, NOW)).toMatchObject({
      ok: false,
      errors: { appliedOn: "Pick a day from 2000 on." },
    });
  });
});

describe("patchFrom", () => {
  const original: Application = {
    id: "a1",
    resumeId: "copy-1",
    resumeTitle: "Product Manager at Stripe",
    company: "Stripe",
    role: "Product Manager",
    jobUrl: "",
    appliedAt: new Date(2026, 10, 1, 8, 15).getTime(),
    status: "applied",
    stageReached: "applied",
    jobId: null,
    hasPrep: false,
    interviewAt: null,
    interviewTime: null,
    interviewZone: null,
    statusChangedAt: 0,
    notes: "",
    followUpAt: null,
    createdAt: 0,
    updatedAt: 0,
  };
  const titles = new Map([["copy-1", "Product Manager at Stripe"]]);

  it("sends nothing when nothing changed, keeping the stored time of day", () => {
    const result = validateForm(formFromApplication(original), titles, NOW);
    expect(result.ok && patchFrom(original, result.body)).toEqual({});
  });

  it("sends only the changed fields", () => {
    const result = validateForm(
      { ...formFromApplication(original), notes: "Call booked", status: "interview", resumeId: "" },
      titles,
      NOW,
    );
    expect(result.ok && patchFrom(original, result.body)).toEqual({
      notes: "Call booked",
      status: "interview",
      resumeId: null,
      resumeTitle: "",
    });
  });
});
