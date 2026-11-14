import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { rateLimits } from "@/db/schema";
import { TRANSCRIBE_MODEL } from "@/lib/ai/transcribe";
import type { ApiErrorBody, TranscribeResponse } from "@/lib/api/types";
import { cookieJar, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { DAY_MS } from "@/lib/time";
import { TRANSCRIBE_LIMITS } from "./limits";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const NOW = Date.UTC(2026, 10, 12, 9, 0, 0, 7);
const SPOKEN = "Led a team of five and cut costs by half";
const AUDIO = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4]);

type Clip = { bytes?: Uint8Array; type?: string; name?: string; seconds?: string | null };

function clip({
  bytes = AUDIO,
  type = "audio/webm;codecs=opus",
  name = "speech.webm",
  seconds = "4.2",
}: Clip = {}) {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(bytes)], name, { type }));
  if (seconds !== null) form.append("seconds", seconds);
  return new Request("http://localhost/api/transcribe", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.7" },
    body: form,
  });
}

function providerAnswers(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => Response.json(body, { status }));
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  const body = (await res.json()) as ApiErrorBody;
  expect(body.ok).toBe(false);
  return body.error;
}

async function clipsCounted(userId: string, at = NOW): Promise<number | null> {
  const db = await getDb();
  const [row] = await db
    .select({ count: rateLimits.count })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.key, `transcribe:day:user:${userId}`),
        eq(rateLimits.windowStart, Math.floor(at / DAY_MS) * DAY_MS),
      ),
    );
  return row?.count ?? null;
}

