import { describe, expect, it } from "vitest";
import type { TailorRequirement } from "@/lib/ai/types";
import { lintResume } from "@/lib/lint/bullets";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { otherForm } from "./acronyms";
import { jobLines, rowReasons, tailorFixFirst, type ReasonContext } from "./reasons";
import { coreTitle, summaryCheck, titleCheck } from "./title-checks";
import { screenerRows } from "./requirements";

const NOW = Date.UTC(2026, 10, 11);

function resume(fields: Partial<Resume> = {}): Resume {
  const base = emptyResume(0);
  return {
    ...base,
    basics: { ...base.basics, name: "Dana Cho", headline: "Software Engineer" },
    summary: "Engineer who builds shipment tracking systems.",
    experience: [
      {
        id: "lumen",
        title: "Software Engineer",
        company: "Lumen Logistics",
        location: "",
        startDate: "Jan 2022",
        endDate: "Present",
        bullets: [
          { id: "l1", text: "Responsible for maintaining the PostgreSQL database and migrations" },
          { id: "l2", text: "Cut p95 latency from 900ms to 210ms with a Redis cache" },
          { id: "l3", text: "Deployed services on Amazon Web Services for 40 carriers" },
          { id: "l4", text: "Ran the weekly support rotation for 12 engineers" },
        ],
      },
      {
        id: "bright",
        title: "Junior Developer",
        company: "Brightside",
        location: "",
        startDate: "Jun 2019",
        endDate: "Dec 2021",
        bullets: [],
      },
    ],
    projects: [
      {
        id: "alerts",
        name: "Transit Alerts",
        link: "",
        bullets: [{ id: "p1", text: "Go service that sends delay alerts to 900 riders" }],
      },
    ],
    skills: [
      { id: "s", label: "Tools", items: ["Kubernetes", "Go-to-market planning", "Terraform"] },
    ],
    ...fields,
  };
}

let next = 0;
function req(
  text: string,
  terms: string[],
  importance: "must" | "nice" = "must",
  quote = "",
): TailorRequirement {
  next += 1;
  return {
    id: `r${next}`,
    text,
    importance,
    source: "structure",
    terms,
    quote,
    ask: `Have you done ${text}?`,
  };
}

function setup(requirements: TailorRequirement[], fields: Partial<Resume> = {}) {
  const r = resume(fields);
  const rows = screenerRows(r, requirements);
  const context: ReasonContext = { resume: r, lint: lintResume(r), now: NOW };
  return { r, rows, context, reasons: rowReasons(rows, context) };
}

