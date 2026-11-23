import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applicationLimit } from "@/config/plans";
import { getDb } from "@/db/client";
import { applications, inboundEmails, users } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { HANDLE_HOLD_MS, HANDLE_ROUTES_MS } from "@/lib/inbound/handle";
import {
  gmailForward,
  inboundRequest,
  loadFixture,
  useInboundSecrets,
  type WorkerAuth,
} from "@/lib/inbound/inbound-testing";
import type {
  EmailTrackingResponse,
  EmailTrackingState,
  HandleCheckResponse,
} from "@/lib/inbound/types";
import { PATCH as patchApplication } from "../../applications/[id]/route";
import { DELETE as dismiss, PATCH as change } from "../../email-tracking/[id]/route";
import { GET as checkHandle } from "../../email-tracking/handle/route";
import { DELETE as turnOff, GET as tracking, POST as act } from "../../email-tracking/route";
import { POST } from "./route";

const { cookies } = vi.hoisted(() => ({ cookies: vi.fn() }));
vi.mock("next/headers", async () => {
  const { nextHeadersMock } = await import("@/lib/auth/test-helpers");
  cookies.mockImplementation(nextHeadersMock.cookies);
  return { cookies };
});

const NOW = Date.UTC(2026, 10, 20, 12);
const DAY = 24 * 60 * 60 * 1_000;
const GMAIL = "priya.sharma@gmail.com";
const GOOGLE_SIGNED: WorkerAuth = { dkim: ["google.com"] };

function json(method: string, path: string, body?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function state(res?: Response): Promise<EmailTrackingState> {
  const response = res ?? (await tracking());
  expect(response.status).toBeLessThan(300);
  return ((await response.json()) as EmailTrackingResponse).tracking;
}

async function start(handle = "priya"): Promise<string> {
  const res = await act(json("POST", "/api/email-tracking", { action: "start", handle }));
  expect(res.status).toBe(201);
  return (await state(res)).address!.email;
}

// Confirms forwarding from GMAIL the way the page does it: Google's email arrives, the person presses Confirm.
async function confirmGmail(to: string): Promise<void> {
  expect(await result(await deliver(to, "gmail-confirmation.txt", { auth: GOOGLE_SIGNED }))).toBe(
    "confirmation",
  );
  await state(await act(json("POST", "/api/email-tracking", { action: "confirmed" })));
}

async function deliver(
  to: string,
  fixture: string,
  { messageId, auth = {} }: { messageId?: string; auth?: WorkerAuth } = {},
): Promise<Response> {
  const mail = loadFixture(fixture);
  return POST(
    await inboundRequest(to, { ...mail, messageId: messageId ?? mail.messageId }, { auth }),
  );
}

async function result(res: Response): Promise<string> {
  expect(res.status).toBe(200);
  return ((await res.json()) as { result: string }).result;
}

async function cards(userId: string) {
  const db = await getDb();
  return db.select().from(applications).where(eq(applications.userId, userId));
}

const context = (id: string) => ({ params: Promise.resolve({ id }) });

let user: SessionUser;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
  useInboundSecrets();
  user = await setPlan(await signInAs("priya@example.com"), "pro");
});

afterEach(() => {
  vi.useRealTimers();
  useInboundSecrets(false);
});

