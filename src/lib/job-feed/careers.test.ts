import { describe, expect, it } from "vitest";
import { careersUrl } from "./careers";

describe("careersUrl", () => {
  it("links each board to its own careers page", () => {
    expect(careersUrl("greenhouse", "stripe")).toBe("https://job-boards.greenhouse.io/stripe");
    expect(careersUrl("lever", "palantir")).toBe("https://jobs.lever.co/palantir");
    expect(careersUrl("ashby", "notion")).toBe("https://jobs.ashbyhq.com/notion");
    expect(careersUrl("workday", "leidos.wd5/External")).toBe(
      "https://leidos.wd5.myworkdayjobs.com/External",
    );
  });

  it("has none for feeds or a token it can't trust", () => {
    expect(careersUrl("himalayas", "_feed")).toBeNull();
    expect(careersUrl("jobvite", "qAb9")).toBeNull();
    expect(careersUrl("greenhouse", "a/b")).toBeNull();
    expect(careersUrl("workday", "not a token")).toBeNull();
  });
});
