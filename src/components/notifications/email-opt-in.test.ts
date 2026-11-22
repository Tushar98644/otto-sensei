import { describe, expect, it } from "vitest";
import { emptyResume } from "@/lib/resume/schema";
import { hasTailoredCopy, jobsCardShows, viewsCardShows } from "./email-opt-in";
import type { EmailChoicesData } from "./use-email-choices";

const ASKING: EmailChoicesData = {
  emailAvailable: true,
  jobEmails: false,
  tipEmails: true,
  viewEmails: false,
  jobPromptClosed: false,
  jobPromptSnoozed: false,
  viewPromptClosed: false,
  viewPromptSnoozed: false,
};

describe("when the one-tap cards ask", () => {
  it("asks about the weekly jobs email only while it's off and unanswered", () => {
    expect(jobsCardShows(ASKING)).toBe(true);
    expect(jobsCardShows(undefined)).toBe(false);
    expect(jobsCardShows({ ...ASKING, emailAvailable: false })).toBe(false);
    expect(jobsCardShows({ ...ASKING, jobEmails: true })).toBe(false);
    expect(jobsCardShows({ ...ASKING, jobPromptClosed: true })).toBe(false);
    expect(jobsCardShows({ ...ASKING, jobPromptSnoozed: true })).toBe(false);
    expect(jobsCardShows({ ...ASKING, viewPromptSnoozed: true })).toBe(true);
  });

  it("asks about views emails only while they're off and unanswered", () => {
    expect(viewsCardShows(ASKING)).toBe(true);
    expect(viewsCardShows({ ...ASKING, viewEmails: true })).toBe(false);
    expect(viewsCardShows({ ...ASKING, viewPromptClosed: true })).toBe(false);
    expect(viewsCardShows({ ...ASKING, viewPromptSnoozed: true })).toBe(false);
    expect(viewsCardShows({ ...ASKING, emailAvailable: false })).toBe(false);
  });

  it("counts a tailored copy as the moment, but never a sample", () => {
    const tailor = { baseResumeId: "a", jobTitle: "", company: "Acme", keywords: [], createdAt: 1 };
    const own = { ...emptyResume(1), id: "a" };
    expect(hasTailoredCopy([own])).toBe(false);
    expect(hasTailoredCopy([own, { ...own, id: "b", source: "tailored", tailor }])).toBe(true);
    expect(hasTailoredCopy([{ ...own, id: "c", source: "sample", tailor }])).toBe(false);
  });
});