describe("rowReasons", () => {
  it("says a skill is only listed, naming the skills group", () => {
    const kube = req("Kubernetes", ["Kubernetes"]);
    const { reasons } = setup([kube]);
    expect(reasons[kube.id]).toEqual({
      text: "Only in your Skills list (Tools). No job line shows you using it, and screeners look for it in what you did.",
      tone: "warn",
      form: null,
    });
  });

  it("names the job, and what's weak about the line that shows a requirement", () => {
    const pg = req("PostgreSQL", ["PostgreSQL"]);
    const redis = req("Redis", ["Redis"], "nice");
    const { reasons } = setup([pg, redis]);
    expect(reasons[pg.id]?.tone).toBe("warn");
    expect(reasons[pg.id]?.text).toBe(
      "Shown at Lumen Logistics, but that line reads like a job description.",
    );
    expect(reasons[redis.id]).toEqual({
      text: "Shown in a line at Lumen Logistics.",
      tone: "pass",
      form: null,
    });
  });

  it("says when proof is only in a project, and asks about work for a must-have", () => {
    const go = req("Go in production", ["Go"]);
    const { reasons } = setup([go]);
    expect(reasons[go.id]?.text).toBe(
      "Shown in your project Transit Alerts, not in a job. If you used it at work, say so in that job.",
    );
  });

  it("says when proof is only in the summary or a job title", () => {
    const tracking = req("Shipment tracking", ["shipment tracking"]);
    const { reasons } = setup([tracking]);
    expect(reasons[tracking.id]).toMatchObject({
      text: "Only in your summary. Show it in a line about what you did, too.",
      tone: "warn",
    });
  });

  it("flags a name written another way than the post writes it", () => {
    const aws = req("AWS", ["AWS"]);
    const { reasons } = setup([aws]);
    expect(reasons[aws.id]?.tone).toBe("warn");
    expect(reasons[aws.id]?.text).toContain(
      'The post says "AWS" and your line says it another way. Some systems match exact words only, so use "AWS" once too.',
    );
  });

  it("finds the spelled-out form when the post uses the short one", () => {
    const gtm = req("GTM planning", ["GTM"], "nice");
    const { rows, reasons } = setup([gtm]);
    expect(rows[0]?.status).toBe("missing");
    expect(reasons[gtm.id]).toEqual({
      text: 'Your resume says "go-to-market"; the post says "GTM". Keyword searches find only the form typed, so write both once: "go-to-market (GTM)".',
      tone: "warn",
      form: { asked: "GTM", written: "go-to-market", both: "go-to-market (GTM)" },
    });
  });

  it("says plainly when nothing shows a requirement", () => {
    const cicd = req("CI/CD pipelines", ["CI/CD"]);
    const pay = req("Payments", ["payments"], "nice");
    const { reasons } = setup([cicd, pay]);
    expect(reasons[cicd.id]?.text).toBe(
      "The post asks for this, and nothing in your resume says it yet.",
    );
    expect(reasons[pay.id]?.text).toBe("A plus for this job. Nothing in your resume says it yet.");
  });

  it("adds the years to a proof that is only in the summary", () => {
    const years = req(
      "5+ years in logistics software",
      [],
      "must",
      "builds shipment tracking systems",
    );
    const { reasons } = setup([years]);
    expect(reasons[years.id]?.text).toBe(
      "Only in your summary. Show it in a line about what you did, too. The post asks for 5+ years; your job dates add up to about 7 years.",
    );
  });

  it("adds the years the job dates cover when the post asks for years", () => {
    const years = req(
      "3+ years building backend services",
      [],
      "must",
      "Cut p95 latency from 900ms to 210ms",
    );
    const { reasons } = setup([years]);
    expect(reasons[years.id]?.text).toBe(
      "Shown in a line at Lumen Logistics. The post asks for 3+ years; your job dates add up to about 7 years.",
    );
  });
});

describe("titleCheck", () => {
  it("reads the title without its team or level", () => {
    expect(coreTitle("Backend Engineer, Payments Platform")).toBe("Backend Engineer");
    expect(coreTitle("Senior Product Marketing Manager - Remote")).toBe(
      "Senior Product Marketing Manager",
    );
  });

  it("matches the headline, ignoring level words", () => {
    expect(titleCheck(resume(), "Senior Software Engineer")?.status).toBe("match");
  });

  it("matches the latest job title when the headline doesn't", () => {
    const r = resume({ basics: { ...resume().basics, headline: "Builder" } });
    expect(titleCheck(r, "Software Engineer")?.text).toBe(
      'Your latest job title matches the post\'s title, "Software Engineer".',
    );
  });

  it("suggests the headline or summary, never a past job title", () => {
    const check = titleCheck(resume(), "Backend Engineer, Payments Platform");
    expect(check).toEqual({
      status: "differs",
      core: "Backend Engineer",
      text: 'The post\'s title is "Backend Engineer"; your headline says "Software Engineer". If the job fits you, use its title in your headline or summary. Never change a past job\'s title.',
    });
  });

  it("asks for a headline when there is none", () => {
    const r = resume({ basics: { ...resume().basics, headline: "" } });
    expect(titleCheck(r, "Account Executive")?.status).toBe("missing");
  });
});

describe("summaryCheck", () => {
  it("passes a summary that names a must-have", () => {
    const pg = req("PostgreSQL", ["PostgreSQL"]);
    const { r, rows } = setup([pg], { summary: "Engineer who runs PostgreSQL at scale." });
    expect(summaryCheck(r, rows, "Backend Engineer")).toEqual({
      status: "match",
      text: "Your summary names PostgreSQL.",
    });
  });

  it("only suggests names the resume already shows", () => {
    const redis = req("Redis", ["Redis"]);
    const kube = req("Kubernetes", ["Kubernetes"]);
    const { r, rows } = setup([redis, kube]);
    const check = summaryCheck(r, rows, "Backend Engineer");
    expect(check.status).toBe("differs");
    expect(check.text).toBe(
      "Your summary doesn't name this job or its must-haves. You show Redis in your lines; say it up top too.",
    );
    expect(check.text).not.toContain("Kubernetes");
  });

  it("asks for a summary when there is none", () => {
    const { r, rows } = setup([], { summary: "" });
    expect(summaryCheck(r, rows, "Backend Engineer").status).toBe("missing");
  });
});

