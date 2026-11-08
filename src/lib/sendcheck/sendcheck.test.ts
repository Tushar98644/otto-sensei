import { describe, expect, it } from "vitest";
import { emptyResume, type Experience, type Resume } from "@/lib/resume/schema";
import { copiedRuns, jobPhrases } from "./copied";
import { monthIndex, parseDate, parseRange, sureOverlap } from "./dates";
import { runSendCheck } from "./index";
import { findPlaceholders } from "./placeholders";
import { findTools } from "./tools";

const NOW = Date.UTC(2026, 10, 7);

function job(id: string, overrides: Partial<Experience> = {}): Experience {
  return {
    id,
    title: "Software Engineer",
    company: `Company ${id}`,
    location: "",
    startDate: "Jan 2020",
    endDate: "Dec 2020",
    bullets: [],
    ...overrides,
  };
}

function resumeWith(overrides: Partial<Resume> = {}): Resume {
  return {
    ...emptyResume(0),
    basics: {
      name: "Maya Lindqvist",
      headline: "Backend engineer",
      email: "maya@example.com",
      phone: "",
      location: "Toronto, Canada",
      links: [],
    },
    summary: "Backend engineer who builds payment systems.",
    ...overrides,
  };
}

const rules = (resume: Resume, context = {}) =>
  runSendCheck(resume, { now: NOW, ...context }).map((item) => [item.rule, item.title]);

describe("dates", () => {
  it("reads the ways people write dates as spans of months", () => {
    expect(parseDate("Mar 2021")).toEqual({
      earliest: monthIndex(2021, 2),
      latest: monthIndex(2021, 2),
      expected: false,
    });
    expect(parseDate("2019")).toMatchObject({
      earliest: monthIndex(2019, 0),
      latest: monthIndex(2019, 11),
    });
    expect(parseDate("03/2020")).toMatchObject({ earliest: monthIndex(2020, 2) });
    expect(parseDate("2020-03")).toMatchObject({ earliest: monthIndex(2020, 2) });
    expect(parseDate("Sept. 2018")).toMatchObject({ earliest: monthIndex(2018, 8) });
    expect(parseDate("Summer 2019")).toMatchObject({
      earliest: monthIndex(2019, 5),
      latest: monthIndex(2019, 7),
    });
    expect(parseDate("Present")).toBe("present");
    expect(parseDate("Expected May 2027")).toMatchObject({ expected: true });
    expect(parseDate("someday")).toBeNull();
    expect(parseDate("")).toBeNull();
  });

  it("splits a whole range typed into the start field", () => {
    const range = parseRange("Jan 2020 - Mar 2021", "", monthIndex(2026, 10));
    expect(range.start?.earliest).toBe(monthIndex(2020, 0));
    expect(range.end?.earliest).toBe(monthIndex(2021, 2));
  });

  it("counts only the months two spans surely share", () => {
    const a = parseRange("2019", "2020", 0);
    const b = parseRange("Dec 2020", "2021", 0);
    // "2020" could end in January, so nothing is sure.
    expect(sureOverlap(a as never, b as never)).toBe(0);
  });

  it("flags dates that run backwards", () => {
    const resume = resumeWith({
      experience: [job("a", { startDate: "Mar 2022", endDate: "Jan 2021" })],
    });
    const [item] = runSendCheck(resume, { now: NOW });
    expect(item).toMatchObject({
      rule: "dates",
      title: "Dates run backwards",
      target: { kind: "entry", entryId: "a" },
    });
  });

  it("flags a job date in the future, but not an expected one or a future graduation", () => {
    const resume = resumeWith({
      experience: [
        job("a", { startDate: "Jan 2025", endDate: "Jun 2027" }),
        job("b", { startDate: "Jan 2021", endDate: "Dec 2024" }),
      ],
      education: [
        {
          id: "s",
          school: "University of Edinburgh",
          degree: "MSc",
          field: "",
          location: "",
          startDate: "2025",
          endDate: "2028",
          bullets: [],
        },
      ],
      certifications: [
        { id: "c1", name: "AWS Solutions Architect", issuer: "AWS", date: "Expected 2027" },
        { id: "c2", name: "CKA", issuer: "CNCF", date: "Mar 2028" },
      ],
    });
    const items = runSendCheck(resume, { now: NOW }).filter((item) => item.rule === "dates");
    expect(items.map((item) => [item.title, item.target])).toEqual([
      ["Date in the future", { kind: "entry", entryId: "a" }],
      ["Date in the future", { kind: "entry", entryId: "c2" }],
    ]);
    expect(items[0]!.message).toContain("Jun 2027");
  });

  it("flags jobs that overlap by 3 months or more at different companies", () => {
    const resume = resumeWith({
      experience: [
        job("new", { startDate: "Jun 2021", endDate: "Present" }),
        job("old", { startDate: "Jan 2019", endDate: "Dec 2021" }),
        // A month of handover is normal.
        job("handover", { startDate: "Jan 2017", endDate: "Feb 2019" }),
      ],
    });
    const items = runSendCheck(resume, { now: NOW }).filter(
      (item) => item.title === "Dates overlap",
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.target).toEqual({ kind: "entry", entryId: "old" });
    expect(items[0]!.message).toContain("7 months");
  });

  it("doesn't flag two roles at the same company", () => {
    const resume = resumeWith({
      experience: [
        job("a", { company: "Northwind", startDate: "Jan 2021", endDate: "Present" }),
        job("b", { company: "northwind", startDate: "Mar 2019", endDate: "Jun 2021" }),
      ],
    });
    expect(rules(resume)).toEqual([]);
  });
});

