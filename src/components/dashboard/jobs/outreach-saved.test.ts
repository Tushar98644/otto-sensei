import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OutreachDraft } from "@/components/studio/tailor/use-writing";
import type { Writing } from "@/lib/writings/schema";
import type { Kept } from "./use-outreach-keeper";

const api = vi.hoisted(() => ({ saveWriting: vi.fn(), editWriting: vi.fn() }));
const forgetWritings = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));
vi.mock("../letters/use-writings", () => ({ forgetWritings }));

const { ApiClientError } = await import("@/lib/api/client");
const { draftOf, fitOutreach, outreachBody, outreachChange, outreachKey, outreachLookup } =
  await import("./outreach-saved");
const { createOutreachKeeper } = await import("./use-outreach-keeper");

const JOB = {
  id: "6f9619ff-8b86-4d01-b42d-00c04fc964ff",
  title: "Product Designer",
  company: "Northwind",
  url: "https://jobs.example.com/42",
};
const DRAFT: OutreachDraft = {
  subject: "Product Designer at Northwind",
  email: "Hi [first name],\n\nI design tools.\n\nBest,\nMaya",
  note: "Hi [first name], I design tools teams use daily.",
  warnings: ["Check the team size."],
  demo: false,
};
const RESUME = { id: "resume-1", title: "Maya Chen" };

