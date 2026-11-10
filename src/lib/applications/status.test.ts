import { describe, expect, it } from "vitest";
import { nextStep, readHistory, readStage, readStatus } from "./status";

describe("reading stored statuses", () => {
  it("reads the old screening step as interview, and nothing unknown", () => {
    expect(readStatus("screening")).toBe("interview");
    expect(readStatus("no_reply")).toBe("no_reply");
    expect(readStatus("ghosted")).toBeNull();
    expect(readStage("screening")).toBe("interview");
    expect(readStage("offer")).toBe("offer");
    // An ending is never a furthest step.
    expect(readStage("rejected")).toBe("applied");
  });

  it("keeps old timeline entries, renamed, in order", () => {
    expect(
      readHistory([
        { status: "screening", at: 20 },
        { status: "applied", at: 10 },
        { status: "ghosted", at: 30 },
        { status: "interview", at: 1.5 },
        null,
      ]),
    ).toEqual([
      { status: "applied", at: 10 },
      { status: "interview", at: 20 },
    ]);
  });

  it("goes from applied straight to interviewing", () => {
    expect(nextStep("applied")).toEqual({ status: "interview", label: "Got an interview" });
    expect(nextStep("interview")?.status).toBe("offer");
    expect(nextStep("rejected")).toBeNull();
  });
});
