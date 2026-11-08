import { describe, expect, it } from "vitest";
import { TEXT_LIMITS } from "@/config/plans";
import { JobReadError } from "./errors";
import { buildPosting, capText, humanizeSlug, MIN_TEXT_CHARS, toTime } from "./posting";

const NOW = Date.UTC(2026, 10, 7);
const TEXT = "Build and run payment services. ".repeat(20);

describe("buildPosting", () => {
  it("cleans fields and keeps dates", () => {
    const posting = buildPosting(
      {
        url: new URL("https://example.com/jobs/1"),
        source: "page",
        title: "  Senior\n  Engineer ",
        company: null,
        text: `  ${TEXT}  `,
        firstPostedAt: Date.UTC(2026, 6, 22),
      },
      NOW,
    );
    expect(posting).toEqual({
      url: "https://example.com/jobs/1",
      source: "page",
      title: "Senior Engineer",
      company: "",
      location: "",
      text: TEXT.trim(),
      firstPostedAt: Date.UTC(2026, 6, 22),
      updatedAt: null,
      closesAt: null,
    });
  });

  it("treats thin text as couldn't read", () => {
    const thin = "x ".repeat(MIN_TEXT_CHARS / 2 - 1);
    expect(() => buildPosting({ url: "https://example.com", source: "page", text: thin })).toThrow(
      JobReadError,
    );
  });

  it("caps long titles and drops posting dates in the future", () => {
    const posting = buildPosting(
      {
        url: "https://x.com",
        source: "page",
        title: "Word ".repeat(80),
        text: TEXT,
        firstPostedAt: NOW + 5 * 86_400_000,
      },
      NOW,
    );
    expect(posting.title.length).toBeLessThanOrEqual(200);
    expect(posting.title.endsWith("…")).toBe(true);
    expect(posting.firstPostedAt).toBeNull();
  });
});

describe("capText", () => {
  it("cuts at the post limit, on a line break near the end", () => {
    const line = `${"a".repeat(99)}\n`;
    const capped = capText(line.repeat(300));
    expect(capped.length).toBeLessThanOrEqual(TEXT_LIMITS.jobPostChars);
    expect(capped.endsWith("a")).toBe(true);
    expect(capText("short")).toBe("short");
  });
});

describe("toTime and humanizeSlug", () => {
  it("parses dates and slugs", () => {
    expect(toTime("2026-07-22T13:38:40-04:00")).toBe(Date.UTC(2026, 6, 22, 17, 38, 40));
    expect(toTime(1792767640768)).toBe(1792767640768);
    expect(toTime("soon")).toBeNull();
    expect(toTime("1970-01-02")).toBeNull();
    expect(humanizeSlug("acme-labs_inc")).toBe("Acme Labs Inc");
  });
});
