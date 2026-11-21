import { describe, expect, it, vi } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import {
  groupCommands,
  moveActive,
  paletteCommands,
  parseJobLink,
  tailorHref,
  type PaletteHandlers,
} from "./command-palette-items";

const NOW = Date.UTC(2026, 10, 21, 12);
const HOUR = 60 * 60 * 1000;

function resume(title: string, hoursAgo: number): Resume {
  return { ...emptyResume(NOW - hoursAgo * HOUR), title };
}

function handlers() {
  return {
    go: vi.fn(),
    openResume: vi.fn(),
    tailor: vi.fn(),
    lockedTailor: vi.fn(),
    upload: vi.fn(),
    scratch: vi.fn(),
    sample: vi.fn(),
  } satisfies PaletteHandlers;
}

const older = resume("Product designer", 30);
const newer = resume("Frontend engineer", 2);

function commands(
  query: string,
  overrides: Partial<Parameters<typeof paletteCommands>[0]> = {},
  on = handlers(),
) {
  return paletteCommands(
    {
      query,
      resumes: [older, newer],
      activeId: null,
      proTools: true,
      tailorLocked: false,
      now: NOW,
      ...overrides,
    },
    on,
  );
}

const labels = (list: { label: string }[]) => list.map((command) => command.label);

describe("parseJobLink", () => {
  it("reads web links, with or without the scheme", () => {
    expect(parseJobLink("https://boards.greenhouse.io/acme/jobs/123")).toBe(
      "https://boards.greenhouse.io/acme/jobs/123",
    );
    expect(parseJobLink("  jobs.lever.co/acme/42?ref=x  ")).toBe("https://jobs.lever.co/acme/42?ref=x");
    expect(parseJobLink("http://example.com/careers/7")).toBe("http://example.com/careers/7");
  });

  it("leaves words, bare domains and odd links as a search", () => {
    expect(parseJobLink("node.js")).toBeNull();
    expect(parseJobLink("acme.com")).toBeNull();
    expect(parseJobLink("product designer")).toBeNull();
    expect(parseJobLink("javascript:alert(1)")).toBeNull();
    expect(parseJobLink("ftp://example.com/jobs/1")).toBeNull();
    expect(parseJobLink("https://user:pass@example.com/jobs/1")).toBeNull();
    expect(parseJobLink("https://localhost/jobs/1")).toBeNull();
    expect(parseJobLink(`https://example.com/${"a".repeat(2100)}`)).toBeNull();
    expect(parseJobLink("")).toBeNull();
  });
});

describe("tailorHref", () => {
  it("hands the job link to the studio, encoded", () => {
    expect(tailorHref("https://jobs.lever.co/acme/42?ref=x&y=1")).toBe(
      "/studio?job=https%3A%2F%2Fjobs.lever.co%2Facme%2F42%3Fref%3Dx%26y%3D1",
    );
    expect(tailorHref(null)).toBe("/studio");
  });
});

