import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, fakeAccessToken } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { AUTH_DEADLINE_MS, fetchWithDeadline } from "./deadline";
import { updateSession } from "./proxy";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const SUPABASE_URL = "https://abcdefgh.supabase.co";
const SESSION_COOKIE = "sb-abcdefgh-auth-token";
const USER_ID = "6f1c1b7e-8a3c-4c39-9a51-8f4c6b0f2d11";

// Like a server that took the call and went quiet: it only ends when the signal aborts.
function stalledFetch() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(
    (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) return reject(signal.reason);
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      }),
  );
}

function answeringFetch() {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input) =>
      String(input).endsWith("/.well-known/jwks.json")
        ? Response.json({ keys: [] })
        : Response.json({ id: USER_ID, email: "ada@example.com", aud: "authenticated" }),
    );
}

function sessionCookie(): string {
  const session = {
    access_token: fakeAccessToken(USER_ID),
    refresh_token: "refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: USER_ID, email: "ada@example.com", aud: "authenticated" },
  };
  return `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}

beforeEach(() => {
  cookieJar.clear();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  resetEnvForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("fetchWithDeadline", () => {
  it("gives up on a call that outlives the deadline", async () => {
    stalledFetch();
    const startedAt = Date.now();
    await expect(fetchWithDeadline(30)(`${SUPABASE_URL}/auth/v1/user`)).rejects.toMatchObject({
      name: "TimeoutError",
    });
    expect(Date.now() - startedAt).toBeLessThan(AUTH_DEADLINE_MS);
  });

  it("shares one deadline across calls, so a retry after it gets no fresh time", async () => {
    const fetch = stalledFetch();
    const send = fetchWithDeadline(30);
    await expect(send(`${SUPABASE_URL}/auth/v1/token`)).rejects.toMatchObject({
      name: "TimeoutError",
    });
    const retry = send(`${SUPABASE_URL}/auth/v1/token`);
    expect(fetch.mock.calls[1]?.[1]?.signal?.aborted).toBe(true);
    await expect(retry).rejects.toMatchObject({ name: "TimeoutError" });
  });

  it("keeps the caller's own signal and passes the rest of the call through", async () => {
    const fetch = stalledFetch();
    const caller = new AbortController();
    const call = fetchWithDeadline(60_000)(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: "sb_publishable_test" },
      body: "{}",
      signal: caller.signal,
    });
    caller.abort(new DOMException("The visitor left", "AbortError"));
    await expect(call).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: { apikey: "sb_publishable_test" },
      body: "{}",
    });
  });
});

describe("Supabase clients", () => {
  it("send the request's Auth calls with the deadline", async () => {
    const fetch = answeringFetch();
    cookieJar.set(SESSION_COOKIE, sessionCookie());
    const { createSupabaseServerClient } =
      await vi.importActual<typeof import("./server")>("./server");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase!.auth.getUser();

    expect(error).toBeNull();
    expect(data.user?.id).toBe(USER_ID);
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(`${SUPABASE_URL}/auth/v1/user`);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.signal?.aborted).toBe(false);
  });

  it("include the proxy's, which checks every page request", async () => {
    const fetch = answeringFetch();
    const request = new NextRequest("https://otto.example/dashboard", {
      headers: { cookie: `${SESSION_COOKIE}=${sessionCookie()}` },
    });
    expect((await updateSession(request)).signedIn).toBe(true);
    expect(fetch).toHaveBeenCalled();
    for (const [, init] of fetch.mock.calls) expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});
