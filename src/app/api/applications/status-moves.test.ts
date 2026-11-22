import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import { createApplication, setStatusMany, updateApplication } from "./records";

const moves = vi.hoisted(() => ({ sent: [] as unknown[][] }));
vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/analytics/retention", () => ({
  trackStatusChanges: (...args: unknown[]) => moves.sent.push(args),
}));

const { PATCH: patchOne } = await import("./[id]/route");
const { PATCH: patchMany } = await import("./route");

const APPLIED_AT = Date.UTC(2026, 9, 1, 12);

async function logged(userId: string, company: string) {
  const result = await createApplication(userId, {
    resumeId: null,
    resumeTitle: "",
    company,
    role: "",
    jobUrl: "",
    appliedAt: APPLIED_AT,
    status: "applied",
    notes: "",
  });
  if (result.status !== "created") throw new Error(result.status);
  return result.application;
}

function patch(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
  moves.sent = [];
});

describe("status moves", () => {
  it("knows where an application moved from, and only when it moved", async () => {
    const user = await signInAs();
    const stripe = await logged(user.id, "Stripe");
    const now = APPLIED_AT + 86_400_000;
    expect(
      (await updateApplication(user.id, stripe.id, { status: "interview" }, now))?.moved,
    ).toEqual({
      from: "applied",
      to: "interview",
    });
    expect(
      (await updateApplication(user.id, stripe.id, { status: "interview" }, now + 1))?.moved,
    ).toBeNull();
    expect(
      (await updateApplication(user.id, stripe.id, { notes: "Call went well" }, now + 2))?.moved,
    ).toBeNull();
    expect(
      (await updateApplication(user.id, stripe.id, { status: "offer" }, now + 3))?.moved,
    ).toEqual({
      from: "interview",
      to: "offer",
    });
  });

  it("lists each move in a bulk change", async () => {
    const user = await signInAs();
    const a = await logged(user.id, "Asana");
    const b = await logged(user.id, "Brex");
    await updateApplication(user.id, b.id, { status: "interview" });
    const { applications, moves: moved } = await setStatusMany(user.id, [a.id, b.id], "rejected");
    expect(applications).toHaveLength(2);
    expect(moved).toEqual(
      expect.arrayContaining([
        { from: "applied", to: "rejected" },
        { from: "interview", to: "rejected" },
      ]),
    );
  });

  it("is sent from both status routes", async () => {
    const user = await setPlan(await signInAs(), "pro");
    const a = await logged(user.id, "Asana");
    const b = await logged(user.id, "Brex");
    const one = await patchOne(patch(`/api/applications/${a.id}`, { status: "interview" }), {
      params: Promise.resolve({ id: a.id }),
    });
    expect(one.status).toBe(200);
    const many = await patchMany(
      patch("/api/applications", { ids: [a.id, b.id], status: "no_reply" }),
    );
    expect(many.status).toBe(200);
    expect(moves.sent).toEqual([
      [user.id, [{ from: "applied", to: "interview" }]],
      [
        user.id,
        expect.arrayContaining([
          { from: "interview", to: "no_reply" },
          { from: "applied", to: "no_reply" },
        ]),
      ],
    ]);
  });
});
