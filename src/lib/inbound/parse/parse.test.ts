import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadFixture as load } from "../inbound-testing";
import type { HiringSystem } from "../types";
import { readEmail, type ReadKind } from "./index";

const DIR = fileURLToPath(new URL("./fixtures", import.meta.url));
const NOW = Date.UTC(2026, 10, 20, 12);

type Expect = {
  kind: ReadKind;
  system?: HiringSystem | null;
  company?: string;
  role?: string;
  when?: string | null;
  jobUrl?: string;
  zone?: string;
  forwarded?: "auto" | "manual" | null;
};

const CASES: Record<string, Expect> = {
  "greenhouse-applied.txt": {
    kind: "applied",
    system: "greenhouse",
    company: "Northwind",
    role: "Senior Product Designer",
    jobUrl: "https://boards.greenhouse.io/northwind/jobs/4417201",
    forwarded: "auto",
  },
  "greenhouse-applied-forwarded.txt": {
    kind: "applied",
    system: "greenhouse",
    company: "Lumen Labs",
    role: "Backend Engineer, Payments",
    forwarded: "manual",
  },
  "greenhouse-rejected.txt": {
    kind: "rejected",
    system: "greenhouse",
    company: "Northwind",
    role: "Senior Product Designer",
  },
  "greenhouse-interview.txt": {
    kind: "interview",
    system: "greenhouse",
    company: "Lumen Labs",
    role: "Backend Engineer, Payments",
    when: "2026-11-24T18:00:00.000Z",
  },
  "greenhouse-availability.txt": {
    kind: "interview",
    system: "greenhouse",
    company: "Fernbrook",
    role: "Data Analyst",
    when: null,
  },
  "greenhouse-offer-forwarded.txt": {
    kind: "offer",
    system: "greenhouse",
    company: "Lumen Labs",
    role: "Backend Engineer, Payments",
    forwarded: "manual",
  },
  "lever-applied.txt": {
    kind: "applied",
    system: "lever",
    company: "Fernbrook",
    role: "Data Analyst",
    jobUrl: "https://jobs.lever.co/fernbrook/5d2c8a1e-3b7f-4c1d-9a2e-6f0b1c2d3e4f",
  },
  "lever-rejected-forwarded.txt": {
    kind: "rejected",
    system: "lever",
    company: "Pinecrest Studios",
    role: "Motion Designer",
    forwarded: "manual",
  },
  "lever-interview-calendly.txt": {
    kind: "interview",
    system: "lever",
    company: "Pinecrest Studios",
    role: "Motion Designer",
    when: null,
  },
  "ashby-applied.txt": {
    kind: "applied",
    system: "ashby",
    company: "Quill",
    role: "Founding Engineer",
    jobUrl: "https://jobs.ashbyhq.com/quill/2f6d5b0a-8c4e-4b7a-9f21-3e5c6d7a8b9c",
  },
  "ashby-interview.txt": {
    kind: "interview",
    system: "ashby",
    company: "Quill",
    role: "Founding Engineer",
    when: "2026-12-03T14:00:00.000Z",
  },
  "ashby-rejected.txt": {
    kind: "rejected",
    system: "ashby",
    company: "Quill",
    role: "Product Engineer",
  },
  "workday-applied.txt": {
    kind: "applied",
    system: "workday",
    company: "Northbridge Bank",
    role: "Financial Analyst II",
    jobUrl:
      "https://northbridge.wd5.myworkdayjobs.com/en-US/External/job/Mumbai/Financial-Analyst-II_R-24518",
  },
  "workday-rejected.txt": {
    kind: "rejected",
    system: "workday",
    company: "Northbridge Bank",
    role: "Financial Analyst II",
  },
  "workday-assessment-forwarded.txt": {
    kind: "assessment",
    system: "workday",
    company: "Halcyon Pharma",
    role: "Clinical Data Associate",
    when: null,
    forwarded: "manual",
  },
  "smartrecruiters-applied.txt": {
    kind: "applied",
    system: "smartrecruiters",
    company: "Vantage Retail",
    role: "Store Operations Manager",
  },
  "smartrecruiters-interview.txt": {
    kind: "interview",
    system: "smartrecruiters",
    company: "Vantage Retail",
    role: "Store Operations Manager",
    when: "2026-11-25T05:30:00.000Z",
  },
  "smartrecruiters-rejected.txt": {
    kind: "rejected",
    system: "smartrecruiters",
    company: "Vantage Retail",
    role: "Store Operations Manager",
  },
  "icims-applied.txt": {
    kind: "applied",
    system: "icims",
    company: "Meridian Health",
    role: "Registered Nurse - ICU",
  },
  "icims-rejected.txt": {
    kind: "rejected",
    system: "icims",
    company: "Meridian Health",
    role: "Registered Nurse - ICU",
  },
  "icims-interview.txt": {
    kind: "interview",
    system: "icims",
    company: "Meridian Health",
    role: "Charge Nurse",
    when: "2026-11-30T14:30:00.000Z",
  },
  "taleo-applied.txt": {
    kind: "applied",
    system: "taleo",
    company: "Halcyon Pharma",
    role: "Clinical Research Associate",
  },
  "taleo-rejected.txt": {
    kind: "rejected",
    system: "taleo",
    company: "Halcyon Pharma",
    role: "Clinical Research Associate",
  },
  "taleo-interview.txt": {
    kind: "interview",
    system: "taleo",
    company: "Halcyon Pharma",
    role: "Regulatory Affairs Specialist",
    when: "2026-12-02T09:30:00.000Z",
  },
  "workable-applied.txt": {
    kind: "applied",
    system: "workable",
    company: "Brightline",
    role: "Customer Success Manager",
    jobUrl: "https://apply.workable.com/brightline/j/8A3C2D1E0F/",
  },
  "workable-rejected.txt": {
    kind: "rejected",
    system: "workable",
    company: "Brightline",
    role: "Customer Success Manager",
  },
  "workable-assessment.txt": {
    kind: "assessment",
    system: "workable",
    company: "Brightline",
    role: "Customer Success Manager",
  },
  "naukri-applied.txt": {
    kind: "applied",
    system: "naukri",
    company: "Saffron Systems Pvt Ltd",
    role: "Java Developer",
  },
  "naukri-interview.txt": {
    kind: "interview",
    system: "naukri",
    company: "Kaveri Infotech",
    role: "Senior Java Developer",
    when: "2026-11-27T05:30:00.000Z",
    zone: "Asia/Kolkata",
  },
  "naukri-rejected.txt": {
    kind: "rejected",
    system: "naukri",
    company: "Kaveri Infotech",
    role: "Java Lead",
  },
  "naukri-alert.txt": { kind: "noise" },
  "linkedin-applied.txt": {
    kind: "applied",
    system: "linkedin",
    company: "Orbit Analytics",
    role: "Data Scientist",
    jobUrl: "https://www.linkedin.com/jobs/view/4012345678",
  },
  "linkedin-viewed.txt": {
    kind: "applied",
    system: "linkedin",
    company: "Orbit Analytics",
    role: "Data Scientist",
  },
  "linkedin-rejected.txt": {
    kind: "rejected",
    system: "linkedin",
    company: "Cobalt",
    role: "Product Analyst",
  },
  "linkedin-alert.txt": { kind: "noise" },
  "indeed-applied.txt": {
    kind: "applied",
    system: "indeed",
    company: "Ridgeway Logistics",
    role: "Warehouse Associate",
  },
  "indeed-rejected.txt": {
    kind: "rejected",
    system: "indeed",
    company: "Ridgeway Logistics",
    role: "Warehouse Associate",
  },
  "indeed-interview.txt": {
    kind: "interview",
    system: "indeed",
    company: "Ridgeway Logistics",
    role: "Shift Supervisor",
    when: "2026-12-02T19:00:00.000Z",
  },
  "direct-applied-uk.txt": {
    kind: "applied",
    system: null,
    company: "Tidewater",
    role: "Graduate Engineer",
    forwarded: null,
  },
  "direct-interview-calendly.txt": {
    kind: "interview",
    system: null,
    company: "Juniper Health",
    role: "Clinical Data Manager",
    when: null,
  },
  "calendly-confirmed.txt": {
    kind: "interview",
    company: "Juniper Health",
    role: "",
    when: "2026-11-25T15:00:00.000Z",
  },
  "google-calendar-invite.txt": {
    kind: "interview",
    company: "Saffron Systems",
    when: "2026-11-26T09:30:00.000Z",
  },
  "direct-offer-india.txt": {
    kind: "offer",
    company: "Mistral Consulting",
    role: "Senior Analyst",
  },
  "direct-offer-us.txt": {
    kind: "offer",
    company: "Juniper Health",
    role: "Clinical Data Manager",
  },
  "india-offer-selected.txt": {
    kind: "offer",
    company: "Kaveri Infotech",
    role: "Business Analyst",
  },
  "outlook-forward-rejected.txt": {
    kind: "rejected",
    company: "Cobalt",
    role: "Growth Marketing Lead",
    forwarded: "manual",
  },
  "apple-forward-interview.txt": {
    kind: "interview",
    company: "Riverstone Apps",
    role: "Senior iOS Engineer",
    when: "2026-11-30T16:00:00.000Z",
    forwarded: "manual",
  },
  "hackerrank-assessment.txt": { kind: "assessment", company: "Saffron Systems", when: null },
  "direct-assessment-takehome.txt": {
    kind: "assessment",
    company: "Riverstone Apps",
    role: "Senior iOS Engineer",
  },
  "rejection-trap-thanks.txt": {
    kind: "rejected",
    company: "Orbit Analytics",
    role: "Data Scientist",
  },
  "applied-trap-process.txt": { kind: "applied", company: "Coral Labs", role: "Platform Engineer" },
  "india-applied-acknowledge.txt": {
    kind: "applied",
    company: "Nilgiri Software Solutions",
    role: "Associate Consultant",
  },
  "india-rejected-candidature.txt": {
    kind: "rejected",
    company: "Nilgiri Software Solutions",
    role: "Associate Consultant",
  },
  "india-walk-in.txt": {
    kind: "interview",
    company: "Saffron Systems",
    role: "QA Engineer",
    when: "2026-11-28T05:00:00.000Z",
    zone: "Asia/Kolkata",
  },
  "india-shortlisted-next-round.txt": {
    kind: "interview",
    company: "Kaveri Infotech",
    role: "Business Analyst",
    when: "2026-11-24T09:00:00.000Z",
    forwarded: "manual",
  },
  "gmail-confirmation.txt": { kind: "confirmation" },
  "gmail-confirmation-lookalike.txt": { kind: "unknown" },
  "otto-test.txt": { kind: "test" },
  "otto-test-forwarded.txt": { kind: "test" },
  "unknown-personal.txt": { kind: "unknown" },
  "unknown-shipping.txt": { kind: "unknown" },
};