function saved(id: string, draft: OutreachDraft = DRAFT): Writing {
  return {
    id,
    kind: "outreach",
    resumeId: RESUME.id,
    resumeTitle: RESUME.title,
    company: JOB.company,
    role: JOB.title,
    jobUrl: JOB.url,
    question: "",
    text: draft.email,
    warnings: draft.warnings,
    demo: draft.demo,
    applicationId: null,
    outreach: { subject: draft.subject, note: draft.note, jobId: JOB.id },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("outreach dialog helpers", () => {
  it("keys and looks up a job by its id, else its link, else its application, else its name", () => {
    expect(outreachKey(JOB)).toBe(`job:${JOB.id}`);
    expect(outreachKey({ ...JOB, id: null })).toBe("url:https://jobs.example.com/42");
    expect(outreachKey({ ...JOB, id: null, url: " ", applicationId: "app-1" })).toBe(
      "application:app-1",
    );
    expect(outreachKey({ id: null, title: " Designer ", company: "North  wind", url: "" })).toBe(
      "name:north wind|designer",
    );
    expect(outreachLookup({ ...JOB, applicationId: "app-1" })).toEqual({
      job: JOB.id,
      application: "app-1",
    });
    expect(outreachLookup({ ...JOB, id: null })).toBeNull();
    expect(
      outreachLookup({ id: null, title: "Designer", company: "Northwind", url: "" }),
    ).toBeNull();
  });

  it("saves a message with its job, resume and application, and reads one back", () => {
    expect(outreachBody({ ...JOB, applicationId: "app-1" }, RESUME, DRAFT)).toEqual({
      kind: "outreach",
      resumeId: "resume-1",
      resumeTitle: "Maya Chen",
      company: "Northwind",
      role: "Product Designer",
      jobUrl: JOB.url,
      jobId: JOB.id,
      text: DRAFT.email,
      subject: DRAFT.subject,
      note: DRAFT.note,
      warnings: DRAFT.warnings,
      demo: false,
      applicationId: "app-1",
    });
    expect(draftOf(saved("w1"))).toEqual(DRAFT);
  });

  it("fits a fresh message to what the server keeps", () => {
    const warnings = ["w".repeat(400), ...Array.from({ length: 7 }, (_, i) => `Check ${i}.`)];
    const long = { ...DRAFT, note: "n".repeat(1_200), warnings };
    const fitted = fitOutreach(long);
    expect(fitted.note).toHaveLength(1_000);
    expect(fitted.warnings).toHaveLength(6);
    expect(fitted.warnings[0]).toHaveLength(300);
    expect(fitOutreach(DRAFT)).toEqual(DRAFT);
  });

  it("sends only what changed, and holds back an emptied email", () => {
    const fields = { subject: DRAFT.subject, email: DRAFT.email, note: DRAFT.note };
    expect(outreachChange(fields, fields)).toBeNull();
    expect(outreachChange({ ...fields, subject: ` ${DRAFT.subject}  ` }, fields)).toBeNull();
    expect(outreachChange({ ...fields, subject: "New", note: "" }, fields)).toEqual({
      subject: "New",
      note: "",
    });
    expect(outreachChange({ ...fields, email: "Hi Sam," }, fields)).toEqual({ text: "Hi Sam," });
    expect(outreachChange({ ...fields, email: "  " }, fields)).toBeNull();
  });
});

describe("keeping outreach messages", () => {
  const KEY = `job:${JOB.id}`;
  const ORIGIN = { job: JOB, resume: RESUME };
  let latest: ReadonlyMap<string, Kept> = new Map();
  const kept = () => latest.get(KEY);
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    latest = new Map();
    api.saveWriting.mockReset();
    api.editWriting.mockReset();
    forgetWritings.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("shows a new message at once and saves it to the account", async () => {
    api.saveWriting.mockResolvedValue({ ok: true, writing: saved("w1") });
    const keeper = createOutreachKeeper((next) => (latest = next));
    const onSaved = vi.fn();
    keeper.listen(onSaved);
    keeper.written(KEY, ORIGIN, DRAFT, "The post");
    expect(kept()).toMatchObject({
      draft: DRAFT,
      post: "The post",
      writingId: null,
      save: "saving",
    });
    await settle();
    expect(api.saveWriting).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "outreach", jobId: JOB.id }),
    );
    expect(kept()).toMatchObject({ writingId: "w1", save: "saved", error: null });
    expect(onSaved).toHaveBeenCalledWith(saved("w1"));
    expect(forgetWritings).toHaveBeenCalled();
  });

  it("keeps a message that couldn't be saved, says why, and saves it on a retry", async () => {
    api.saveWriting.mockRejectedValueOnce(
      new ApiClientError("server_error", "Couldn't save that. Please try again.", 500),
    );
    const keeper = createOutreachKeeper((next) => (latest = next));
    keeper.written(KEY, ORIGIN, DRAFT, "The post");
    await settle();
    expect(kept()).toMatchObject({
      draft: DRAFT,
      writingId: null,
      save: "failed",
      error: "Couldn't save that. Please try again.",
    });
    keeper.edit(KEY, "subject", "Edited while unsaved");
    api.saveWriting.mockResolvedValueOnce({ ok: true, writing: saved("w2") });
    keeper.retry(KEY);
    await settle();
    expect(api.saveWriting).toHaveBeenLastCalledWith(
      expect.objectContaining({ subject: "Edited while unsaved" }),
    );
    expect(kept()).toMatchObject({ writingId: "w2", save: "saved", error: null });
  });

  it("saves edits after a pause or on leaving a box, sending only what changed", async () => {
    vi.useFakeTimers();
    const keeper = createOutreachKeeper((next) => (latest = next));
    keeper.found(KEY, saved("w1"));
    expect(kept()).toMatchObject({ draft: DRAFT, writingId: "w1", save: "idle", post: "" });
    api.editWriting.mockResolvedValue({ ok: true, writing: saved("w1") });

    keeper.edit(KEY, "note", "Shorter note.");
    expect(api.editWriting).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_200);
    expect(api.editWriting).toHaveBeenCalledWith("w1", { note: "Shorter note." });
    expect(kept()?.save).toBe("saved");

    keeper.edit(KEY, "subject", "New subject");
    keeper.flush(KEY);
    await vi.advanceTimersByTimeAsync(0);
    expect(api.editWriting).toHaveBeenLastCalledWith("w1", { subject: "New subject" });
    expect(api.editWriting).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(api.editWriting).toHaveBeenCalledTimes(2);
  });

  it("tells the page each time an edit lands, with the saved message", async () => {
    vi.useFakeTimers();
    const keeper = createOutreachKeeper((next) => (latest = next));
    const onSaved = vi.fn();
    keeper.listen(onSaved);
    keeper.found(KEY, saved("w1"));
    const edited = saved("w1", { ...DRAFT, email: "Hi Jane,\n\nI design tools." });
    api.editWriting.mockResolvedValue({ ok: true, writing: edited });
    keeper.edit(KEY, "email", "Hi Jane,\n\nI design tools.");
    expect(onSaved).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_200);
    expect(onSaved).toHaveBeenCalledWith(edited);

    api.editWriting.mockRejectedValueOnce(
      new ApiClientError("network_error", "You're offline.", 0),
    );
    keeper.edit(KEY, "note", "Hi Jane.");
    keeper.flush(KEY);
    await vi.advanceTimersByTimeAsync(0);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("says when an edit didn't save, keeps it, and tries again with the next change", async () => {
    vi.useFakeTimers();
    const keeper = createOutreachKeeper((next) => (latest = next));
    keeper.found(KEY, saved("w1"));
    api.editWriting.mockRejectedValueOnce(
      new ApiClientError("network_error", "You're offline.", 0),
    );
    keeper.edit(KEY, "email", "Hi Sam,");
    keeper.flush(KEY);
    await vi.advanceTimersByTimeAsync(0);
    expect(kept()).toMatchObject({ save: "failed", error: "You're offline." });
    expect(kept()?.draft.email).toBe("Hi Sam,");

    api.editWriting.mockResolvedValueOnce({ ok: true, writing: saved("w1") });
    keeper.edit(KEY, "email", "Hi Sam, again");
    await vi.advanceTimersByTimeAsync(1_200);
    expect(api.editWriting).toHaveBeenLastCalledWith("w1", { text: "Hi Sam, again" });
    expect(kept()).toMatchObject({ save: "saved", error: null });
  });

  it("sends an edit made while the message was first saving, and a waiting edit on leaving", async () => {
    let finish: (value: unknown) => void = () => {};
    api.saveWriting.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    api.editWriting.mockResolvedValue({ ok: true, writing: saved("w1") });
    const keeper = createOutreachKeeper((next) => (latest = next));
    keeper.written(KEY, ORIGIN, DRAFT, "The post");
    keeper.edit(KEY, "note", "Typed while saving");
    finish({ ok: true, writing: saved("w1") });
    await settle();
    expect(api.editWriting).toHaveBeenCalledWith("w1", { note: "Typed while saving" });

    keeper.edit(KEY, "subject", "Last words");
    keeper.dispose();
    await settle();
    expect(api.editWriting).toHaveBeenLastCalledWith("w1", { subject: "Last words" });
  });

  it("doesn't let a message found later replace the one on screen", () => {
    const keeper = createOutreachKeeper((next) => (latest = next));
    api.saveWriting.mockReturnValue(new Promise(() => {}));
    keeper.written(KEY, ORIGIN, { ...DRAFT, subject: "Fresh" }, "The post");
    keeper.found(KEY, saved("old"));
    expect(kept()?.draft.subject).toBe("Fresh");
    keeper.readPost(KEY, "Another post");
    expect(kept()?.post).toBe("The post");
  });
});