describe("tools named before they existed", () => {
  it("knows the curated release dates", () => {
    const year = (text: string) => {
      const [mention] = findTools(text);
      return mention
        ? [mention.tool.name, Math.floor(mention.releasedAt / 12), (mention.releasedAt % 12) + 1]
        : null;
    };
    expect(year("Used ChatGPT daily")).toEqual(["ChatGPT", 2022, 11]);
    expect(year("Built on GPT-4 and evals")).toEqual(["GPT-4", 2023, 3]);
    expect(year("Wrote prompts for Claude")).toEqual(["Claude", 2023, 3]);
    expect(year("Paired with GitHub Copilot")).toEqual(["GitHub Copilot", 2021, 6]);
    expect(year("Moved to Kubernetes")).toEqual(["Kubernetes", 2014, 6]);
    expect(year("Packaged in docker")).toEqual(["Docker", 2013, 3]);
    expect(year("Built the app in React")).toEqual(["React", 2013, 5]);
    expect(year("Next.js storefront")).toEqual(["Next.js", 2016, 10]);
    expect(year("Ported to TypeScript")).toEqual(["TypeScript", 2012, 10]);
    expect(year("Wrote it in Swift")).toEqual(["Swift", 2014, 6]);
    expect(year("Android app in Kotlin")).toEqual(["Kotlin", 2016, 2]);
    expect(year("Rewrote the parser in Rust")).toEqual(["Rust", 2015, 5]);
    expect(year("Managed infra with Terraform")).toEqual(["Terraform", 2014, 7]);
    expect(year("Styled with Tailwind CSS")).toEqual(["Tailwind", 2017, 11]);
  });

  it("keeps the more specific name and never matches inside a longer one", () => {
    expect(findTools("Shipped with Claude Code").map((m) => m.tool.name)).toEqual(["Claude Code"]);
    expect(findTools("Fine-tuned GPT-4o").map((m) => m.tool.name)).toEqual(["GPT-4o"]);
    expect(findTools("Ran the Reactor team")).toEqual([]);
    expect(findTools("Mobile app in React Native").map((m) => m.tool.name)).toEqual([
      "React Native",
    ]);
  });

  it("leaves everyday words, first names and other companies alone", () => {
    expect(findTools("Fixed rust on 40 bridges")).toEqual([]);
    expect(findTools("React quickly to customer complaints")).toEqual([]);
    expect(findTools("Swift response to 300 tickets a week")).toEqual([]);
    expect(findTools("Mentored Claude and 3 other interns")).toEqual([]);
    expect(findTools("Taught Kafka and Camus to 120 students")).toEqual([]);
    expect(findTools("Ran the box office at Vue cinemas")).toEqual([]);
    expect(findTools("Scheduled 400 pins a month with Tailwind")).toEqual([]);
    expect(findTools("Copilot on 300 regional flights")).toEqual([]);
    expect(findTools("Designed a svelte packaging line")).toEqual([]);
    // Context makes the bare name count.
    expect(findTools("Moved events onto Kafka topics").map((m) => m.tool.name)).toEqual(["Kafka"]);
    expect(findTools("Built Vue components").map((m) => m.tool.name)).toEqual(["Vue"]);
    // A job title starts with the name because it is the name.
    expect(findTools("React Developer", { heading: true }).map((m) => m.tool.name)).toEqual([
      "React",
    ]);
  });

  it("flags a tool in a job that ended before it came out", () => {
    const resume = resumeWith({
      experience: [
        job("a", {
          startDate: "2018",
          endDate: "2020",
          bullets: [
            { id: "b1", text: "Drafted support replies with ChatGPT, cutting response time 30%." },
            { id: "b2", text: "Moved 40 services to Kubernetes." },
          ],
        }),
        job("b", {
          title: "Tailwind CSS Developer",
          startDate: "2015",
          endDate: "Jun 2016",
          bullets: [],
        }),
      ],
    });
    const items = runSendCheck(resume, { now: NOW }).filter((item) => item.rule === "tool-dates");
    expect(items.map((item) => [item.quote, item.target])).toEqual([
      ["ChatGPT", { kind: "line", bulletId: "b1" }],
      ["Tailwind CSS", { kind: "entry", entryId: "b" }],
    ]);
    expect(items[0]!.message).toBe(
      "ChatGPT came out in Nov 2022, after this job ended (2018 – 2020).",
    );
  });

  it("gives the benefit of the doubt when the end date is only a year", () => {
    // React came out in May 2013; a job ending "2013" may have run to December.
    const resume = resumeWith({
      experience: [
        job("a", {
          startDate: "2011",
          endDate: "2013",
          bullets: [{ id: "b1", text: "Rebuilt the dashboard in React." }],
        }),
      ],
    });
    expect(rules(resume)).toEqual([]);
  });
});

