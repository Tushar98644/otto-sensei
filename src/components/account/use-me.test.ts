import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MeResponse } from "@/lib/api/types";
import type { SessionUser } from "@/lib/auth/types";
import type { Me } from "./use-me";

const api = vi.hoisted(() => ({ me: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));

const jar = vi.hoisted(() => ({ values: new Map<string, string>(), written: [] as string[] }));
vi.stubGlobal("location", { protocol: "https:" });
vi.stubGlobal("document", {
  get cookie() {
    return [...jar.values].map(([name, value]) => `${name}=${value}`).join("; ");
  },
  set cookie(line: string) {
    jar.written.push(line);
    const [pair = "", ...attributes] = line.split("; ");
    const [name = "", value = ""] = pair.split("=");
    if (attributes.includes("Max-Age=0")) jar.values.delete(name);
    else jar.values.set(name, value);
  },
});

const ADA: SessionUser = {
  id: "6f1c1b7e-8a3c-4c39-9a51-8f4c6b0f2d11",
  email: "ada@example.com",
  plan: "pro",
  planInterval: "month",
  planRenewsAt: null,
};

function payload(user: SessionUser | null): Me {
  return {
    user,
    usage: null,
    period: null,
    aiBudget: null,
    billing: { mode: "mock", offer: { pro: ["month"], max: ["month"] }, trial: false },
    auth: { mode: "supabase" },
  };
}

const answer = (user: SessionUser | null): MeResponse => ({ ok: true, ...payload(user) });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

// The store lives in the module, so every test starts a fresh page.
async function freshPage() {
  vi.resetModules();
  return import("./use-me");
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.clearAllMocks();
  jar.values.clear();
  jar.written = [];
});

describe("useMe on the sales pages", () => {
  it("takes a visitor without the session hint as signed out at once and asks nobody", async () => {
    const store = await freshPage();
    for (const path of ["/", "/pricing", "/privacy", "/terms", "/refunds", "/acceptable-use"]) {
      store.loadMeFor(path);
      expect(store.viewOf(store.meSnapshot(), path)).toMatchObject({
        me: null,
        user: null,
        loading: false,
      });
    }
    expect(api.me).not.toHaveBeenCalled();
  });

  it("shows /login's form at once, still asks in the background, and lets a sign-in patch the answer", async () => {
    const store = await freshPage();
    const reply = deferred<MeResponse>();
    api.me.mockReturnValue(reply.promise);

    store.loadMeFor("/login");
    store.loadMeFor("/login");
    expect(api.me).toHaveBeenCalledTimes(1);
    expect(store.viewOf(store.meSnapshot(), "/login").loading).toBe(false);

    reply.resolve(answer(null));
    await settle();
    expect(store.viewOf(store.meSnapshot(), "/login")).toMatchObject({ user: null, loading: false });
    expect(store.meSnapshot().me?.auth.mode).toBe("supabase");

    store.patchMe({ user: ADA });
    expect(store.viewOf(store.meSnapshot(), "/login").user).toEqual(ADA);
  });

  it("asks, and waits for the answer, when the browser has the session hint", async () => {
    jar.values.set("otto_si", "1");
    const store = await freshPage();
    const reply = deferred<MeResponse>();
    api.me.mockReturnValue(reply.promise);

    store.loadMeFor("/pricing");
    expect(api.me).toHaveBeenCalledTimes(1);
    expect(store.viewOf(store.meSnapshot(), "/pricing").loading).toBe(true);

    reply.resolve(answer(ADA));
    await settle();
    expect(store.viewOf(store.meSnapshot(), "/pricing")).toMatchObject({ user: ADA, loading: false });
  });

  it("never asks on home, where the proxy has already sent signed-in visitors on", async () => {
    jar.values.set("otto_si", "1");
    const store = await freshPage();
    store.loadMeFor("/");
    expect(api.me).not.toHaveBeenCalled();
    expect(store.viewOf(store.meSnapshot(), "/").loading).toBe(false);
  });
});

describe("useMe on app pages", () => {
  it("asks and waits, as before", async () => {
    const store = await freshPage();
    api.me.mockResolvedValue(answer(ADA));
    store.loadMeFor("/studio");
    expect(api.me).toHaveBeenCalledTimes(1);
    expect(store.viewOf(store.meSnapshot(), "/studio").loading).toBe(true);
    await settle();
    expect(store.signedInUserId()).toBe(ADA.id);
  });

  it("treats a sales page's guess as unknown once the visitor moves on to the app, and asks", async () => {
    const store = await freshPage();
    const reply = deferred<MeResponse>();
    api.me.mockReturnValue(reply.promise);
    store.loadMeFor("/pricing");
    expect(store.viewOf(store.meSnapshot(), "/studio").loading).toBe(true);

    store.loadMeFor("/studio");
    expect(api.me).toHaveBeenCalledTimes(1);
    expect(store.viewOf(store.meSnapshot(), "/studio").loading).toBe(true);

    reply.resolve(answer(null));
    await settle();
    expect(store.viewOf(store.meSnapshot(), "/studio")).toMatchObject({ user: null, loading: false });
  });
});