describe("reading job emails", () => {
  it("has an expectation for every fixture, and over 40 of them", () => {
    const files = readdirSync(DIR).filter((file) => file.endsWith(".txt"));
    expect(files.sort()).toEqual(Object.keys(CASES).sort());
    expect(files.length).toBeGreaterThan(40);
  });

  for (const [file, expected] of Object.entries(CASES)) {
    it(file, () => {
      const reading = readEmail(load(file), { now: NOW, zone: expected.zone ?? null });
      const { kind, system, company, role, when, jobUrl, forwarded } = expected;
      expect(reading.kind).toBe(kind);
      if (system !== undefined) expect(reading.system).toBe(system);
      if (company !== undefined) expect(reading.company).toBe(company);
      if (role !== undefined) expect(reading.role).toBe(role);
      if (when !== undefined) {
        expect(reading.when === null ? null : new Date(reading.when.at).toISOString()).toBe(when);
      }
      if (jobUrl !== undefined) expect(reading.jobUrl).toBe(jobUrl);
      if (forwarded !== undefined) expect(reading.forwarded).toBe(forwarded);
    });
  }

  it("shows Gmail's code and confirm link, and never a lookalike's", () => {
    const real = readEmail(load("gmail-confirmation.txt"), { now: NOW, zone: null });
    expect(real.gmail?.code).toBe("123456789");
    expect(real.gmail?.source).toBe("priya.sharma@gmail.com");
    expect(real.gmail?.url).toMatch(/^https:\/\/mail-settings\.google\.com\/mail\/vf-/);
    const fake = readEmail(load("gmail-confirmation-lookalike.txt"), { now: NOW, zone: null });
    expect(fake.gmail).toBeNull();
  });

  it("reads the time zone each interview states", () => {
    const reading = readEmail(load("smartrecruiters-interview.txt"), {
      now: NOW,
      zone: "America/New_York",
    });
    expect(reading.when?.text).toContain("11:00 AM IST");
  });
});

describe("the interview line", () => {
  it("keeps the times and zone as the email wrote them", () => {
    const reading = readEmail(load("greenhouse-interview.txt"), { now: NOW, zone: null });
    expect(reading.when?.text).toBe("Tuesday, November 24, 2026 10:00 AM - 11:00 AM PST");
    const later = readEmail(load("ashby-interview.txt"), { now: NOW, zone: null });
    expect(later.when?.text).toBe("Thursday, December 3, 2026 at 2:00 PM GMT");
  });
});