describe("words copied from the job post", () => {
  const post =
    "You will design, build and maintain scalable data pipelines that power our analytics platform. You have 5+ years of Python.";

  it("finds runs of 8 or more words, as written", () => {
    const phrases = jobPhrases(post);
    expect(
      copiedRuns("Designed, built and maintained pipelines in Python for 3 teams.", phrases),
    ).toEqual([]);
    expect(
      copiedRuns(
        "I will design, build and maintain scalable data pipelines that power reports.",
        phrases,
      ),
    ).toEqual(["will design, build and maintain scalable data pipelines that power"]);
  });

  it("checks tailored copies only, when the post is known", () => {
    const line = {
      id: "b1",
      text: "Design, build and maintain scalable data pipelines that power our analytics platform.",
    };
    const plain = resumeWith({ experience: [job("a", { bullets: [line] })] });
    expect(rules(plain, { jobText: post })).toEqual([]);
    const tailored: Resume = {
      ...plain,
      source: "tailored",
      tailor: {
        baseResumeId: "base",
        jobTitle: "Data Engineer",
        company: "Globex",
        keywords: [],
        createdAt: 0,
      },
    };
    expect(rules(tailored)).toEqual([]);
    const [item] = runSendCheck(tailored, { now: NOW, jobText: post });
    expect(item).toMatchObject({
      rule: "copied",
      target: { kind: "line", bulletId: "b1" },
      message: "12 words in a row match the job post. Say it in your own words.",
    });
  });
});

