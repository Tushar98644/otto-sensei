import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { matchCheck, type MatchRow } from "./check";
import { BACKEND_POST } from "./test-fixtures";

function backendResume(): Resume {
  return {
    ...emptyResume(0),
    basics: {
      name: "Amara Okafor",
      headline: "Backend engineer",
      email: "",
      phone: "",
      location: "",
      links: [],
    },
    summary: "Backend engineer with six years building payment systems.",
    experience: [
      {
        id: "job-1",
        company: "Ledgerly",
        title: "Senior Software Engineer",
        location: "Berlin",
        startDate: "2021",
        endDate: "Present",
        bullets: [
          { id: "b1", text: "Rebuilt the settlement service in Go, cutting p99 latency by 40%" },
          { id: "b2", text: "Moved 30 services onto Kubernetes with Helm" },
          { id: "b3", text: "Ran gRPC load tests", hidden: true },
        ],
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Ledger replay tool",
        link: "",
        tech: "Rust, SQLite",
        bullets: [],
      },
    ],
    skills: [{ id: "s1", label: "Tools", items: ["Docker", "Redis", "Terraform"] }],
    extras: [
      {
        id: "x1",
        kind: "languages",
        title: "Languages",
        items: [
          { id: "l1", title: "English", subtitle: "Fluent", date: "", detail: "", bullets: [] },
          { id: "l2", title: "German", subtitle: "B1", date: "", detail: "", bullets: [] },
        ],
      },
    ],
  };
}

function row(rows: readonly MatchRow[], term: string): MatchRow | undefined {
  return rows.find((item) => item.term === term);
}

describe("matchCheck", () => {
  const check = matchCheck(backendResume(), BACKEND_POST);

  it("counts what the resume names, never a percentage", () => {
    expect(check).toMatchObject({
      total: 12,
      found: 8,
      shown: 4,
      listed: 4,
      must: { found: 6, total: 7 },
      nice: { found: 2, total: 4 },
      sorted: true,
      asks: ["5+ years of experience building backend systems"],
    });
  });

  it("says which line shows each skill the post names", () => {
    expect(row(check.rows, "Go")).toEqual({
      id: "m1",
      term: "Go",
      importance: "must",
      status: "shown",
      where: {
        place: "Senior Software Engineer at Ledgerly, line 1",
        text: "Rebuilt the settlement service in Go, cutting p99 latency by 40%",
      },
    });
    expect(row(check.rows, "Kubernetes")?.where?.place).toBe(
      "Senior Software Engineer at Ledgerly, line 2",
    );
  });

  it("marks a skill that is only in the skills list as listed, not shown", () => {
    expect(row(check.rows, "Redis")).toMatchObject({
      status: "listed",
      where: { place: "Skills: Tools", text: "Docker, Redis, Terraform" },
    });
  });

  it("looks in project tools and the languages section too", () => {
    expect(row(check.rows, "Rust")).toMatchObject({
      status: "listed",
      where: { place: "Ledger replay tool, tools", text: "Rust, SQLite" },
    });
    expect(row(check.rows, "English")).toMatchObject({
      status: "shown",
      where: { place: "Languages", text: "English, Fluent" },
    });
  });

  it("counts a listed skill as shown when the languages section or another section's line uses it", () => {
    const resume: Resume = {
      ...backendResume(),
      skills: [{ id: "s1", label: "", items: ["Python", "Spanish", "Event planning"] }],
      extras: [
        {
          id: "x1",
          kind: "languages",
          title: "Languages",
          items: [
            { id: "l1", title: "Spanish", subtitle: "Native", date: "", detail: "", bullets: [] },
          ],
        },
        {
          id: "x2",
          kind: "volunteering",
          title: "Volunteering",
          items: [
            {
              id: "v1",
              title: "City Marathon",
              subtitle: "",
              date: "",
              detail: "",
              bullets: [{ id: "vb1", text: "Ran event planning for a 2,000-person race" }],
            },
          ],
        },
      ],
    };
    const rows = matchCheck(
      resume,
      "Requirements\n- Strong Python\n- Fluent Spanish\n- Event planning",
    ).rows;
    expect(row(rows, "Spanish")).toMatchObject({
      status: "shown",
      where: { place: "Languages", text: "Spanish, Native" },
    });
    expect(row(rows, "Event planning")).toMatchObject({
      status: "shown",
      where: { place: "Volunteering, City Marathon, line 1" },
    });
    expect(row(rows, "Python")?.status).toBe("listed");
  });

  it("leaves out hidden lines, as the printed resume does", () => {
    expect(row(check.rows, "gRPC")).toMatchObject({ status: "missing", where: null });
  });

  it("finds nothing to compare when the post names nothing it knows", () => {
    const empty = matchCheck(backendResume(), "We want a kind and curious person.");
    expect(empty).toMatchObject({ total: 0, found: 0, rows: [], sorted: false });
  });
});
