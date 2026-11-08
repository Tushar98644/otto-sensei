import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { createRedactor, looksLikePersonName, redactorFor, redactResume } from "./redact";

const CONTACT = "Priya Natarajan\npriya.n@example.com | +44 20 7946 0958 | linkedin.com/in/priyan";

describe("createRedactor", () => {
  it("hides emails, phones, links and the known name, and restores them exactly", () => {
    const redactor = createRedactor({ name: "Priya Natarajan" });
    const text = `${CONTACT}\nPortfolio: https://priya.dev/work, www.priya.dev and github.com/priyan/ledger.`;
    const shown = redactor.redact(text);
    expect(shown).toBe(
      "[NAME]\n[EMAIL_1] | [PHONE_1] | [LINK_3]\nPortfolio: [LINK_1], [LINK_2] and [LINK_4].",
    );
    expect(redactor.restore(shown)).toBe(text);
  });

  it("gives the same value the same placeholder across calls", () => {
    const redactor = createRedactor();
    expect(redactor.redact("Mail jo@acme.io or jo@acme.io")).toBe("Mail [EMAIL_1] or [EMAIL_1]");
    expect(redactor.redact("Or ops@acme.io, then jo@acme.io")).toBe("Or [EMAIL_2], then [EMAIL_1]");
    expect(redactor.hidden("EMAIL")).toEqual(["jo@acme.io", "ops@acme.io"]);
  });

  it("finds phone numbers in the usual formats", () => {
    const redactor = createRedactor();
    for (const phone of [
      "+1 555 010 2000",
      "(555) 010-2000",
      "555-010-2000",
      "+44 20 7946 0958",
      "+49 30 901820",
      "4155550123",
    ]) {
      expect(redactor.redact(`Call ${phone} today`)).toMatch(/^Call \[PHONE_\d+\] today$/);
    }
    expect(redactor.redact("Mobile: 7946 0958")).toBe("Mobile: [PHONE_7]");
  });

  it("leaves dates, amounts, versions and skills that look like links alone", () => {
    const redactor = createRedactor({ name: "Jane Doe" });
    const lines = [
      "Senior Engineer, 2019 - 2021",
      "Jan 2019 – Dec 2021, then 01.2019 - 03.2021",
      "Served 1 200 000 users and 2 million requests",
      "Raised $120,000 and cut costs 40% in 2023",
      "Shipped v2.3.1 on S3 with HTML5 and ISO 27001",
      "Built with Node.js/Express, ASP.NET/C# and D3.js",
      "Worked at Booking.com and deployed on Fly.io",
      "Order 1234567 shipped",
    ];
    for (const line of lines) expect(redactor.redact(line)).toBe(line);
  });

  it("hides a bare personal domain only when it holds part of the name", () => {
    const redactor = createRedactor({ name: "Jane Doe" });
    expect(redactor.redact("See janedoe.dev or jdoe.me.")).toBe("See [LINK_1] or [LINK_2].");
    expect(createRedactor().redact("See janedoe.dev.")).toBe("See janedoe.dev.");
  });

  it("matches a name in running text only when it has two or more words", () => {
    expect(createRedactor({ name: "jane DOE" }).redact("JANE DOE, Jane  Doe")).toBe("[NAME], [NAME]");
    expect(createRedactor({ name: "Will" }).redact("Will ship it")).toBe("Will ship it");
    expect(createRedactor({ name: "Will" }).redactField("NAME", "Will")).toBe("[NAME]");
  });

  it("hides known values that no pattern would find", () => {
    const redactor = createRedactor({ phones: ["555 0102"], links: ["priya.design"] });
    expect(redactor.redact("555 0102 · priya.design")).toBe("[PHONE_1] · [LINK_1]");
  });

  it("restores loose spellings and keeps or drops placeholders it never handed out", () => {
    const redactor = createRedactor({ name: "Sam Rivera", emails: ["sam@example.com"] });
    redactor.redact("Sam Rivera, sam@example.com");
    expect(redactor.restore("[name] at [Email_1], [EMAIL 1] or [EMAIL]")).toBe(
      "Sam Rivera at sam@example.com, sam@example.com or sam@example.com",
    );
    expect(redactor.restore("Call [PHONE_1] about [your start date]")).toBe(
      "Call [PHONE_1] about [your start date]",
    );
    expect(redactor.restore("Call [PHONE_1]", { dropUnknown: true })).toBe("Call ");
  });

  it("restores every string in a nested value", () => {
    const redactor = createRedactor({ emails: ["sam@example.com"] });
    redactor.redact("sam@example.com");
    expect(redactor.restoreDeep({ a: ["[EMAIL_1]", 3, null], b: { c: "x [EMAIL_1]" } })).toEqual({
      a: ["sam@example.com", 3, null],
      b: { c: "x sam@example.com" },
    });
  });
});

describe("looksLikePersonName", () => {
  it("accepts names and refuses titles and headings", () => {
    for (const name of ["Jane Doe", "JANE DOE", "María José García", "Kwame O'Neil-Mensah", "J. R. Smith"]) {
      expect(looksLikePersonName(name)).toBe(true);
    }
    for (const value of ["Jane", "Senior Product Designer", "Curriculum Vitae", "jane doe", "Jane Doe 2", "A B C D E"]) {
      expect(looksLikePersonName(value)).toBe(false);
    }
  });
});

function makeResume(): Resume {
  return {
    ...emptyResume(0),
    basics: {
      name: "Priya Natarajan",
      headline: "Backend Engineer",
      email: "priya.n@example.com",
      phone: "+44 20 7946 0958",
      location: "Leeds, UK",
      links: [
        { id: "l1", label: "LinkedIn", url: "linkedin.com/in/priyan" },
        { id: "l2", label: "Site", url: "https://priya.dev" },
      ],
    },
    summary: "Priya Natarajan builds payment systems. Reach me at priya.n@example.com.",
    experience: [
      {
        id: "job-1",
        company: "Mapline",
        title: "Engineer",
        location: "",
        startDate: "2021",
        endDate: "Present",
        bullets: [{ id: "b1", text: "Launched status.priya.dev/uptime for 300 teams" }],
      },
    ],
    projects: [{ id: "p1", name: "Ledger", link: "github.com/priyan/ledger", bullets: [] }],
  };
}

describe("redactResume", () => {
  it("swaps contact fields for placeholders and keeps ids, dates and the rest", () => {
    const resume = makeResume();
    const redactor = redactorFor(resume);
    const shown = redactResume(resume, redactor);
    expect(shown.basics).toMatchObject({
      name: "[NAME]",
      email: "[EMAIL_1]",
      phone: "[PHONE_1]",
      location: "Leeds, UK",
      links: [
        { id: "l1", label: "LinkedIn", url: "[LINK_2]" },
        { id: "l2", label: "Site", url: "[LINK_3]" },
      ],
    });
    expect(shown.summary).toBe("[NAME] builds payment systems. Reach me at [EMAIL_1].");
    expect(shown.experience[0]).toMatchObject({ id: "job-1", startDate: "2021", endDate: "Present" });
    expect(shown.experience[0]?.bullets[0]).toEqual({ id: "b1", text: "Launched [LINK_4] for 300 teams" });
    expect(shown.projects[0]?.link).toBe("[LINK_1]");
    expect(redactor.restoreDeep(shown)).toEqual(resume);
  });
});
