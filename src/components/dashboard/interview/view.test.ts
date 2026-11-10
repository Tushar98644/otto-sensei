import { describe, expect, it } from "vitest";
import type { Application } from "@/lib/applications/schema";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { findByLink, interviewHref, prepChoices, prepPickerChoices, waitingForPrep } from "./view";

function application(id: string, patch: Partial<Application> = {}): Application {
  return {
    id,
    resumeId: null,
    resumeTitle: "",
    company: `Company ${id}`,
    role: "",
    jobUrl: "",
    appliedAt: 1_000,
    status: "applied",
    stageReached: "applied",
    jobId: null,
    hasPrep: false,
    interviewAt: null,
    statusChangedAt: 1_000,
    notes: "",
    followUpAt: null,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...patch,
  };
}

describe("interview prep lists", () => {
  it("links each pack to its own page under Interview prep", () => {
    expect(interviewHref("0b9f")).toBe("/dashboard/interview/0b9f");
  });

  it("lists interviews without a pack, the latest to reach the stage first", () => {
    const list = [
      application("a", { status: "interview", statusChangedAt: 2_000 }),
      application("b", { status: "interview", statusChangedAt: 5_000 }),
      application("c", { status: "interview", statusChangedAt: 9_000 }),
      application("d", { status: "applied", statusChangedAt: 9_500 }),
    ];
    expect(waitingForPrep(list, [{ applicationId: "c" }]).map((item) => item.id)).toEqual(["b", "a"]);
    expect(waitingForPrep([], [])).toEqual([]);
  });

  it("offers interviews first in the picker, then the newest applications", () => {
    const list = [
      application("old", { appliedAt: 1_000 }),
      application("new", { appliedAt: 8_000 }),
      application("talk", { status: "interview", appliedAt: 500 }),
    ];
    expect(prepChoices(list).map((item) => item.id)).toEqual(["talk", "new", "old"]);
    expect(list.map((item) => item.id)).toEqual(["old", "new", "talk"]);
  });

  it("offers tailored copies not sent yet after the applications", () => {
    const copy = (id: string, company: string, createdAt: number): Resume => ({
      ...emptyResume(),
      id,
      title: `Designer at ${company || "?"}`,
      source: "tailored",
      tailor: { baseResumeId: "base", jobTitle: "Designer", company, keywords: [], createdAt },
    });
    const choices = prepPickerChoices(
      [application("talk", { status: "interview", company: "Initech" }), application("sent", { resumeId: "c-sent" })],
      [
        { ...emptyResume(), id: "base" },
        copy("c-old", "Globex", 1),
        copy("c-new", "Umbrella", 9),
        copy("c-sent", "Acme", 5),
        copy("c-nameless", "", 7),
      ],
    );
    expect(choices.map((choice) => choice.value)).toEqual([
      "application:talk",
      "application:sent",
      "copy:c-new",
      "copy:c-old",
    ]);
    expect(choices[0]?.label).toBe("Initech (Interviewing)");
    expect(choices[2]?.label).toBe("Designer at Umbrella (tailored copy, not sent yet)");
  });

  it("finds the application already logged for a pasted link", () => {
    const list = [
      application("a", { jobUrl: "https://jobs.example.com/7" }),
      application("b", { jobUrl: "" }),
    ];
    expect(findByLink(list, "jobs.example.com/7")?.id).toBe("a");
    expect(findByLink(list, " https://jobs.example.com/7 ")?.id).toBe("a");
    expect(findByLink(list, "https://jobs.example.com/8")).toBeNull();
    expect(findByLink(list, "")).toBeNull();
    expect(findByLink(list, "not a link")).toBeNull();
  });
});
