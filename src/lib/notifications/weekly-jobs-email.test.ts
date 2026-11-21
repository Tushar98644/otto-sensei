import { describe, expect, it } from "vitest";
import { tailorUrl, weeklyJobsEmail, type DigestJob } from "./weekly-jobs-email";

const links = {
  ottoHeadUrl: "https://otto.test/email/otto-head.png",
  settingsUrl: "https://otto.test/dashboard/account#reminders",
  unsubscribeUrl: "https://otto.test/api/notifications/unsubscribe?u=1&t=2&l=jobs",
};

const job = (overrides: Partial<DigestJob> = {}): DigestJob => ({
  id: "job-1",
  title: "Backend Engineer",
  company: "Acme",
  location: "Berlin, Germany",
  remote: true,
  source: "greenhouse",
  url: "https://job-boards.greenhouse.io/acme/jobs/1",
  ...overrides,
});

const email = (found: number, jobs: DigestJob[], free = false) =>
  weeklyJobsEmail({
    to: "maya@example.com",
    found,
    jobs,
    free,
    jobsUrl: "https://otto.test/dashboard/jobs",
    links,
  });

describe("weeklyJobsEmail", () => {
  it("says how many are new, lists each with its place and source, and links each to tailoring", () => {
    const message = email(12, [
      job(),
      job({ title: "Platform Engineer", remote: false, location: "Remote - US" }),
    ]);
    expect(message.subject).toBe("12 new jobs match your resume");
    expect(message.text).toContain(
      "12 jobs posted in the past week match your resume. Here are the closest 2.",
    );
    expect(message.text).toContain(
      "- Backend Engineer\n  Acme · Remote · Berlin, Germany · via Greenhouse",
    );
    expect(message.text).toContain("  Acme · Remote - US · via Greenhouse");
    expect(message.text).toContain(
      "  Tailor your resume: https://otto.test/dashboard/jobs?tailor=job-1\n  View the post: https://job-boards.greenhouse.io/acme/jobs/1",
    );
    expect(message.html).toContain(
      '<a href="https://otto.test/dashboard/jobs?tailor=job-1" style="color:#12241d;font-weight:600">Backend Engineer</a>',
    );
    expect(message.html).toContain('href="https://job-boards.greenhouse.io/acme/jobs/1"');
    expect(message.text).not.toContain("Each link opens the original post.");
    expect(message.headers).toEqual({
      "List-Unsubscribe": `<${links.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("reads right for one job, and never counts fewer than it lists", () => {
    expect(email(1, [job()]).subject).toBe("A new job matches your resume");
    expect(email(1, [job()]).text).toContain(
      "One job posted in the past week matches your resume.",
    );
    expect(email(0, [job(), job()]).subject).toBe("2 new jobs match your resume");
  });

  it("escapes what job posts say, and tells Free what Pro adds only when there's more", () => {
    const message = email(
      9,
      [job({ title: '<img src=x onerror="alert(1)">', company: "A & B" })],
      true,
    );
    expect(message.html).not.toContain("<img src=x");
    expect(message.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(message.html).toContain("A &amp; B");
    expect(message.text).toContain(
      "On Free, the Jobs tab shows your closest 5. Pro shows every match.",
    );
    expect(email(3, [job()], true).text).not.toContain("Pro shows every match");
  });

  it("keeps a job id with odd characters inside the tailor link", () => {
    expect(tailorUrl("https://otto.test/dashboard/jobs", "a&b c")).toBe(
      "https://otto.test/dashboard/jobs?tailor=a%26b+c",
    );
  });
});