describe("jobLines", () => {
  it("lists lines that show requirements, weak must-have proof first", () => {
    const pg = req("PostgreSQL", ["PostgreSQL"]);
    const redis = req("Redis", ["Redis"]);
    const go = req("Go", ["Go"], "nice");
    const { rows, context } = setup([redis, pg, go]);
    const { lines, unrelated } = jobLines(rows, context);
    expect(lines.map((line) => line.bulletId)).toEqual(["l1", "l2", "p1"]);
    expect(lines[0]?.note).toMatch(
      /^Shows PostgreSQL \(a must-have\)\. "Responsible for" reads like a job description\./,
    );
    expect(lines[1]?.note).toBe("Shows Redis (a must-have). Keep it near the top.");
    expect(unrelated).toBe(2);
  });
});

describe("tailorFixFirst", () => {
  it("orders missing, listed, other spelling, then weak proof, and stops at three", () => {
    const cicd = req("CI/CD", ["CI/CD"]);
    const kube = req("Kubernetes", ["Kubernetes"]);
    const pg = req("PostgreSQL", ["PostgreSQL"]);
    const gtm = req("GTM", ["GTM"]);
    const pay = req("Payments", ["payments"], "nice");
    const { rows, reasons, context, r } = setup([cicd, kube, pg, gtm, pay]);
    const { lines } = jobLines(rows, context);
    const items = tailorFixFirst({
      rows,
      reasons,
      lines,
      title: titleCheck(r, "Backend Engineer"),
      summary: summaryCheck(r, rows, "Backend Engineer"),
    });
    expect(items.map((item) => item.key)).toEqual(["missing", "listed", "spelled"]);
    expect(items[0]).toMatchObject({
      title: "1 must-have isn't on your resume: CI/CD",
      action: { kind: "row", rowId: cicd.id },
    });
    expect(items.map((item) => item.title).join(" ")).not.toContain("payments");
  });

  it("writes a kind of experience in lowercase mid-sentence, a tool as named", () => {
    const mentoring = req("Mentoring junior engineers", []);
    const cicd = req("CI/CD", ["CI/CD"]);
    const { rows, reasons, context, r } = setup([mentoring, cicd]);
    const [first] = tailorFixFirst({
      rows,
      reasons,
      lines: jobLines(rows, context).lines,
      title: titleCheck(r, "Software Engineer"),
      summary: summaryCheck(r, rows, "Software Engineer"),
    });
    expect(first?.title).toBe(
      "2 must-haves aren't on your resume: mentoring junior engineers and CI/CD",
    );
  });

  it("falls back to the title and summary once every must-have is shown", () => {
    const redis = req("Redis", ["Redis"]);
    const { rows, reasons, context, r } = setup([redis]);
    const items = tailorFixFirst({
      rows,
      reasons,
      lines: jobLines(rows, context).lines,
      title: titleCheck(r, "Backend Engineer"),
      summary: summaryCheck(r, rows, "Backend Engineer"),
    });
    expect(items.map((item) => item.key)).toEqual(["title", "summary"]);
  });
});

describe("otherForm", () => {
  it("pairs a short form with its spelled-out name, either way round", () => {
    expect(otherForm("SEO", "Ran search engine optimization for 3 sites")).toEqual({
      asked: "SEO",
      written: "search engine optimization",
      both: "search engine optimization (SEO)",
    });
    expect(otherForm("customer relationship management", "Kept the CRM clean")).toEqual({
      asked: "customer relationship management",
      written: "CRM",
      both: "customer relationship management (CRM)",
    });
  });

  it("stays quiet when the post's form is there, neither is, or the term isn't known", () => {
    expect(otherForm("SEO", "Ran SEO audits")).toBeNull();
    expect(otherForm("SEO", "Wrote blog posts")).toBeNull();
    expect(otherForm("Kubernetes", "Ran k8s clusters")).toBeNull();
  });
});
