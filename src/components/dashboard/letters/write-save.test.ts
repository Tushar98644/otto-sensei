import { describe, expect, it } from "vitest";
import { WRITING_LIMITS } from "@/lib/writings/schema";
import { unsavedEntry, writeBody, type WriteJob } from "./write-save";

const JOB: WriteJob = {
  title: " Designer ",
  company: " Initech ",
  url: "https://jobs.example.com/1",
  jobId: "6c1f8f9e-0d1b-4f43-9a55-2b1c0e5d7a10",
  applicationId: "1d2e3f40-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
};
const RESUME = { id: "r1", title: "Amara Okafor" };

describe("what a written piece keeps", () => {
  it("keeps a letter with its job and application, without the job id outreach uses", () => {
    const body = writeBody({ kind: "letter", text: "Dear team", warnings: [], demo: false }, JOB, RESUME);
    expect(body).toMatchObject({
      kind: "letter",
      resumeId: "r1",
      resumeTitle: "Amara Okafor",
      company: "Initech",
      role: "Designer",
      jobUrl: "https://jobs.example.com/1",
      jobId: null,
      question: "",
      text: "Dear team",
      applicationId: JOB.applicationId,
    });
  });

  it("keeps an answer with its question", () => {
    const body = writeBody(
      { kind: "answer", question: "Why us?", text: "Because", warnings: ["Check it"], demo: true },
      JOB,
      RESUME,
    );
    expect(body).toMatchObject({ kind: "answer", question: "Why us?", warnings: ["Check it"], demo: true });
  });

  it("keeps an outreach message's email, subject and note, fitted to what the server keeps", () => {
    const note = "n".repeat(WRITING_LIMITS.noteChars + 50);
    const body = writeBody(
      {
        kind: "outreach",
        draft: { subject: "Hello", email: "Hi there", note, warnings: [], demo: false },
      },
      JOB,
      RESUME,
    );
    expect(body).toMatchObject({ kind: "outreach", text: "Hi there", subject: "Hello", jobId: JOB.jobId });
    expect(body.note).toHaveLength(WRITING_LIMITS.noteChars);
  });

  it("drops a link that isn't one", () => {
    const body = writeBody(
      { kind: "letter", text: "Dear team", warnings: [], demo: false },
      { ...JOB, url: "not a link" },
      RESUME,
    );
    expect(body.jobUrl).toBe("");
  });

  it("lists a piece the server didn't keep, with an outreach message's parts", () => {
    const letter = unsavedEntry(
      writeBody({ kind: "letter", text: "Dear team", warnings: [], demo: false }, JOB, RESUME),
      42,
    );
    expect(letter).toMatchObject({ kind: "letter", writingId: null, copyId: null, createdAt: 42 });
    expect(letter.key).toMatch(/^new:/);
    expect(letter).not.toHaveProperty("outreach");
    const message = unsavedEntry(
      writeBody(
        { kind: "outreach", draft: { subject: "Hello", email: "Hi", note: "Note", warnings: [], demo: false } },
        JOB,
        RESUME,
      ),
      42,
    );
    expect(message.outreach).toEqual({ subject: "Hello", note: "Note", jobId: JOB.jobId });
    expect(message.text).toBe("Hi");
  });
});
