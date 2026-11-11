import { describe, expect, it } from "vitest";
import { createSampleResume } from "@/lib/resume/sample";
import { ResumeSchema } from "@/lib/resume/validation";
import { fromIsoDate, toIsoDate } from "./dates";
import { jsonResumeFileName, toJsonResume } from "./export";
import { JsonResumeError, parseJsonResume } from "./import";

const NOW = Date.UTC(2026, 10, 7);

const RESUME_JSON = {
  basics: {
    name: "Kenji Tanaka",
    label: "Backend Engineer",
    email: "kenji@example.com",
    phone: "+81 90 1234 5678",
    url: "https://kenji.dev",
    summary: "Builds payment systems.",
    location: { address: "1-2-3 Shibuya", city: "Tokyo", countryCode: "JP" },
    profiles: [{ network: "GitHub", username: "kenji", url: "https://github.com/kenji" }],
  },
  work: [
    {
      name: "Contoso",
      position: "Senior Engineer",
      startDate: "2021-04-01",
      highlights: ["Cut API latency by 40%", "Mentored 3 engineers"],
    },
    { name: "Fabrikam", position: "Engineer", startDate: "2018-06", endDate: "2021-03", summary: "Payments team." },
  ],
  volunteer: [{ organization: "Code Club", position: "Mentor", startDate: "2020", highlights: ["Taught kids Python"] }],
  education: [{ institution: "Kyoto University", area: "Computer Science", studyType: "BSc", endDate: "2018", score: "3.8", courses: ["Algorithms"] }],
  awards: [{ title: "Hackathon winner", date: "2019-11-02", awarder: "Fabrikam" }],
  certificates: [{ name: "AWS Solutions Architect", issuer: "AWS", date: "2022-01" }],
  skills: [{ name: "Backend", keywords: ["Go", "PostgreSQL"] }, { name: "Docker" }],
  languages: [{ language: "Japanese", fluency: "Native" }],
  projects: [{ name: "pgq", url: "https://github.com/kenji/pgq", description: "A Postgres job queue" }],
  // Wrong types in the wild must not sink the whole file.
  interests: "not a list",
  publications: [42, { name: "Queues at scale", publisher: "Blog", releaseDate: "2023" }],
};

describe("dates", () => {
  it("converts ISO dates to the editor's words and back", () => {
    expect(fromIsoDate("2021-04-01")).toBe("Apr 2021");
    expect(fromIsoDate("2018")).toBe("2018");
    expect(fromIsoDate("Summer 2019")).toBe("Summer 2019");
    expect(toIsoDate("Apr 2021")).toBe("2021-04");
    expect(toIsoDate("September 2019")).toBe("2019-09");
    expect(toIsoDate("03/2020")).toBe("2020-03");
    expect(toIsoDate("Present")).toBeNull();
    expect(toIsoDate("Summer 2019")).toBe("Summer 2019");
  });
});

describe("parseJsonResume", () => {
  it("maps a v1 resume.json into a valid resume", () => {
    const resume = parseJsonResume(JSON.stringify(RESUME_JSON), NOW);
    expect(ResumeSchema.safeParse(resume).success).toBe(true);
    expect(resume.basics).toMatchObject({ name: "Kenji Tanaka", headline: "Backend Engineer", location: "Tokyo, JP" });
    expect(resume.basics.links.map((l) => l.label)).toEqual(["Website", "GitHub"]);
    expect(resume.experience[0]).toMatchObject({ company: "Contoso", startDate: "Apr 2021", endDate: "Present" });
    expect(resume.experience[0]?.bullets.map((b) => b.text)).toEqual(["Cut API latency by 40%", "Mentored 3 engineers"]);
    expect(resume.experience[1]).toMatchObject({ startDate: "Jun 2018", endDate: "Mar 2021", bullets: [{ text: "Payments team." }] });
    expect(resume.education[0]?.bullets.map((b) => b.text)).toEqual(["Grade: 3.8", "Courses: Algorithms"]);
    expect(resume.skills.map((g) => [g.label, g.items])).toEqual([
      ["", ["Docker"]],
      ["Backend", ["Go", "PostgreSQL"]],
    ]);
    expect(resume.certifications[0]).toMatchObject({ name: "AWS Solutions Architect", date: "Jan 2022" });
    const kinds = Object.fromEntries((resume.extras ?? []).map((s) => [s.kind, s.items.map((i) => i.title)]));
    expect(kinds).toEqual({
      languages: ["Japanese"],
      awards: ["Hackathon winner"],
      volunteering: ["Mentor"],
      publications: ["Queues at scale"],
    });
  });

  it("rejects text that isn't JSON or isn't a resume", () => {
    expect(() => parseJsonResume("{oops", NOW)).toThrow(JsonResumeError);
    expect(() => parseJsonResume("[]", NOW)).toThrow(JsonResumeError);
    expect(() => parseJsonResume(JSON.stringify({ meta: {} }), NOW)).toThrow(JsonResumeError);
  });
});

describe("toJsonResume", () => {
  it("writes ISO dates, leaves out open ends and survives a round trip", () => {
    const resume = parseJsonResume(JSON.stringify(RESUME_JSON), NOW);
    const json = toJsonResume(resume);
    const work = json.work as { startDate?: string; endDate?: string }[];
    expect(work[0]).toMatchObject({ startDate: "2021-04" });
    expect(work[0]).not.toHaveProperty("endDate");
    expect(json.meta).toMatchObject({ version: "v1.0.0" });

    const again = parseJsonResume(JSON.stringify(json), NOW);
    const strip = (r: typeof resume) => JSON.stringify({ ...r, id: "", title: "" }).replace(/"id":"[^"]+"/g, '"id":""');
    expect(strip(again)).toBe(strip(resume));
  });

  it("exports the sample resume without hidden lines", () => {
    const sample = createSampleResume(NOW);
    const first = sample.experience[0]!;
    first.bullets[0] = { ...first.bullets[0]!, hidden: true };
    const json = toJsonResume(sample);
    const highlights = (json.work as { highlights?: string[] }[])[0]?.highlights ?? [];
    expect(highlights).not.toContain(first.bullets[0]!.text);
    expect(jsonResumeFileName(sample)).toMatch(/resume\.json$/);
  });
});