describe("/api/inbound/email", () => {
  it("takes only requests the Worker signed, for an address that exists", async () => {
    const to = await start();
    const mail = loadFixture("greenhouse-applied.txt");
    const forged = await inboundRequest(to, mail, {
      secret: "someone-else's-secret-of-enough-length-xx",
    });
    expect((await POST(forged)).status).toBe(401);
    const stale = await inboundRequest(to, mail, { now: NOW - 6 * 60_000 });
    expect((await POST(stale)).status).toBe(401);
    expect(
      (await POST(await inboundRequest("otto+nobody@track.ottosensei.com", mail))).status,
    ).toBe(404);
    expect(await cards(user.id)).toHaveLength(0);
    useInboundSecrets(false);
    expect((await POST(await inboundRequest(to, mail))).status).toBe(503);
  });

  it("never reads a cookie", async () => {
    const to = await start();
    cookies.mockClear();
    expect(await result(await deliver(to, "greenhouse-applied.txt"))).toBe("pending");
    expect(cookies).not.toHaveBeenCalled();
  });

  it("shows Gmail's signed confirmation with its mailbox, and trusts that Gmail once confirmed", async () => {
    const to = await start();
    // Unsigned, it could be anyone's lookalike: nothing to confirm.
    expect(await result(await deliver(to, "gmail-confirmation.txt"))).toBe("ignored");
    expect((await state()).address?.confirm).toBeNull();
    expect(await result(await deliver(to, "gmail-confirmation.txt", { auth: GOOGLE_SIGNED }))).toBe(
      "confirmation",
    );
    const seen = await state();
    expect(seen.address?.confirm).toMatchObject({ code: "123456789", source: GMAIL });
    expect(seen.address?.confirm?.url).toMatch(/^https:\/\/mail-settings\.google\.com\/mail\/vf-/);
    const confirmed = await state(
      await act(json("POST", "/api/email-tracking", { action: "confirmed" })),
    );
    expect(confirmed.address?.sources).toEqual([GMAIL]);
    expect(confirmed.address?.confirmedAt).toBe(NOW);
  });

  it("moves the board from the person's own Gmail, never backwards, with Undo", async () => {
    const to = await start();
    await confirmGmail(to);
    const fromGmail = gmailForward(GMAIL, to);
    expect(
      await result(
        await deliver(to, "greenhouse-applied.txt", { messageId: "<n1@gh>", auth: fromGmail }),
      ),
    ).toBe("created");
    expect(
      await result(
        await deliver(to, "greenhouse-applied.txt", { messageId: "<n1@gh>", auth: fromGmail }),
      ),
    ).toBe("duplicate");
    let [card] = await cards(user.id);
    expect(card).toMatchObject({
      company: "Northwind",
      role: "Senior Product Designer",
      status: "applied",
    });
    expect(await result(await deliver(to, "greenhouse-rejected.txt", { auth: fromGmail }))).toBe(
      "moved",
    );
    expect(
      await result(
        await deliver(to, "greenhouse-applied.txt", { messageId: "<late@gh>", auth: fromGmail }),
      ),
    ).toBe("none");
    [card] = await cards(user.id);
    expect(card?.status).toBe("rejected");

    const rejection = (await state()).events.find((event) => event.kind === "rejected")!;
    expect(rejection).toMatchObject({
      change: "moved",
      trust: "source",
      fromStatus: "applied",
      toStatus: "rejected",
    });
    const undone = await change(
      json("PATCH", `/api/email-tracking/${rejection.id}`, { action: "undo" }),
      context(rejection.id),
    );
    expect(undone.status).toBe(200);
    [card] = await cards(user.id);
    expect(card?.status).toBe("applied");
    expect(card?.statusHistory.map((entry) => entry.status)).toEqual(["applied"]);
  });

  it("moves the board for a hiring system that signed its email", async () => {
    const to = await start();
    const signed = { dkim: ["greenhouse-mail.io"] };
    expect(await result(await deliver(to, "greenhouse-applied.txt", { auth: signed }))).toBe(
      "created",
    );
    expect((await state()).events[0]?.trust).toBe("sender");
  });

  it("at the plan's number, keeps a new card from email in Check this, and Apply says what to do", async () => {
    const to = await start();
    const db = await getDb();
    const rows = Array.from({ length: applicationLimit("pro") }, (_, i) => ({
      id: crypto.randomUUID(),
      userId: user.id,
      company: `Company ${i}`,
      appliedAt: NOW - DAY,
      statusChangedAt: NOW - DAY,
      createdAt: NOW - DAY,
      updatedAt: NOW - DAY,
    }));
    for (let i = 0; i < rows.length; i += 250) {
      await db.insert(applications).values(rows.slice(i, i + 250));
    }
    const signed = { dkim: ["greenhouse-mail.io"] };
    expect(await result(await deliver(to, "greenhouse-applied.txt", { auth: signed }))).toBe(
      "pending",
    );
    expect(await cards(user.id)).toHaveLength(applicationLimit("pro"));
    const [waiting] = (await state()).events.filter((event) => event.change === "pending");
    expect(waiting).toMatchObject({ kind: "applied", trust: "sender" });

    const full = await change(
      json("PATCH", `/api/email-tracking/${waiting!.id}`, { action: "apply" }),
      context(waiting!.id),
    );
    expect(full.status).toBe(429);
    expect(((await full.json()) as ApiErrorBody).error).toEqual({
      code: "limit_reached",
      message:
        "Pro tracks 1,000 applications. Delete some old ones to add more, or move to Max for 2,000.",
    });
    expect((await state()).events.find((event) => event.id === waiting!.id)?.change).toBe(
      "pending",
    );

    await db.delete(applications).where(eq(applications.id, rows[0]!.id));
    const applied = await state(
      await change(
        json("PATCH", `/api/email-tracking/${waiting!.id}`, { action: "apply" }),
        context(waiting!.id),
      ),
    );
    expect(applied.events.find((event) => event.id === waiting!.id)?.change).toBe("created");
    expect(await cards(user.id)).toHaveLength(applicationLimit("pro"));
  });

  it("never lets a stranger's rejection to a guessed address move a card: it waits in Check this", async () => {
    const to = await start();
    await confirmGmail(to);
    expect(
      await result(await deliver(to, "greenhouse-applied.txt", { auth: gmailForward(GMAIL, to) })),
    ).toBe("created");
    // Forged From and forged Gmail forwarding headers, but nobody signed it.
    expect(await result(await deliver(to, "greenhouse-rejected.txt"))).toBe("pending");
    // Signed, but by the stranger's own domain.
    const spoof = { dkim: ["attacker.example"], envelopeFrom: "bounce@attacker.example" };
    expect(
      await result(
        await deliver(to, "greenhouse-rejected.txt", { messageId: "<s2@x>", auth: spoof }),
      ),
    ).toBe("pending");
    expect((await cards(user.id)).map((row) => row.status)).toEqual(["applied"]);

    const waiting = (await state()).events.filter((event) => event.change === "pending");
    expect(waiting).toHaveLength(2);
    expect(waiting[0]).toMatchObject({ kind: "rejected", trust: null, applicationId: null });
    expect(waiting[0]?.proposal).toMatchObject({
      change: "moved",
      company: "Northwind",
      fromStatus: "applied",
      toStatus: "rejected",
    });
    // Nothing to undo before it's applied.
    const early = await change(
      json("PATCH", `/api/email-tracking/${waiting[0]!.id}`, { action: "undo" }),
      context(waiting[0]!.id),
    );
    expect(early.status).toBe(200);
    expect((await cards(user.id)).map((row) => row.status)).toEqual(["applied"]);

    const ignored = await state(
      await dismiss(
        json("DELETE", `/api/email-tracking/${waiting[1]!.id}`),
        context(waiting[1]!.id),
      ),
    );
    expect(ignored.events.filter((event) => event.change === "pending")).toHaveLength(1);
    const applied = await state(
      await change(
        json("PATCH", `/api/email-tracking/${waiting[0]!.id}`, { action: "apply" }),
        context(waiting[0]!.id),
      ),
    );
    expect((await cards(user.id)).map((row) => row.status)).toEqual(["rejected"]);
    expect(applied.events.find((event) => event.id === waiting[0]!.id)).toMatchObject({
      change: "moved",
      trust: "you",
    });
  });

  it("drops another mailbox's forwarded mail and strangers' unreadable mail", async () => {
    const to = await start();
    await confirmGmail(to);
    const other = gmailForward("someone.else@gmail.com", to);
    const mail = loadFixture("greenhouse-rejected.txt");
    const res = await POST(
      await inboundRequest(
        to,
        {
          ...mail,
          headers: { ...mail.headers, "x-forwarded-for": `someone.else@gmail.com ${to}` },
        },
        { auth: other },
      ),
    );
    expect(await result(res)).toBe("ignored");
    expect(await result(await deliver(to, "unknown-personal.txt"))).toBe("ignored");
    expect(
      await result(
        await deliver(to, "unknown-personal.txt", {
          messageId: "<u2@x>",
          auth: { dkim: ["gmail.com"] },
        }),
      ),
    ).toBe("ignored");
    expect((await state()).events).toEqual([]);
  });

  it("lists what the person's own mail couldn't place until dismissed", async () => {
    const to = await start();
    await confirmGmail(to);
    const mail = loadFixture("unknown-personal.txt");
    const own = gmailForward(GMAIL, to);
    const res = await POST(
      await inboundRequest(
        to,
        { ...mail, headers: { "x-forwarded-for": `${GMAIL} ${to}` } },
        { auth: own },
      ),
    );
    expect(await result(res)).toBe("unread");
    expect(await result(await deliver(to, "otto-test.txt"))).toBe("test");
    const seen = await state();
    expect(seen.address?.testAt).toBe(NOW);
    expect(seen.events.map((event) => [event.kind, event.subject])).toEqual([
      ["unknown", "Dinner on Friday?"],
    ]);
  });

  it("keeps a change made by hand: Undo then says the card changed", async () => {
    const to = await start();
    await confirmGmail(to);
    const fromGmail = gmailForward(GMAIL, to);
    await deliver(to, "lever-applied.txt", { auth: fromGmail });
    const [fernbrook] = await cards(user.id);
    vi.setSystemTime(NOW + 60_000);
    const edited = await patchApplication(
      json("PATCH", `/api/applications/${fernbrook!.id}`, { notes: "Spoke to Morgan" }),
      context(fernbrook!.id),
    );
    expect(edited.status).toBe(200);
    const created = (await state()).events[0]!;
    const res = await change(
      json("PATCH", `/api/email-tracking/${created.id}`, { action: "undo" }),
      context(created.id),
    );
    expect(res.status).toBe(409);
    expect(((await res.json()) as ApiErrorBody).error.message).toMatch(/changed since/);
  });

  it("stores the facts it read and never the email's text", async () => {
    const to = await start();
    await deliver(to, "smartrecruiters-interview.txt");
    const db = await getDb();
    const [row] = await db.select().from(inboundEmails).where(eq(inboundEmails.userId, user.id));
    expect(JSON.stringify(row)).not.toContain("Cyber Towers");
    expect(row).toMatchObject({
      company: "Vantage Retail",
      role: "Store Operations Manager",
      kind: "interview",
    });
  });
});

