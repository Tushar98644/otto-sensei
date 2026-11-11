import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { PullRecord } from "./api";
import { entryLink, plainBullets, pullLine, sourceText, type RepoItem } from "./facts";
import { markdownExcerpt } from "./markdown";
import { addGitHubProjects, isOnResume, MAX_PROJECTS } from "./to-projects";
import { GitHubDraftRequestSchema, GitHubLookupRequestSchema, type GitHubDraftEntry, type GitHubRepo } from "./types";
import { parseGitHubUsername } from "./username";

describe("parseGitHubUsername", () => {
  it.each([
    ["octocat", "octocat"],
    ["  @octocat ", "octocat"],
    ["github.com/octocat", "octocat"],
    ["https://www.github.com/Octo-Cat/", "Octo-Cat"],
    ["https://github.com/octocat?tab=repositories", "octocat"],
  ])("reads %j", (input, expected) => {
    expect(parseGitHubUsername(input)).toBe(expected);
  });

  it.each(["", "octo cat", "-octocat", "octocat-", "octo--cat", "a".repeat(40), "github.com/octocat/repo", "octocat/../x", "gitlab.com/octocat"])(
    "refuses %j",
    (input) => {
      expect(parseGitHubUsername(input)).toBeNull();
    },
  );

  it("keeps qualifiers and paths out of the request schemas", () => {
    expect(GitHubLookupRequestSchema.safeParse({ username: "octocat repo:secret" }).success).toBe(false);
    expect(GitHubLookupRequestSchema.safeParse({ username: "../orgs" }).success).toBe(false);
    expect(GitHubDraftRequestSchema.safeParse({ username: "octocat", repos: [], pulls: [] }).success).toBe(false);
    expect(GitHubDraftRequestSchema.safeParse({ username: "octocat", repos: ["a/b", "a/c", "a/d", "a/e", "a/f"] }).success).toBe(
      false,
    );
  });
});

describe("markdownExcerpt", () => {
  it("keeps what the project is and drops set-up, code, badges and links", () => {
    const text = markdownExcerpt(
      [
        "# Ledger Lint",
        "[![npm](https://img.shields.io/npm/v/x.svg)](https://npm.im/x) ![ci](https://x/ci.svg)",
        "Flags **rounding errors** in [financial reports](https://example.com). See https://example.com/docs.",
        "<!-- hidden note -->",
        "## Installation",
        "Run the installer.",
        "```bash",
        "npm install ledger-lint",
        "```",
        "### From source",
        "Clone it.",
        "## Features",
        "- Checks `snake_case` names",
        "| a | b |",
        "| --- | --- |",
        "## License",
        "MIT",
      ].join("\n"),
      1_000,
    );
    expect(text).toBe(
      ["Ledger Lint", "Flags rounding errors in financial reports. See", "Features", "Checks snake_case names"].join("\n"),
    );
  });

  it("stops near the limit on a whole word", () => {
    const text = markdownExcerpt("word ".repeat(500), 50);
    expect(text.length).toBeLessThanOrEqual(50);
    expect(text.endsWith("word")).toBe(true);
  });
});

const REPO: GitHubRepo = {
  id: 1,
  name: "ledger-lint",
  fullName: "octocat/ledger-lint",
  url: "https://github.com/octocat/ledger-lint",
  description: "Questions? write to me@example.com",
  homepage: "",
  language: "Go",
  topics: [],
  stars: 4,
  forks: 0,
  archived: false,
  pushedAt: "",
};

function pull(number: number, title: string): PullRecord {
  return {
    id: number,
    number,
    title,
    url: `https://github.com/vercel/next.js/pull/${number}`,
    repo: "vercel/next.js",
    mergedAt: "2026-09-01T00:00:00Z",
    body: "",
  };
}

describe("facts", () => {
  it("turns pull request titles into past-tense resume lines", () => {
    expect(pullLine(pull(12, "fix(cache): avoid double fetch"))).toBe("Avoided double fetch (#12)");
    expect(pullLine(pull(13, "[docs] Add a guide for streams."))).toBe("Added a guide for streams (#13)");
    expect(pullLine(pull(14, "Streaming support for edge"))).toBe("Streaming support for edge (#14)");
  });

  it("never prints an email or a small star count", () => {
    const item: RepoItem = { kind: "repo", key: "repo:octocat/ledger-lint", repo: REPO, languages: [], readme: "" };
    expect(plainBullets(item)).toEqual(["Built with Go"]);
    expect(sourceText(item)).not.toMatch(/Stars/);
  });

  it("links several pull requests to the person's merged list in that repo", () => {
    const item = { kind: "pulls" as const, key: "pulls:vercel/next.js", repo: "vercel/next.js", username: "octocat", pulls: [pull(1, "a"), pull(2, "b")] };
    expect(entryLink(item)).toBe("https://github.com/vercel/next.js/pulls?q=is%3Apr%20is%3Amerged%20author%3Aoctocat");
    expect(entryLink({ ...item, pulls: [pull(1, "a")] })).toBe("https://github.com/vercel/next.js/pull/1");
  });
});

const ENTRY: GitHubDraftEntry = {
  key: "repo:octocat/ledger-lint",
  kind: "repo",
  name: "ledger-lint",
  link: "https://github.com/octocat/ledger-lint",
  bullets: ["Flags rounding errors in financial reports", "Built with Go"],
};

function resumeWith(patch: Partial<Resume>): Resume {
  return { ...emptyResume(), ...patch };
}

describe("addGitHubProjects", () => {
  it("adds confirmed entries after the projects already there and shows the section", () => {
    const base = resumeWith({
      projects: [{ id: "p1", name: "Old", link: "", bullets: [] }],
      sectionOrder: ["experience", "education"],
      hiddenSections: ["projects", "skills"],
    });
    const { resume, added, skipped } = addGitHubProjects(base, [ENTRY]);
    expect(added).toBe(1);
    expect(skipped).toBe(0);
    expect(resume.projects.map((project) => project.name)).toEqual(["Old", "ledger-lint"]);
    expect(resume.projects[1]?.link).toBe("https://github.com/octocat/ledger-lint");
    expect(resume.projects[1]?.bullets.map((bullet) => bullet.text)).toEqual(ENTRY.bullets);
    expect(resume.sectionOrder).toEqual(["experience", "education", "projects"]);
    expect(resume.hiddenSections).toEqual(["skills"]);
    expect(base.projects).toHaveLength(1);
  });

  it("stops at the project cap", () => {
    const full = resumeWith({
      projects: Array.from({ length: MAX_PROJECTS }, (_, index) => ({ id: `p${index}`, name: `P${index}`, link: "", bullets: [] })),
    });
    const result = addGitHubProjects(full, [ENTRY]);
    expect(result).toMatchObject({ added: 0, skipped: 1 });
    expect(result.resume).toBe(full);
  });

  it("knows a project that is already on the resume, however the link is typed", () => {
    const resume = resumeWith({ projects: [{ id: "p1", name: "Ledger", link: "github.com/OctoCat/ledger-lint/", bullets: [] }] });
    expect(isOnResume(resume, ENTRY)).toBe(true);
    expect(isOnResume(resume, { ...ENTRY, link: "https://github.com/octocat/other", name: "other" })).toBe(false);
  });
});