beforeEach(async () => {
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
  resetEnvForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("POST /api/transcribe", () => {
  it("needs a signed-in user and never calls the provider without one", async () => {
    const fetch = providerAnswers(200, { text: SPOKEN });
    const res = await POST(clip());
    expect(res.status).toBe(401);
    expect(await errorOf(res)).toEqual({
      code: "unauthorized",
      message: "Sign in to talk to Otto.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a post from another website", async () => {
    await signInAs();
    const req = clip();
    req.headers.set("sec-fetch-site", "cross-site");
    expect((await POST(req)).status).toBe(403);
  });

  it("sends the clip to Whisper on OpenRouter and returns only the text", async () => {
    await signInAs();
    const fetch = providerAnswers(200, {
      text: `  ${SPOKEN} `,
      usage: { seconds: 4.2, cost: 0.00002 },
    });
    const res = await POST(clip());

    expect(res.status).toBe(200);
    expect((await res.json()) as TranscribeResponse).toEqual({ ok: true, text: SPOKEN });
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://openrouter.ai/api/v1/audio/transcriptions");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer sk-or-test");
    expect(JSON.parse(String(init?.body))).toEqual({
      model: TRANSCRIBE_MODEL,
      input_audio: { data: Buffer.from(AUDIO).toString("base64"), format: "webm" },
      provider: { data_collection: "deny" },
    });
    expect(TRANSCRIBE_MODEL).toBe("openai/whisper-large-v3-turbo");
  });

  it("names Safari's mp4 and Firefox's ogg clips for the provider", async () => {
    await signInAs();
    const fetch = providerAnswers(200, { text: SPOKEN });
    expect((await POST(clip({ type: "audio/mp4", name: "speech.mp4" }))).status).toBe(200);
    expect((await POST(clip({ type: "audio/ogg;codecs=opus", name: "speech.ogg" }))).status).toBe(
      200,
    );
    expect((await POST(clip({ type: "", name: "speech.wav" }))).status).toBe(200);
    const formats = fetch.mock.calls.map(
      ([, init]) => JSON.parse(String(init?.body)).input_audio.format,
    );
    expect(formats).toEqual(["mp4", "ogg", "wav"]);
  });

  it("never logs the transcript or the audio", async () => {
    await signInAs();
    providerAnswers(200, { text: SPOKEN, usage: { seconds: 4.2 } });
    const sinks = [
      vi.spyOn(console, "info"),
      vi.spyOn(console, "warn"),
      vi.spyOn(console, "error"),
    ];
    await POST(clip());
    const written = JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));
    expect(written).toContain("transcribe.completed");
    expect(written).not.toContain("Led a team");
    expect(written).not.toContain(Buffer.from(AUDIO).toString("base64"));
  });

  it("says nothing was heard when the text comes back empty", async () => {
    await signInAs();
    providerAnswers(200, { text: "  ", usage: { seconds: 2 } });
    const res = await POST(clip());
    expect(res.status).toBe(422);
    expect((await errorOf(res)).code).toBe("no_speech");
  });

  it("returns the usual unavailable error without calling anyone when AI is off", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    resetEnvForTests();
    await signInAs();
    const fetch = providerAnswers(200, { text: SPOKEN });
    const res = await POST(clip());
    expect(res.status).toBe(502);
    expect((await errorOf(res)).code).toBe("ai_unavailable");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a clip over 5 MB before calling the provider", async () => {
    await signInAs();
    const fetch = providerAnswers(200, { text: SPOKEN });
    const res = await POST(clip({ bytes: new Uint8Array(TRANSCRIBE_LIMITS.maxBytes + 1) }));
    expect(res.status).toBe(413);
    expect((await errorOf(res)).code).toBe("too_large");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a recording over 2 minutes, a missing length, a non-audio file and a non-form body", async () => {
    await signInAs();
    const fetch = providerAnswers(200, { text: SPOKEN });
    expect((await POST(clip({ seconds: "180" }))).status).toBe(413);
    expect((await POST(clip({ seconds: null }))).status).toBe(400);
    expect((await POST(clip({ bytes: new Uint8Array(0) }))).status).toBe(400);
    expect((await POST(clip({ type: "text/plain", name: "notes.txt" }))).status).toBe(415);
    const json = new Request("http://localhost/api/transcribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ audio: "..." }),
    });
    expect((await POST(json)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it(`allows ${TRANSCRIBE_LIMITS.burst.calls} clips per 10 minutes, then asks for a break`, async () => {
    await setPlan(await signInAs(), "pro");
    const fetch = providerAnswers(200, { text: SPOKEN });
    for (let i = 0; i < TRANSCRIBE_LIMITS.burst.calls; i++)
      expect((await POST(clip())).status).toBe(200);

    const res = await POST(clip());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("600");
    expect(await errorOf(res)).toEqual({
      code: "rate_limited",
      message: "That's a lot of voice typing at once. Try again in 10 minutes.",
    });
    expect(fetch).toHaveBeenCalledTimes(TRANSCRIBE_LIMITS.burst.calls);

    vi.setSystemTime(NOW + TRANSCRIBE_LIMITS.burst.windowMs);
    expect((await POST(clip())).status).toBe(200);
  });

  it.each([
    ["free", 5, "You've used today's 5 voice clips. Try again in 15 hours. Pro has 30 a day."],
    ["pro", 30, "You've used today's 30 voice clips. Try again in 15 hours."],
    ["max", 60, "You've used today's 60 voice clips. Try again in 15 hours."],
  ] as const)("stops %s at %i clips a day", async (plan, perDay, message) => {
    const signedIn = await signInAs();
    const user = plan === "free" ? signedIn : await setPlan(signedIn, plan);
    expect(TRANSCRIBE_LIMITS.daily.calls[plan]).toBe(perDay);
    const db = await getDb();
    await db.insert(rateLimits).values({
      key: `transcribe:day:user:${user.id}`,
      windowStart: Math.floor(NOW / DAY_MS) * DAY_MS,
      count: perDay,
    });
    const fetch = providerAnswers(200, { text: SPOKEN });
    const res = await POST(clip());
    expect(res.status).toBe(429);
    expect((await errorOf(res)).message).toBe(message);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("counts a clip toward the day only once it passes the checks", async () => {
    const user = await signInAs();
    const fetch = providerAnswers(200, { text: SPOKEN });
    for (let i = 0; i < TRANSCRIBE_LIMITS.daily.calls.free + 1; i++) {
      expect((await POST(clip({ seconds: "180" }))).status).toBe(413);
      expect((await POST(clip({ type: "text/plain", name: "notes.txt" }))).status).toBe(415);
    }
    expect(await clipsCounted(user.id)).toBeNull();
    expect((await POST(clip())).status).toBe(200);
    expect(await clipsCounted(user.id)).toBe(1);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("gives the clip back when the provider is down, so an outage never uses up the day", async () => {
    const user = await signInAs();
    const down = providerAnswers(503, { error: { code: 503, message: "No provider" } });
    for (let i = 0; i < TRANSCRIBE_LIMITS.daily.calls.free + 2; i++) {
      expect((await POST(clip())).status).toBe(502);
    }
    expect(await clipsCounted(user.id)).toBe(0);
    down.mockImplementation(async () => Response.json({ text: SPOKEN }));
    expect((await POST(clip())).status).toBe(200);
    expect(await clipsCounted(user.id)).toBe(1);
  });

  it("gives back audio the provider rejected only 3 times a day", async () => {
    const user = await signInAs();
    providerAnswers(400, { error: { code: 400, message: "Unsupported format" } });
    for (let i = 0; i < 5; i++) expect((await POST(clip())).status).toBe(502);
    expect(await clipsCounted(user.id)).toBe(2);
  });

  it("gives a clip back to the day it was counted in", async () => {
    const user = await signInAs();
    const lastSecond = Date.UTC(2026, 10, 12, 23, 59, 59, 500);
    vi.setSystemTime(lastSecond);
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      vi.setSystemTime(lastSecond + 1_000);
      return Response.json({ error: { code: 503, message: "No provider" } }, { status: 503 });
    });
    expect((await POST(clip())).status).toBe(502);
    expect(await clipsCounted(user.id, lastSecond)).toBe(0);
    expect(await clipsCounted(user.id, lastSecond + 1_000)).toBeNull();
  });

  it.each([
    [402, { error: { code: 402, message: "Insufficient credits" } }, 502, "ai_unavailable"],
    [429, { error: { code: 429, message: "Rate limited" } }, 502, "ai_unavailable"],
    [503, { error: { code: 503, message: "No provider" } }, 502, "ai_unavailable"],
    [400, { error: { code: 400, message: "Unsupported format" } }, 502, "ai_unavailable"],
    [413, { error: { code: 413, message: "Too large" } }, 413, "too_large"],
    [200, { error: { code: 502, message: "Upstream failed" } }, 502, "ai_unavailable"],
    [200, { nothing: true, usage: "?" }, 502, "ai_unavailable"],
  ])("maps a provider %i answer to our own error", async (status, body, expectedStatus, code) => {
    await signInAs();
    providerAnswers(status, body);
    const res = await POST(clip());
    expect(res.status).toBe(expectedStatus);
    expect((await errorOf(res)).code).toBe(code);
  });

  it("gives up after 30 seconds with the plain failure message", async () => {
    await signInAs();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    const res = await POST(clip());
    expect(res.status).toBe(502);
    expect(await errorOf(res)).toEqual({
      code: "ai_unavailable",
      message: "Couldn't turn that into text. Try again, or type instead.",
    });
  });
});