describe("answers asked for before a sign-in or sign-out", () => {
  it("are dropped: a sign-in on /login before its background answer arrives asks again", async () => {
    const store = await freshPage();
    const early = deferred<MeResponse>();
    const late = deferred<MeResponse>();
    api.me.mockReturnValueOnce(early.promise).mockReturnValueOnce(late.promise);

    store.loadMeFor("/login");
    store.patchMe({ user: ADA });
    const refreshing = store.refreshMe();
    expect(api.me).toHaveBeenCalledTimes(2);

    early.resolve(answer(null));
    await settle();
    expect(store.meSnapshot().me).toBeNull();

    late.resolve(answer(ADA));
    await refreshing;
    expect(store.signedInUserId()).toBe(ADA.id);
    expect(api.me).toHaveBeenCalledTimes(2);
  });

  it("are dropped without a third request when a fresher answer has already landed", async () => {
    const store = await freshPage();
    const early = deferred<MeResponse>();
    api.me.mockReturnValueOnce(early.promise).mockResolvedValueOnce(answer(ADA));

    store.loadMeFor("/login");
    store.patchMe({ user: ADA });
    await store.refreshMe();
    expect(store.signedInUserId()).toBe(ADA.id);

    early.resolve(answer(null));
    await settle();
    expect(api.me).toHaveBeenCalledTimes(2);
    expect(store.signedInUserId()).toBe(ADA.id);
  });

  it("are dropped on sign-out, so a signed-in answer asked before it can't sign the visitor back in", async () => {
    const store = await freshPage();
    store.seedMe(payload(ADA));
    const early = deferred<MeResponse>();
    api.me.mockReturnValueOnce(early.promise).mockResolvedValueOnce(answer(null));

    void store.refreshMe();
    store.patchMe({ user: null, usage: null, period: null });
    const after = store.refreshMe();
    early.resolve(answer(ADA));
    await after;
    await settle();
    expect(store.signedInUserId()).toBeNull();
    expect(api.me).toHaveBeenCalledTimes(2);
  });

  it("still settle the store when nobody asked again", async () => {
    const store = await freshPage();
    const first = deferred<MeResponse>();
    api.me.mockReturnValueOnce(first.promise).mockResolvedValueOnce(answer(ADA));

    store.loadMeFor("/studio");
    store.patchMe({ usage: null });
    first.resolve(answer(null));
    await settle();
    expect(api.me).toHaveBeenCalledTimes(2);
    expect(store.viewOf(store.meSnapshot(), "/studio")).toMatchObject({ user: ADA, loading: false });
  });
});

describe("the session hint", () => {
  it("is set when the store learns of a signed-in account and cleared when it signs out", async () => {
    const store = await freshPage();
    api.me.mockResolvedValue(answer(ADA));
    store.loadMeFor("/studio");
    await settle();
    expect(jar.values.get("otto_si")).toBe("1");
    expect(jar.written).toEqual(["otto_si=1; Max-Age=34560000; Path=/; SameSite=Lax; Secure"]);

    store.patchMe({ usage: null });
    expect(jar.written).toHaveLength(1);

    store.patchMe({ user: null, usage: null, period: null });
    expect(jar.values.has("otto_si")).toBe(false);
  });

  it("is cleared when /api/me says the session is gone", async () => {
    jar.values.set("otto_si", "1");
    const store = await freshPage();
    api.me.mockResolvedValue(answer(null));
    store.loadMeFor("/pricing");
    await settle();
    expect(jar.values.has("otto_si")).toBe(false);
  });

  it("is left alone when /api/me can't be reached", async () => {
    jar.values.set("otto_si", "1");
    const store = await freshPage();
    api.me.mockRejectedValue(new Error("offline"));
    store.loadMeFor("/pricing");
    await settle();
    expect(jar.values.get("otto_si")).toBe("1");
    expect(store.viewOf(store.meSnapshot(), "/pricing")).toMatchObject({ me: null, loading: false });
  });
});

describe("seedMe", () => {
  it("fills an empty store from the dashboard layout's answer, so nobody asks /api/me", async () => {
    const store = await freshPage();
    const me = payload(ADA);
    store.seedMe(me);
    store.loadMeFor("/dashboard");
    expect(api.me).not.toHaveBeenCalled();
    expect(store.signedInUserId()).toBe(ADA.id);
    expect(store.viewOf(store.meSnapshot(), "/dashboard")).toMatchObject({ me, loading: false });
    expect(jar.values.get("otto_si")).toBe("1");
  });

  it("never replaces what the store already knows, such as a sign-out", async () => {
    const store = await freshPage();
    const me = payload(ADA);
    store.seedMe(me);
    store.patchMe({ user: null, usage: null, period: null });
    store.seedMe(me);
    expect(store.signedInUserId()).toBeNull();
  });
});
