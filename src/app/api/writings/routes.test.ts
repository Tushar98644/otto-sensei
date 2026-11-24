import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiErrorBody } from "@/lib/api/types";
import {
  cookieJar,
  jsonRequest,
  resetDb,
  setPlan,
  signInAs as signInFree,
  signInOnTrial,
} from "@/lib/auth/test-helpers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, users, writings } from "@/db/schema";
import { saveJobs, syncBoards } from "@/lib/job-feed/store";
import { storedJobIds } from "@/lib/job-feed/test-fixtures";
import type {
  OutreachWritingResponse,
  Writing,
  WritingResponse,
  WritingsResponse,
} from "@/lib/writings/schema";
import { DELETE, PATCH } from "./[id]/route";
import { GET as FIND } from "./outreach/route";
import { GET, POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const signInAs = async (email: string) => setPlan(await signInFree(email), "pro");

const LETTER = {
  kind: "letter",
  resumeId: "resume-1",
  resumeTitle: "Maya Chen",
  company: "Northwind",
  role: "Product Designer",
  jobUrl: "jobs.example.com/42",
  text: "Dear Northwind team,\n\nI design tools people use every day.\n\nBest regards,\nMaya Chen",
  warnings: ["Add the number of users you mean."],
};

const ANSWER = {
  kind: "answer",
  resumeId: "resume-1",
  company: "Northwind",
  role: "Product Designer",
  question: "Why do you want to work here?",
  text: "Because your tools are used by teams I admire.",
};

const OUTREACH = {
  kind: "outreach",
  resumeId: "resume-1",
  resumeTitle: "Maya Chen",
  company: "Northwind",
  role: "Product Designer",
  jobUrl: "jobs.example.com/42",
  subject: "Product Designer at Northwind",
  text: "Hi [first name],\n\nI design tools people use every day.\n\nBest,\nMaya",
  note: "Hi [first name], I design tools teams use daily. Could we talk about the role?",
  warnings: ["Check the team size you mention."],
};

const create = (body: unknown) => POST(jsonRequest("/api/writings", body));

function patch(id: string, body: unknown) {
  return PATCH(
    new Request(`http://localhost/api/writings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

function remove(id: string) {
  return DELETE(new Request(`http://localhost/api/writings/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });
}

async function list(): Promise<WritingsResponse> {
  return (await (await GET()).json()) as WritingsResponse;
}

async function find(query: Record<string, string>): Promise<Response> {
  return FIND(new Request(`http://localhost/api/writings/outreach?${new URLSearchParams(query)}`));
}

async function found(query: Record<string, string>) {
  const res = await find(query);
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("no-store");
  return ((await res.json()) as OutreachWritingResponse).writing;
}

const SOLO_LINK = "https://job-boards.greenhouse.io/northwind/jobs/7";
const SHARED_LINK = "https://careers.example.com/open-roles";

// A solo posting, and two that a careers page gives the same link.
async function seedJobs(): Promise<{ solo: string; designer: string; engineer: string }> {
  const db = await getDb();
  await syncBoards(db, [{ ats: "greenhouse", token: "northwind", company: "Northwind" }]);
  const posting = (externalId: string, title: string, url: string) => ({
    externalId,
    company: "Northwind",
    title,
    location: "Remote",
    remote: true,
    employmentType: "full_time" as const,
    postedAt: Date.now() - 1_000,
    validThrough: null,
    url,
    text: `${title} at Northwind. Design tools for teams. Figma, research and prototyping.`,
  });
  await saveJobs(
    db,
    { source: "greenhouse", board: "northwind" },
    [
      posting("7", "Product Designer", SOLO_LINK),
      posting("8", "Brand Designer", SHARED_LINK),
      posting("9", "Design Engineer", SHARED_LINK),
    ],
    Date.now(),
    { snapshot: true },
  );
  const rows = await storedJobIds(db);
  const id = (externalId: string) => rows.find((row) => row.externalId === externalId)!.id;
  return { solo: id("7"), designer: id("8"), engineer: id("9") };
}

async function seedApplication(userId: string, jobUrl: string): Promise<string> {
  const id = crypto.randomUUID();
  await (await getDb()).insert(applications).values({
    id,
    userId,
    company: "Northwind",
    role: "Brand Designer",
    jobUrl,
    appliedAt: 1,
    statusChangedAt: 1,
    createdAt: 1,
    updatedAt: 1,
  });
  return id;
}

async function kept(body: unknown): Promise<Writing> {
  const res = await create(body);
  expect(res.status).toBe(201);
  return ((await res.json()) as WritingResponse).writing;
}

// Saves can land in the same millisecond, so the order is set here.
async function setOrder(ids: readonly string[]) {
  const db = await getDb();
  for (const [index, id] of ids.entries()) {
    await db
      .update(writings)
      .set({ createdAt: (index + 1) * 1_000 })
      .where(eq(writings.id, id));
  }
}

async function errorOf(res: Response) {
  return ((await res.json()) as ApiErrorBody).error;
}

describe("/api/writings", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("needs a signed-in account", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await create(LETTER)).status).toBe(401);
    expect((await patch(crypto.randomUUID(), { text: "Hi" })).status).toBe(401);
    expect((await remove(crypto.randomUUID())).status).toBe(401);
  });

  it("offers the trial on Free instead of saving, like the letter route", async () => {
    await signInFree("maya@example.com");
    const res = await create(LETTER);
    expect(res.status).toBe(402);
    expect(await errorOf(res)).toEqual({
      code: "upgrade_required",
      message:
        "Cover letters, outreach messages, answers and interview prep come with Pro. Try Pro for 7 days.",
    });
    expect(await list()).toEqual({ ok: true, writings: [], total: 0 });
  });

  it("saves letters and answers on the trial, newest first, with a clean link", async () => {
    await signInOnTrial("maya@example.com");
    const letter = await create(LETTER);
    expect(letter.status).toBe(201);
    const saved = ((await letter.json()) as WritingResponse).writing;
    expect(saved).toMatchObject({
      kind: "letter",
      company: "Northwind",
      jobUrl: "https://jobs.example.com/42",
      question: "",
      warnings: ["Add the number of users you mean."],
      demo: false,
    });
    expect(saved.text).toContain("\n\nBest regards,\nMaya Chen");

    const answer = await create(ANSWER);
    expect(answer.status).toBe(201);
    const { writings, total } = await list();
    expect(total).toBe(2);
    expect(writings.map((item) => item.kind)).toEqual(["answer", "letter"]);
    expect(writings[0]?.question).toBe("Why do you want to work here?");
  });

  it("turns away bodies that break the rules", async () => {
    await signInAs("maya@example.com");
    for (const body of [
      { ...ANSWER, question: "" },
      { ...LETTER, question: "Why us?" },
      { ...LETTER, text: "   " },
      { ...ANSWER, text: "x".repeat(3_001) },
      { ...LETTER, kind: "essay" },
    ]) {
      expect((await create(body)).status).toBe(400);
    }
    const res = await create({ ...LETTER, jobUrl: "not a link" });
    expect(res.status).toBe(201);
    expect(((await res.json()) as WritingResponse).writing.jobUrl).toBe("");
  });

  it("edits and deletes for the owner only", async () => {
    await signInAs("maya@example.com");
    const { writing } = (await (await create(LETTER)).json()) as WritingResponse;

    const edited = await patch(writing.id, { text: "Dear team,\n\nShorter now." });
    expect(edited.status).toBe(200);
    expect(((await edited.json()) as WritingResponse).writing.text).toBe(
      "Dear team,\n\nShorter now.",
    );

    cookieJar.clear();
    await signInAs("sam@example.com");
    expect((await patch(writing.id, { text: "Mine now" })).status).toBe(404);
    expect((await remove(writing.id)).status).toBe(200);
    expect((await list()).writings).toEqual([]);

    cookieJar.clear();
    await signInAs("maya@example.com");
    expect((await list()).writings.map((item) => item.text)).toEqual([
      "Dear team,\n\nShorter now.",
    ]);
    expect((await remove(writing.id)).status).toBe(200);
    expect((await list()).total).toBe(0);
    expect((await patch(writing.id, { text: "Back?" })).status).toBe(404);
  });

  it("keeps an answer's smaller cap on edits, and lets a lapsed plan edit what it kept", async () => {
    const maya = await signInAs("maya@example.com");
    const { writing } = (await (await create(ANSWER)).json()) as WritingResponse;
    expect((await patch(writing.id, { text: "y".repeat(3_001) })).status).toBe(400);

    await (await getDb()).update(users).set({ plan: "free" }).where(eq(users.id, maya.id));
    expect((await patch(writing.id, { text: "Still mine to edit." })).status).toBe(200);
    expect((await create(ANSWER)).status).toBe(402);
  });

  it("keeps outreach messages with their subject and note, and lists them with the rest", async () => {
    await signInAs("maya@example.com");
    await create(LETTER);
    const res = await create(OUTREACH);
    expect(res.status).toBe(201);
    const saved = ((await res.json()) as WritingResponse).writing;
    expect(saved).toMatchObject({
      kind: "outreach",
      jobUrl: "https://jobs.example.com/42",
      question: "",
      text: OUTREACH.text,
      warnings: OUTREACH.warnings,
      outreach: { subject: OUTREACH.subject, note: OUTREACH.note, jobId: null },
    });
    const { writings, total } = await list();
    expect(total).toBe(2);
    expect(writings.map((item) => item.kind)).toEqual(["outreach", "letter"]);
    expect(writings[1]).not.toHaveProperty("outreach");
  });

  it("keeps the first six warnings and trims a long one, since they only advise", async () => {
    await signInAs("maya@example.com");
    const warnings = [
      "w".repeat(400),
      ...Array.from({ length: 7 }, (_, i) => `Check line ${i + 1}.`),
    ];
    const saved = await kept({ ...OUTREACH, warnings });
    expect(saved.warnings).toHaveLength(6);
    expect(saved.warnings[0]).toHaveLength(300);
    expect(saved.warnings[5]).toBe("Check line 5.");
  });

  it("turns away outreach bodies that break the rules", async () => {
    await signInAs("maya@example.com");
    for (const body of [
      { ...OUTREACH, text: " " },
      { ...OUTREACH, question: "Why do you want to work here?" },
      { ...OUTREACH, text: "x".repeat(3_001) },
      { ...OUTREACH, subject: "s".repeat(201) },
      { ...OUTREACH, note: "n".repeat(1_001) },
      { ...OUTREACH, jobId: "job-7" },
      { ...LETTER, subject: "A subject" },
      { ...ANSWER, note: "A note" },
    ]) {
      expect((await create(body)).status).toBe(400);
    }
    expect((await list()).total).toBe(0);
  });

  it("finds the newest message for a job by its id, never one written for a job that shares its link", async () => {
    await signInAs("maya@example.com");
    const { solo, designer, engineer } = await seedJobs();
    expect(await found({ job: solo })).toBeNull();
    const older = await kept({ ...OUTREACH, jobUrl: SOLO_LINK, jobId: solo });
    const newer = await kept({ ...OUTREACH, jobUrl: "", jobId: solo, subject: "Newer" });
    await kept({ ...LETTER, jobUrl: SOLO_LINK });
    await setOrder([older.id, newer.id]);
    expect(newer.outreach?.jobId).toBe(solo);
    expect((await found({ job: solo }))?.id).toBe(newer.id);

    // A message kept before its job reached the feed is found by the job's own link.
    const db = await getDb();
    await db
      .update(writings)
      .set({ jobId: null, createdAt: 3_000 })
      .where(eq(writings.id, older.id));
    expect((await found({ job: solo }))?.id).toBe(older.id);

    const forDesigner = await kept({ ...OUTREACH, jobUrl: SHARED_LINK, jobId: designer });
    expect((await found({ job: designer }))?.id).toBe(forDesigner.id);
    expect(await found({ job: engineer })).toBeNull();
    const unsure = await kept({ ...OUTREACH, jobUrl: SHARED_LINK, jobId: null });
    expect(unsure.outreach?.jobId).toBeNull();
    expect(await found({ job: engineer })).toBeNull();
    expect((await found({ job: designer }))?.id).toBe(forDesigner.id);

    const gone = await kept({ ...OUTREACH, jobUrl: "", jobId: crypto.randomUUID() });
    expect(gone.outreach?.jobId).toBeNull();
    expect(await found({ job: "not-an-id", application: "nor this" })).toBeNull();
    expect(await found({ url: SOLO_LINK })).toBeNull();
    expect(await found({})).toBeNull();

    cookieJar.clear();
    await signInAs("sam@example.com");
    expect(await found({ job: solo })).toBeNull();
    cookieJar.clear();
    expect((await find({ job: solo })).status).toBe(401);
  });

  it("finds an application's message, never one kept with another application that shares its link", async () => {
    const maya = await signInAs("maya@example.com");
    const { designer } = await seedJobs();
    const first = await seedApplication(maya.id, SHARED_LINK);
    const second = await seedApplication(maya.id, SHARED_LINK);
    const mine = await kept({ ...OUTREACH, jobUrl: SHARED_LINK, applicationId: first });
    expect(mine.applicationId).toBe(first);
    expect((await found({ application: first }))?.id).toBe(mine.id);
    expect(await found({ application: second })).toBeNull();
    expect(await found({ application: second, job: designer })).toBeNull();

    // One kept before either was tracked shows on both, as each application's page lists it.
    const loose = await kept({ ...OUTREACH, jobUrl: SHARED_LINK, applicationId: first });
    await (
      await getDb()
    )
      .update(writings)
      .set({ applicationId: null, createdAt: Date.now() + 1_000 })
      .where(eq(writings.id, loose.id));
    expect((await found({ application: second }))?.id).toBe(loose.id);
    expect((await found({ application: first }))?.id).toBe(loose.id);

    cookieJar.clear();
    await signInAs("sam@example.com");
    expect(await found({ application: first })).toBeNull();
  });

  it("edits a message's subject, email and note, and only a message has the first and last", async () => {
    await signInAs("maya@example.com");
    const message = ((await (await create(OUTREACH)).json()) as WritingResponse).writing;
    const edited = await patch(message.id, {
      subject: "  Designer   for Northwind ",
      note: "",
      text: "Hi Sam,\n\nShorter now.",
    });
    expect(edited.status).toBe(200);
    expect(((await edited.json()) as WritingResponse).writing).toMatchObject({
      text: "Hi Sam,\n\nShorter now.",
      outreach: { subject: "Designer for Northwind", note: "" },
    });
    const onlyNote = await patch(message.id, { note: "Hi Sam, quick hello." });
    expect(((await onlyNote.json()) as WritingResponse).writing).toMatchObject({
      text: "Hi Sam,\n\nShorter now.",
      outreach: { subject: "Designer for Northwind", note: "Hi Sam, quick hello." },
    });

    const long = await patch(message.id, { text: "y".repeat(3_001) });
    expect(long.status).toBe(400);
    expect((await errorOf(long)).message).toBe(
      "That email is too long to keep. Cut it under 3,000 characters.",
    );
    expect((await patch(message.id, {})).status).toBe(400);
    expect((await patch(message.id, { note: "n".repeat(1_001) })).status).toBe(400);

    const letter = ((await (await create(LETTER)).json()) as WritingResponse).writing;
    expect((await patch(letter.id, { subject: "Hello" })).status).toBe(400);
    expect((await patch(letter.id, { text: "Dear team," })).status).toBe(200);
  });
});