describe("interview times from email", () => {
  const LUMEN = "Backend Engineer, Payments at Lumen Labs";

  async function deliverText(to: string, subject: string, text: string, auth: WorkerAuth) {
    const headers = { "x-forwarded-for": `${GMAIL} ${to}`, "x-forwarded-to": to };
    const mail = { from: "Lumen Labs <no-reply@greenhouse.io>", subject, date: null, headers };
    return result(
      await POST(
        await inboundRequest(
          to,
          { ...mail, text, messageId: `<${subject}@gh>` },
          { auth, now: Date.now() },
        ),
      ),
    );
  }

  async function undo(subject: string) {
    const event = (await state()).events.find((item) => item.subject === subject)!;
    const res = await change(
      json("PATCH", `/api/email-tracking/${event.id}`, { action: "undo" }),
      context(event.id),
    );
    expect(res.status).toBe(200);
  }

  async function when() {
    const [card] = await cards(user.id);
    return [card?.interviewAt, card?.interviewTime, card?.interviewZone];
  }

  it("keeps the time and zone an email states, never clears a typed time for a day alone, and Undo puts all three back", async () => {
    const to = await start();
    await confirmGmail(to);
    const fromGmail = gmailForward(GMAIL, to);
    expect(await result(await deliver(to, "greenhouse-interview.txt", { auth: fromGmail }))).toBe(
      "created",
    );
    // 10:00 AM PST, as the email wrote it.
    expect(await when()).toEqual([Date.UTC(2026, 10, 24, 18), 600, "America/Los_Angeles"]);

    // The person types their own time: 2:30 PM in India on the 24th.
    vi.setSystemTime(NOW + 60_000);
    const [card] = await cards(user.id);
    const typedDay = Date.UTC(2026, 10, 24, 6, 30);
    const typed = await patchApplication(
      json("PATCH", `/api/applications/${card!.id}`, {
        interviewAt: typedDay,
        interviewTime: 870,
        interviewZone: "Asia/Kolkata",
      }),
      context(card!.id),
    );
    expect(typed.status).toBe(200);

    // Moved to Thursday, no time given: the typed 2:30 PM stays.
    vi.setSystemTime(NOW + 120_000);
    const moved = `Interview rescheduled: ${LUMEN}`;
    expect(
      await deliverText(
        to,
        moved,
        `Hi Priya,\n\nYour interview for ${LUMEN} has been rescheduled to Thursday, November 26, 2026.\n\nThanks,\nLumen Labs Recruiting`,
        fromGmail,
      ),
    ).toBe("dated");
    expect(await when()).toEqual([Date.UTC(2026, 10, 26, 6, 30), 870, "Asia/Kolkata"]);
    await undo(moved);
    expect(await when()).toEqual([typedDay, 870, "Asia/Kolkata"]);

    // A new day and time in another zone replaces all three, and Undo restores all three.
    vi.setSystemTime(NOW + 180_000);
    const timed = `Interview Confirmation: ${LUMEN}`;
    expect(
      await deliverText(
        to,
        timed,
        `Hi Priya,\n\nYour interview for ${LUMEN} is confirmed for Friday, November 27, 2026 at 9:00 AM PST.\n\nThanks,\nLumen Labs Recruiting`,
        fromGmail,
      ),
    ).toBe("dated");
    expect(await when()).toEqual([Date.UTC(2026, 10, 27, 17), 540, "America/Los_Angeles"]);
    await undo(timed);
    expect(await when()).toEqual([typedDay, 870, "Asia/Kolkata"]);
  });

  it("keeps the email's time for one applied from Check this", async () => {
    const to = await start();
    expect(await result(await deliver(to, "greenhouse-interview.txt"))).toBe("pending");
    const [waiting] = (await state()).events;
    const res = await change(
      json("PATCH", `/api/email-tracking/${waiting!.id}`, { action: "apply" }),
      context(waiting!.id),
    );
    expect(res.status).toBe(200);
    expect(await when()).toEqual([Date.UTC(2026, 10, 24, 18), 600, "America/Los_Angeles"]);
  });
});