describe("another company's name", () => {
  const tailored = (summary: string, coverLetter?: string): Resume =>
    resumeWith({
      summary,
      source: "tailored",
      experience: [job("a", { company: "Northwind Payments" })],
      tailor: {
        baseResumeId: "base",
        jobTitle: "Backend Engineer",
        company: "Globex",
        keywords: [],
        createdAt: 0,
        coverLetter,
      },
    });

  it("spots a name only an employer takes, and other tailored copies' companies", () => {
    const items = runSendCheck(
      tailored(
        "Backend engineer excited to join Initech and grow its payment platform.",
        "Dear Hiring Manager,\n\nI'd love to bring my work at Northwind Payments to Umbrella's team.",
      ),
      { now: NOW, otherCompanies: ["Umbrella", "Globex"] },
    ).filter((item) => item.rule === "company");
    expect(items.map((item) => [item.quote, item.place])).toEqual([
      ["Initech", "Summary"],
      ["Umbrella", "Cover letter"],
    ]);
    expect(items[0]!.message).toBe("Mentions Initech, but this copy is for Globex.");
    expect(items[1]!.target).toEqual({ kind: "letter" });
  });

  it("allows the company it is for and places the person worked", () => {
    const resume = tailored(
      "Excited to join Globex Corporation after 4 years at Northwind Payments. Northwind Payments's team taught me a lot.",
    );
    expect(rules(resume)).toEqual([]);
  });
});

describe("blanks left in", () => {
  it("finds brackets, braces, XX stand-ins and TODOs, not citations or links", () => {
    expect(
      findPlaceholders("Grew revenue [X%] for {Company}; XX users; TODO add number; see [1]"),
    ).toEqual(["[X%]", "{Company}", "XX", "TODO"]);
    expect(findPlaceholders("Read the [docs](https://example.com)")).toEqual([]);
  });

  it("points at the line, the summary or the contact field", () => {
    const resume = resumeWith({
      summary: "Engineer with [number] years of experience.",
      basics: { ...resumeWith().basics, phone: "[phone]" },
      experience: [job("a", { bullets: [{ id: "b1", text: "Cut costs by XX%." }] })],
      extras: [
        {
          id: "x1",
          kind: "awards",
          title: "Awards [year]",
          items: [
            {
              id: "i1",
              title: "Hackathon winner",
              subtitle: "{Event}",
              date: "",
              detail: "",
              bullets: [],
            },
          ],
        },
      ],
    });
    const items = runSendCheck(resume, { now: NOW });
    expect(items.map((item) => [item.title, item.quote, item.target])).toEqual([
      ["Blank left in", "[phone]", { kind: "basics", field: "phone" }],
      ["Blank left in", "[number]", { kind: "summary" }],
      ["Blank left in", "XX", { kind: "line", bulletId: "b1" }],
      ["Blank left in", "[year]", { kind: "extra", sectionId: "x1" }],
      ["Blank left in", "{Event}", { kind: "entry", entryId: "i1" }],
    ]);
  });
});

describe("runSendCheck", () => {
  it("skips what the person hid", () => {
    const resume = resumeWith({
      summary: "Engineer with [number] years of experience.",
      hiddenSections: ["summary"],
      experience: [
        job("a", {
          bullets: [{ id: "b1", text: "Cut costs by [amount].", hidden: true }],
        }),
        job("b", { startDate: "2022", endDate: "2019", hidden: true }),
      ],
    });
    expect(rules(resume)).toEqual([]);
  });

  it("puts the most embarrassing first and gives each item a stable id", () => {
    const resume = resumeWith({
      experience: [
        job("a", {
          startDate: "2023",
          endDate: "2021",
          bullets: [{ id: "b1", text: "Grew signups [X%]." }],
        }),
      ],
    });
    const first = runSendCheck(resume, { now: NOW });
    expect(first.map((item) => item.rule)).toEqual(["placeholder", "dates"]);
    expect(runSendCheck(resume, { now: NOW }).map((item) => item.id)).toEqual(
      first.map((item) => item.id),
    );
    // Editing the text changes the id, so a dismissed item can come back.
    const edited = structuredClone(resume);
    edited.experience[0]!.bullets[0]!.text = "Grew signups [Y%].";
    expect(runSendCheck(edited, { now: NOW })[0]!.id).not.toBe(first[0]!.id);
  });
});
