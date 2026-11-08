import { describe, expect, it } from "vitest";
import type { GitHubPull, GitHubRepo } from "@/lib/github/types";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { contactOf, GITHUB_OTTO, matchesQuery, pullMeta, repoMeta, shortLink, usernameFromResume } from "./format";

function resumeWith(basics: Partial<Resume["basics"]>): Resume {
  const resume = emptyResume();
  return { ...resume, basics: { ...resume.basics, ...basics } };
}

const REPO: GitHubRepo = {
  id: 1,
  name: "ledger-lint",
  fullName: "octocat/ledger-lint",
  url: "https://github.com/octocat/ledger-lint",
  description: "",
  homepage: "",
  language: "TypeScript",
  topics: [],
  stars: 1200,
  forks: 0,
  archived: true,
  pushedAt: "",
};

describe("GitHub dialog helpers", () => {
  it("finds the username in the resume's links", () => {
    const resume = resumeWith({
      links: [
        { id: "a", label: "LinkedIn", url: "linkedin.com/in/jane" },
        { id: "b", label: "GitHub", url: "https://github.com/jane-dev" },
      ],
    });
    expect(usernameFromResume(resume)).toBe("jane-dev");
    expect(usernameFromResume(resumeWith({ links: [] }))).toBe("");
  });

  it("sends only the resume's own contact details, trimmed", () => {
    const contact = contactOf(
      resumeWith({ name: " Jane Doe ", email: "jane@example.com", phone: "", links: [{ id: "a", label: "", url: " janedoe.dev " }] }),
    );
    expect(contact).toEqual({ name: "Jane Doe", email: "jane@example.com", phone: "", links: ["janedoe.dev"] });
  });

  it("writes short meta lines", () => {
    expect(repoMeta(REPO)).toBe("TypeScript · 1,200 stars · Archived");
    expect(repoMeta({ ...REPO, stars: 1, archived: false, language: "" })).toBe("1 star");
    const pull: GitHubPull = { id: 1, number: 101, title: "x", url: "", repo: "vercel/next.js", mergedAt: "2026-09-15T12:00:00Z" };
    expect(pullMeta(pull)).toBe("vercel/next.js #101 · Merged Sep 2026");
    expect(shortLink("https://www.github.com/a/b")).toBe("github.com/a/b");
  });

  it("matches every word in any order, ignoring case and accents", () => {
    expect(matchesQuery(["Résumé parser", "TypeScript"], "typescript resume")).toBe(true);
    expect(matchesQuery(["ledger-lint"], "lint go")).toBe(false);
    expect(matchesQuery(["anything"], "  ")).toBe(true);
  });

  it("keeps Otto's lines to 18 words", () => {
    const lines = [GITHUB_OTTO.pick, GITHUB_OTTO.nothing("a-really-long-username"), GITHUB_OTTO.reviewAI, GITHUB_OTTO.reviewPlain];
    for (const line of lines) expect(line.split(/\s+/).length).toBeLessThanOrEqual(18);
  });
});
