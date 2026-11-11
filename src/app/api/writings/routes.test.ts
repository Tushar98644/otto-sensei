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
import type { WritingResponse, WritingsResponse } from "@/lib/writings/schema";
import { DELETE, PATCH } from "./[id]/route";
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
      message: "Cover letters, answers and interview prep come with Pro. Try Pro free for 3 days.",
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
    expect(((await edited.json()) as WritingResponse).writing.text).toBe("Dear team,\n\nShorter now.");

    cookieJar.clear();
    await signInAs("sam@example.com");
    expect((await patch(writing.id, { text: "Mine now" })).status).toBe(404);
    expect((await remove(writing.id)).status).toBe(200);
    expect((await list()).writings).toEqual([]);

    cookieJar.clear();
    await signInAs("maya@example.com");
    expect((await list()).writings.map((item) => item.text)).toEqual(["Dear team,\n\nShorter now."]);
    expect((await remove(writing.id)).status).toBe(200);
    expect((await list()).total).toBe(0);
    expect((await patch(writing.id, { text: "Back?" })).status).toBe(404);
  });

  it("keeps an answer's smaller cap on edits, and lets a lapsed plan edit what it kept", async () => {
    const maya = await signInAs("maya@example.com");
    const { writing } = (await (await create(ANSWER)).json()) as WritingResponse;
    expect((await patch(writing.id, { text: "y".repeat(3_001) })).status).toBe(400);

    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { getDb } = await import("@/db/client");
    await (await getDb()).update(users).set({ plan: "free" }).where(eq(users.id, maya.id));
    expect((await patch(writing.id, { text: "Still mine to edit." })).status).toBe(200);
    expect((await create(ANSWER)).status).toBe(402);
  });
});