describe("paletteCommands", () => {
  it("leads with the next steps and recent resumes before anything is typed", () => {
    const list = commands("");
    expect(labels(list).slice(0, 6)).toEqual([
      "Tailor to a job",
      "Upload a resume",
      "Start from scratch",
      "Try a sample",
      "Frontend engineer",
      "Product designer",
    ]);
    expect(labels(list.filter((command) => command.group === "Pages"))).toEqual([
      "Home",
      "Resumes",
      "Jobs",
      "Applications",
      "Letters",
      "Interview prep",
      "Portfolio",
      "Formats",
      "Recently deleted",
      "Account",
    ]);
    expect(list.find((command) => command.label === "Frontend engineer")?.detail).toBe(
      "Edited 2 hours ago",
    );
  });

  it("finds pages by their other names and resumes by title", () => {
    expect(labels(commands("tracker"))).toEqual(["Applications"]);
    expect(labels(commands("cover letter"))).toEqual(["Letters"]);
    expect(labels(commands("trash"))).toEqual(["Recently deleted"]);
    expect(labels(commands("frontend"))).toEqual(["Frontend engineer"]);
    expect(labels(commands("new resume"))).toEqual([
      "Upload a resume",
      "Start from scratch",
      "Try a sample",
    ]);
    expect(commands("zzzz")).toEqual([]);
  });

  it("runs the handler each command stands for", () => {
    const on = handlers();
    const list = commands("", {}, on);
    list.find((command) => command.label === "Letters")?.run();
    expect(on.go).toHaveBeenCalledWith("/dashboard/letters");
    list.find((command) => command.label === "Product designer")?.run();
    expect(on.openResume).toHaveBeenCalledWith(older.id);
    list.find((command) => command.label === "Upload a resume")?.run();
    expect(on.upload).toHaveBeenCalledOnce();
  });

  it("turns a pasted job link into one tailor command on the open resume", () => {
    const on = handlers();
    const list = commands("boards.greenhouse.io/acme/jobs/9", { activeId: older.id }, on);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      label: "Tailor to this job",
      detail: "boards.greenhouse.io · with “Product designer”",
      pro: false,
    });
    list[0]?.run();
    expect(on.tailor).toHaveBeenCalledWith(older.id, "https://boards.greenhouse.io/acme/jobs/9");
  });

  it("tailors the latest resume when none is open", () => {
    const on = handlers();
    commands("", {}, on)[0]?.run();
    expect(on.tailor).toHaveBeenCalledWith(newer.id, null);
  });

  it("asks for a resume first when a link comes before any resume", () => {
    const on = handlers();
    const list = commands("https://www.acme.com/jobs/1", { resumes: [] }, on);
    expect(list).toMatchObject([{ label: "Tailor to this job", detail: "Add your resume first" }]);
    list[0]?.run();
    expect(on.upload).toHaveBeenCalledOnce();
    expect(labels(commands("", { resumes: [] }))).not.toContain("Tailor to a job");
  });

  it("marks Pro on Free and offers the trial instead of starting a locked tailor", () => {
    const on = handlers();
    const list = commands("", { proTools: false, tailorLocked: true }, on);
    const marked = list.filter((command) => command.pro).map((command) => command.label);
    expect(marked).toEqual(["Tailor to a job", "Letters", "Interview prep", "Portfolio"]);
    list[0]?.run();
    expect(on.lockedTailor).toHaveBeenCalledOnce();
    expect(on.tailor).not.toHaveBeenCalled();

    const link = commands("https://jobs.lever.co/acme/1", { proTools: false, tailorLocked: true }, on);
    expect(link).toMatchObject([{ label: "Tailor to this job", pro: true, detail: "jobs.lever.co" }]);
  });

  it("marks nothing while the plan is still loading", () => {
    expect(commands("", { proTools: null }).some((command) => command.pro)).toBe(false);
  });
});

describe("groupCommands", () => {
  it("keeps the order and starts a group where the kind changes", () => {
    const list = commands("e");
    const groups = groupCommands(list);
    expect(groups.map(({ group }) => group)).toEqual(["Pages", "Resumes", "Actions"]);
    expect(groups.flatMap((group) => group.commands)).toEqual(list);
  });
});

describe("moveActive", () => {
  it("wraps with the arrows and stops at the ends with page keys", () => {
    expect(moveActive(0, 4, "ArrowDown")).toBe(1);
    expect(moveActive(3, 4, "ArrowDown")).toBe(0);
    expect(moveActive(0, 4, "ArrowUp")).toBe(3);
    expect(moveActive(1, 12, "PageDown")).toBe(6);
    expect(moveActive(10, 12, "PageDown")).toBe(11);
    expect(moveActive(3, 12, "PageUp")).toBe(0);
    expect(moveActive(0, 4, "Home")).toBeNull();
    expect(moveActive(0, 0, "ArrowDown")).toBeNull();
  });
});
