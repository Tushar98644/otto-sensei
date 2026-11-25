import { describe, expect, it } from "vitest";
import type { Writing } from "@/lib/writings/schema";
import { EN, FORMAT_EN } from "../../messages-testing";
import { hubLetters, hubTally, withWriting } from "./hub-letters";

function writing(id: string, patch: Partial<Writing>): Writing {
  return {
    id,
    kind: "letter",
    resumeId: "base",
    resumeTitle: "",
    company: "Acme",
    role: "Engineer",
    jobUrl: "",
    question: "",
    text: "Dear Acme,",
    warnings: [],
    demo: false,
    applicationId: "app-1",
    createdAt: 1,
    updatedAt: 1,
    ...patch,
  };
}

describe("an application's letters and messages", () => {
  it("lists outreach messages with their subject, newest first, and counts each kind", () => {
    const letters = hubLetters(
      [
        writing("w1", { createdAt: 1 }),
        writing("w2", {
          kind: "outreach",
          text: "Hi [first name],",
          outreach: { subject: "Engineer at Acme", note: "Hi", jobId: null },
          createdAt: 3,
        }),
        writing("w3", { kind: "answer", question: "Why us?", text: "Because.", createdAt: 2 }),
      ],
      null,
      "",
    );
    expect(letters.map((letter) => [letter.key, letter.kind, letter.subject])).toEqual([
      ["w2", "outreach", "Engineer at Acme"],
      ["w3", "answer", ""],
      ["w1", "letter", ""],
    ]);
    expect(hubTally(letters, EN.applications, FORMAT_EN)).toBe("1 letter · 1 answer · 1 message");
    expect(
      hubTally(
        letters.filter((letter) => letter.kind === "outreach"),
        EN.applications,
        FORMAT_EN,
      ),
    ).toBe("1 message");
    expect(hubTally([], EN.applications, FORMAT_EN)).toBe("");
  });

  it("shows a new message at once and an edited one in place, so Copy email copies the edit", () => {
    const first = writing("w1", {});
    const message = writing("w2", { kind: "outreach", text: "Hi [first name]," });
    const added = withWriting([first], message);
    expect(added.map((item) => item.id)).toEqual(["w2", "w1"]);
    const edited = withWriting(added, { ...message, text: "Hi Jane," });
    expect(edited.map((item) => [item.id, item.text])).toEqual([
      ["w2", "Hi Jane,"],
      ["w1", "Dear Acme,"],
    ]);
  });
});