describe("handles", () => {
  async function check(handle: string): Promise<HandleCheckResponse> {
    const res = await checkHandle(
      new Request(`http://localhost/api/email-tracking/handle?h=${handle}`),
    );
    expect(res.status).toBe(200);
    return (await res.json()) as HandleCheckResponse;
  }

  it("suggests one from the name, checks it as typed, and keeps them unique", async () => {
    expect((await state()).suggestion).toBe("priya");
    expect(await check("priya")).toMatchObject({
      available: true,
      address: "otto+priya@track.ottosensei.com",
    });
    expect(await check("Admin")).toMatchObject({
      available: false,
      problem: "That one is kept for Otto. Try another.",
    });
    expect(await check("pr")).toMatchObject({ available: false });
    await start("priya");
    const rahul = await signInAs("rahul@example.com");
    await setPlan(rahul, "pro");
    expect(await check("priya")).toMatchObject({
      available: false,
      problem: "Someone already has that one.",
    });
    expect((await check("priya")).others[0]).toBe("priya.jobs");
    const taken = await act(
      json("POST", "/api/email-tracking", { action: "start", handle: "priya" }),
    );
    expect(taken.status).toBe(409);
    expect(
      (await act(json("POST", "/api/email-tracking", { action: "start", handle: "support" })))
        .status,
    ).toBe(400);
  });

  it("keeps an old handle taking mail for 14 days and held from others for 90", async () => {
    const first = await start("priya");
    const res = await act(
      json("POST", "/api/email-tracking", { action: "handle", handle: "priya.sharma" }),
    );
    const second = (await state(res)).address!.email;
    expect(second).toBe("otto+priya.sharma@track.ottosensei.com");
    expect(await result(await deliver(first, "ashby-applied.txt"))).toBe("pending");
    vi.setSystemTime(NOW + HANDLE_ROUTES_MS + 1);
    expect((await deliver(first, "ashby-rejected.txt")).status).toBe(404);
    expect(await result(await deliver(second, "ashby-rejected.txt", { messageId: "<n2@x>" }))).toBe(
      "pending",
    );

    const rahul = await setPlan(await signInAs("rahul@example.com"), "pro");
    expect(
      (await act(json("POST", "/api/email-tracking", { action: "start", handle: "priya" }))).status,
    ).toBe(409);
    vi.setSystemTime(NOW + HANDLE_HOLD_MS + 1);
    expect(
      (await act(json("POST", "/api/email-tracking", { action: "start", handle: "priya" }))).status,
    ).toBe(201);
    expect((await state()).address?.handle).toBe("priya");
    void rahul;
  });

  it("stops at once when turned off, and the owner can take the handle back", async () => {
    const to = await start("priya");
    await turnOff(json("DELETE", "/api/email-tracking"));
    expect((await state()).address).toBeNull();
    expect((await deliver(to, "ashby-rejected.txt")).status).toBe(404);
    expect((await state()).suggestion).toBe("priya");
    expect(await start("priya")).toBe(to);
  });

  it("is Pro and trial only: Free gets the upgrade path, and a lapsed plan pauses it", async () => {
    const to = await start();
    await setPlan(user, "trial");
    expect(
      await result(await deliver(to, "ashby-applied.txt", { auth: { dkim: ["ashbyhq.com"] } })),
    ).toBe("created");
    const db = await getDb();
    await db.update(users).set({ plan: "free", trialEndsAt: null }).where(eq(users.id, user.id));
    expect(
      await result(await deliver(to, "ashby-rejected.txt", { auth: { dkim: ["ashbyhq.com"] } })),
    ).toBe("paused");
    expect((await cards(user.id)).map((row) => row.status)).toEqual(["applied"]);
    expect(
      (await act(json("POST", "/api/email-tracking", { action: "handle", handle: "priya2" })))
        .status,
    ).toBe(402);
    expect((await state()).allowed).toBe(false);
  });

  it("limits how much mail one address can send", async () => {
    const to = await start();
    for (let index = 0; index < 40; index++) {
      expect(
        (await deliver(to, "unknown-personal.txt", { messageId: `<n${index}@x>` })).status,
      ).toBe(200);
    }
    expect((await deliver(to, "unknown-personal.txt", { messageId: "<n41@x>" })).status).toBe(429);
  });

  it("hides the feature until the secret is set, and refuses another site's page", async () => {
    useInboundSecrets(false);
    expect((await state()).available).toBe(false);
    expect(
      (await act(json("POST", "/api/email-tracking", { action: "start", handle: "priya" }))).status,
    ).toBe(503);
    useInboundSecrets();
    const res = await act(
      new Request("http://localhost/api/email-tracking", {
        method: "POST",
        headers: { "content-type": "application/json", "sec-fetch-site": "cross-site" },
        body: JSON.stringify({ action: "start", handle: "priya" }),
      }),
    );
    expect(res.status).toBe(403);
  });
});
