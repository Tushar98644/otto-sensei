import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { KnownResumes, PutResumeResult, ResumeList } from "./api-types";

const USER = "user-1";
const DEBOUNCE_MS = 5_000;

const api = vi.hoisted(() => ({
  listResumes: vi.fn(),
  putResume: vi.fn(),
  deleteResume: vi.fn(),
  logout: vi.fn(),
}));
const me = vi.hoisted(() => ({
  user: null as { id: string; plan: string } | null,
  loading: false,
  signedIn: null as string | null,
  refreshMe: vi.fn(async () => {}),
}));
const toast = vi.hoisted(() => vi.fn());
const resetUser = vi.hoisted(() => vi.fn());

// Each name is one mounted component: an effect runs again only when its deps change, after its cleanup.
const react = vi.hoisted(() => {
  type Slot = { deps?: readonly unknown[]; cleanup?: void | (() => void) };
  type Subscribe = (listener: () => void) => () => void;
  const components = new Map<string, Slot[]>();
  let slots: Slot[] = [];
  let index = 0;
  const same = (a: readonly unknown[], b: readonly unknown[]) =>
    a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const subscribed: Subscribe[] = [];
  const mode = { server: false };
  return {
    mode,
    lastSubscribe: () => subscribed.at(-1)!,
    useSyncExternalStore(
      subscribe: Subscribe,
      snapshot: () => unknown,
      serverSnapshot: () => unknown,
    ) {
      subscribed.push(subscribe);
      return mode.server ? serverSnapshot() : snapshot();
    },
    render<T>(name: string, hook: () => T): T {
      if (!components.has(name)) components.set(name, []);
      slots = components.get(name)!;
      index = 0;
      return hook();
    },
    useEffect(effect: () => void | (() => void), deps?: readonly unknown[]) {
      const slot = (slots[index++] ??= {});
      if (slot.deps && deps && same(slot.deps, deps)) return;
      if (typeof slot.cleanup === "function") slot.cleanup();
      slot.deps = deps;
      slot.cleanup = effect();
    },
    unmount() {
      for (const mounted of components.values()) {
        for (const slot of mounted) if (typeof slot.cleanup === "function") slot.cleanup();
      }
      components.clear();
      subscribed.length = 0;
      mode.server = false;
    },
  };
});

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: react.useEffect,
  useSyncExternalStore: react.useSyncExternalStore,
}));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));
vi.mock("@/components/account/use-me", () => ({
  refreshMe: me.refreshMe,
  signedInUserId: () => me.signedIn,
  useMe: () => ({ user: me.user, loading: me.loading }),
}));
vi.mock("@/components/ui/toast", () => ({ toast }));
vi.mock("@/lib/analytics/client", () => ({ resetUser }));

function browser() {
  const values = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const target = () => {
    const listeners = new Map<string, Set<() => void>>();
    return {
      addEventListener: (type: string, listener: () => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(listener);
      },
      removeEventListener: (type: string, listener: () => void) => {
        listeners.get(type)?.delete(listener);
      },
      fire: (type: string) => {
        for (const listener of [...(listeners.get(type) ?? [])]) listener();
      },
    };
  };
  const win = target();
  const doc = { ...target(), visibilityState: "visible" as "visible" | "hidden" };
  vi.stubGlobal("window", { localStorage, ...win });
  vi.stubGlobal("document", doc);
  return { localStorage, win, doc };
}

// The account's resume routes, answering as they do.
function account(initial: Resume[] = [], deletedIds: string[] = []) {
  const cloud = new Map(initial.map((r) => [r.id, structuredClone(r)]));
  api.listResumes
    .mockReset()
    .mockImplementation(async (known?: KnownResumes): Promise<ResumeList> => {
      const all = [...cloud.values()];
      const same = (r: Resume) => known?.[r.id] === r.updatedAt;
      return {
        ok: true,
        resumes: all.filter((r) => !same(r)).map((r) => structuredClone(r)),
        deletedIds,
        unchanged: all.filter(same).map((r) => r.id),
      };
    });
  api.putResume.mockReset().mockImplementation(async (next: Resume): Promise<PutResumeResult> => {
    cloud.set(next.id, structuredClone(next));
    return { ok: true, deleted: false };
  });
  api.deleteResume.mockReset().mockImplementation(async (id: string) => {
    cloud.delete(id);
    return { ok: true };
  });
  api.logout.mockReset().mockResolvedValue({ ok: true });
  return cloud;
}

type Dom = ReturnType<typeof browser>;

// A fresh page load: the studio store and the sync session start over.
async function page(
  local: Resume[] = [],
  { hydrate = true, dom = browser() }: { hydrate?: boolean; dom?: Dom } = {},
) {
  vi.resetModules();
  const { flushStudio, useStudioStore } = await import("@/lib/store/resume-store");
  const { createLedger } = await import("./ledger");
  const { ApiClientError } = await import("@/lib/api/client");
  const hooks = await import("./use-cloud-sync");
  if (hydrate) await useStudioStore.persist.rehydrate();
  for (const resume of local) useStudioStore.getState().addResume(resume);
  const store = () => useStudioStore.getState();
  const edit = (id: string, title: string) => store().updateResume(id, (r) => ({ ...r, title }));
  const mount = (signedInAs?: string) =>
    react.render("studio", () => hooks.useCloudSync(signedInAs));
  return {
    ...dom,
    ...hooks,
    dom,
    ApiClientError,
    store,
    edit,
    mount,
    flushStudio,
    hydrate: () => useStudioStore.persist.rehydrate(),
    ledger: createLedger(dom.localStorage),
    backup: (id: string | null) => react.render("badge", () => hooks.useBackup(id)),
    pending: (serverUserId?: string | null) =>
      react.render("gate", () => hooks.useFirstLoadPending(serverUserId)),
  };
}

function gate() {
  let open = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { opened, open };
}

function resume(title: string, updatedAt: number): Resume {
  return { ...emptyResume(updatedAt), title };
}

const signIn = (plan = "free") => {
  me.user = { id: USER, plan };
  me.loading = false;
  me.signedIn = USER;
};

beforeEach(() => {
  vi.useFakeTimers();
  me.user = null;
  me.loading = false;
  me.signedIn = null;
  me.refreshMe.mockClear();
  toast.mockReset();
  resetUser.mockReset();
  account();
});

afterEach(() => {
  react.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useCloudSync", () => {
  it("backs up the browser's resumes only once the studio has loaded them", async () => {
    const mine = resume("Draft", 1_000);
    const cloud = account();
    const before = await page([mine]);
    before.flushStudio();
    const p = await page([], { hydrate: false, dom: before.dom });
    signIn();

    p.mount();
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(api.listResumes).not.toHaveBeenCalled();
    expect(p.backup(mine.id)).toBe("local");
    expect(p.store().resumes[mine.id]?.title).toBe("Draft");

    p.mount();
    await vi.advanceTimersByTimeAsync(0);

    expect(api.listResumes).toHaveBeenCalledExactlyOnceWith({ [mine.id]: 1_000 });
    expect(cloud.get(mine.id)?.title).toBe("Draft");
    expect(p.backup(mine.id)).toBe("saved");
    expect(p.backup(null)).toBe("local");
  });

  it("starts at once for a user the server already checked, without waiting on /api/me", async () => {
    const mine = resume("Draft", 1_000);
    const cloud = account();
    const p = await page([mine]);
    me.loading = true;

    p.mount(USER);
    await vi.advanceTimersByTimeAsync(0);
    expect(cloud.has(mine.id)).toBe(true);

    signIn();
    p.mount(USER);
    await vi.advanceTimersByTimeAsync(0);
    expect(api.listResumes).toHaveBeenCalledOnce();
  });

  it("sends nothing while signed out", async () => {
    const p = await page([resume("Draft", 1_000)]);

    p.mount();
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

    expect(api.listResumes).not.toHaveBeenCalled();
    expect(api.putResume).not.toHaveBeenCalled();
  });
});

describe("useCloudSync's early list", () => {
  async function ownedPage(...local: Resume[]) {
    const p = await page(local);
    p.ledger.claim(
      local.map((r) => r.id),
      USER,
    );
    return p;
  }

  it("uses the list asked for alongside /api/me instead of asking twice", async () => {
    const mine = resume("Mine", 1_000);
    const fromLaptop = resume("From the laptop", 2_000);
    account([mine, fromLaptop]);
    const p = await ownedPage(mine);
    me.loading = true;
    p.mount();
    expect(api.listResumes).toHaveBeenCalledExactlyOnceWith({ [mine.id]: 1_000 });

    signIn();
    p.mount();
    await vi.advanceTimersByTimeAsync(0);

    expect(api.listResumes).toHaveBeenCalledOnce();
    expect(p.store().resumes[fromLaptop.id]?.title).toBe("From the laptop");
  });

  it("asks again when the early list failed", async () => {
    const mine = resume("Mine", 1_000);
    const fromLaptop = resume("From the laptop", 2_000);
    account([mine, fromLaptop]);
    api.listResumes.mockRejectedValueOnce(new Error("offline"));
    const p = await ownedPage(mine);
    me.loading = true;
    p.mount();

    signIn();
    p.mount();
    await vi.advanceTimersByTimeAsync(0);

    expect(api.listResumes).toHaveBeenCalledTimes(2);
    expect(api.listResumes).toHaveBeenLastCalledWith({ [mine.id]: 1_000 });
    expect(p.store().resumes[fromLaptop.id]?.title).toBe("From the laptop");
  });

  it("asks again when the browser's copies changed after the early list", async () => {
    const mine = resume("Mine", 1_000);
    account([mine]);
    const p = await ownedPage(mine);
    me.loading = true;
    p.mount();

    p.edit(mine.id, "Edited while /api/me loaded");
    const edited = p.store().resumes[mine.id]!.updatedAt;
    signIn();
    p.mount();
    await vi.advanceTimersByTimeAsync(0);

    expect(api.listResumes.mock.calls).toEqual([[{ [mine.id]: 1_000 }], [{ [mine.id]: edited }]]);
  });

  it("drops the early list once /api/me says signed out", async () => {
    const mine = resume("Mine", 1_000);
    account([mine]);
    const p = await ownedPage(mine);
    me.loading = true;
    p.mount();

    me.loading = false;
    p.mount();
    signIn();
    p.mount();
    await vi.advanceTimersByTimeAsync(0);

    expect(api.listResumes).toHaveBeenCalledTimes(2);
  });
});

describe("useCloudSync and the page's life", () => {
  async function signedInPage() {
    const mine = resume("Draft", 1_000);
    const cloud = account([mine]);
    const p = await page([mine]);
    signIn();
    p.mount();
    await vi.advanceTimersByTimeAsync(0);
    api.putResume.mockClear();
    api.listResumes.mockClear();
    return { ...p, mine, cloud };
  }

  it("sends unsaved edits at once as the page hides or closes", async () => {
    const p = await signedInPage();

    p.edit(p.mine.id, "Hidden");
    p.doc.visibilityState = "hidden";
    p.doc.fire("visibilitychange");
    expect(api.putResume).toHaveBeenLastCalledWith(expect.objectContaining({ title: "Hidden" }), {
      base: 1_000,
      keepalive: true,
    });

    await vi.advanceTimersByTimeAsync(0);
    p.edit(p.mine.id, "Closed");
    p.win.fire("pagehide");
    expect(api.putResume).toHaveBeenCalledTimes(2);
    expect(api.putResume).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: "Closed" }),
      expect.objectContaining({ keepalive: true }),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(p.cloud.get(p.mine.id)?.title).toBe("Closed");
  });

  it("reads the account again on coming back, but only after half a minute away", async () => {
    const p = await signedInPage();

    p.doc.visibilityState = "visible";
    p.doc.fire("visibilitychange");
    await vi.advanceTimersByTimeAsync(0);
    expect(api.listResumes).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(30_000);
    p.doc.fire("visibilitychange");
    await vi.advanceTimersByTimeAsync(0);
    expect(api.listResumes).toHaveBeenCalledOnce();
  });

  it("deletes a resume removed in the studio from the account", async () => {
    const p = await signedInPage();

    p.store().removeResume(p.mine.id);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(api.deleteResume).toHaveBeenCalledExactlyOnceWith(p.mine.id);
    expect(p.cloud.has(p.mine.id)).toBe(false);
  });

  it("re-renders the backup badge as the backup changes, until it stops listening", async () => {
    const p = await signedInPage();
    expect(p.backup(p.mine.id)).toBe("saved");
    const listener = vi.fn();
    const unsubscribe = react.lastSubscribe()(listener);

    p.edit(p.mine.id, "Edited");
    expect(listener).toHaveBeenCalled();
    expect(p.backup(p.mine.id)).toBe("saving");
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(p.backup(p.mine.id)).toBe("saved");

    unsubscribe();
    listener.mockClear();
    p.edit(p.mine.id, "Edited again");
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(listener).not.toHaveBeenCalled();
  });

  it("renders as local and still loading on the server, so the first browser render matches", async () => {
    const p = await signedInPage();
    expect(p.backup(p.mine.id)).toBe("saved");
    expect(p.pending()).toBe(false);

    react.mode.server = true;
    expect(p.backup(p.mine.id)).toBe("local");
    expect(p.pending()).toBe(true);
  });

  it("sends a waiting edit as soon as the connection comes back", async () => {
    const p = await signedInPage();

    p.edit(p.mine.id, "Typed offline");
    p.win.fire("online");
    await vi.advanceTimersByTimeAsync(0);

    expect(api.putResume).toHaveBeenCalledOnce();
    expect(p.cloud.get(p.mine.id)?.title).toBe("Typed offline");
  });

  it("stops listening once unmounted, while the session still sends edits after the pause", async () => {
    const p = await signedInPage();

    react.unmount();
    p.edit(p.mine.id, "After the studio closed");
    p.win.fire("online");
    p.win.fire("pagehide");
    await vi.advanceTimersByTimeAsync(0);
    expect(api.putResume).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(p.cloud.get(p.mine.id)?.title).toBe("After the studio closed");
  });

  it("gives a resume the plan turned away another try after an upgrade", async () => {
    const old = resume("Old", 1_000);
    const extra = resume("Second resume", 2_000);
    const cloud = account([old]);
    const p = await page([old, extra]);
    signIn("free");
    const put = api.putResume.getMockImplementation()!;
    api.putResume.mockImplementationOnce(async () => {
      throw new p.ApiClientError("upgrade_required", "Try Pro.", 402);
    });
    p.mount();
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);
    expect(api.putResume).toHaveBeenCalledOnce();
    expect(p.backup(extra.id)).toBe("local");

    api.putResume.mockImplementation(put);
    signIn("pro");
    p.mount();
    await vi.advanceTimersByTimeAsync(0);

    expect(api.putResume).toHaveBeenCalledTimes(2);
    expect(cloud.get(extra.id)?.title).toBe("Second resume");
    expect(p.backup(extra.id)).toBe("saved");
  });
});

describe("useCloudSync's notices", () => {
  it("says so when the open resume was deleted on another device", async () => {
    const open = resume("Open", 1_000);
    account([], [open.id]);
    const p = await page([open]);
    signIn();

    p.mount();
    await vi.advanceTimersByTimeAsync(0);

    expect(p.store().resumes[open.id]).toBeUndefined();
    expect(toast).toHaveBeenCalledExactlyOnceWith({
      title: "Resume deleted on another device",
      description: "It's been removed here too, so your devices match.",
    });
  });

  it("says nothing when the resume deleted elsewhere wasn't the open one", async () => {
    const background = resume("Background", 1_000);
    const open = resume("Open", 1_000);
    account([open], [background.id]);
    const p = await page([background, open]);
    p.store().setActive(open.id);
    signIn();

    p.mount();
    await vi.advanceTimersByTimeAsync(0);

    expect(p.store().resumes[background.id]).toBeUndefined();
    expect(toast).not.toHaveBeenCalled();
  });

  it("says so when a resume changed on two devices, and keeps both", async () => {
    const here = resume("Edited on the phone", 2_000);
    account([{ ...here, title: "Edited on the laptop", updatedAt: 3_000 }]);
    const p = await page([here]);
    p.ledger.claim([here.id], USER);
    p.ledger.markSynced([[here.id, 1_000]]);
    signIn();

    p.mount();
    await vi.advanceTimersByTimeAsync(0);

    expect(toast).toHaveBeenCalledExactlyOnceWith({
      title: "Resume changed on two devices",
      description: "We kept both. The other copy is in its saved versions.",
    });
    expect(p.store().versions[here.id]).toHaveLength(1);
  });
});

describe("useCloudSync after the session expires", () => {
  it("starts again when /api/me still has the same person", async () => {
    const mine = resume("Draft", 1_000);
    const cloud = account();
    const p = await page([mine]);
    api.listResumes.mockRejectedValueOnce(new p.ApiClientError("unauthorized", "Sign in.", 401));
    signIn();

    p.mount();
    await vi.advanceTimersByTimeAsync(0);

    expect(me.refreshMe).toHaveBeenCalledOnce();
    expect(api.listResumes).toHaveBeenCalledTimes(2);
    expect(cloud.get(mine.id)?.title).toBe("Draft");
    expect(p.backup(mine.id)).toBe("saved");
  });

  it("stays stopped when the person really was signed out", async () => {
    const mine = resume("Draft", 1_000);
    const p = await page([mine]);
    api.listResumes.mockRejectedValueOnce(new p.ApiClientError("unauthorized", "Sign in.", 401));
    signIn();
    me.signedIn = null;

    p.mount();
    await vi.advanceTimersByTimeAsync(120_000);

    expect(api.listResumes).toHaveBeenCalledOnce();
    expect(api.putResume).not.toHaveBeenCalled();
    expect(p.backup(mine.id)).toBe("local");
  });

  it("starts again at most once in five minutes", async () => {
    const p = await page([resume("Draft", 1_000)]);
    api.listResumes.mockRejectedValue(new p.ApiClientError("unauthorized", "Sign in.", 401));
    signIn();

    p.mount();
    await vi.advanceTimersByTimeAsync(120_000);

    expect(me.refreshMe).toHaveBeenCalledTimes(2);
    expect(api.listResumes).toHaveBeenCalledTimes(2);
  });
});

describe("useFirstLoadPending", () => {
  it("waits while the studio loads, and while /api/me hasn't said who is signed in", async () => {
    const p = await page([], { hydrate: false });
    expect(p.pending()).toBe(true);

    await p.hydrate();
    me.loading = true;
    expect(p.pending()).toBe(true);

    me.loading = false;
    expect(p.pending()).toBe(false);
  });

  it("waits for the account's first read when signed in", async () => {
    const p = await page([resume("Draft", 1_000)]);
    const answered = gate();
    const list = api.listResumes.getMockImplementation()!;
    api.listResumes.mockImplementationOnce(async (known?: KnownResumes) => {
      await answered.opened;
      return list(known);
    });
    signIn();
    expect(p.pending()).toBe(true);

    p.mount();
    await vi.advanceTimersByTimeAsync(0);
    expect(p.pending()).toBe(true);

    answered.open();
    await vi.advanceTimersByTimeAsync(0);
    expect(p.pending()).toBe(false);
  });

  it("waits for the read but not for /api/me with a user the server already checked", async () => {
    const p = await page([resume("Draft", 1_000)]);
    me.loading = true;
    expect(p.pending(USER)).toBe(true);

    p.mount(USER);
    await vi.advanceTimersByTimeAsync(0);

    expect(p.pending(USER)).toBe(false);
    expect(p.pending()).toBe(true);
  });

  it("stops waiting after six seconds when the account never answers", async () => {
    const p = await page([resume("Draft", 1_000)]);
    api.listResumes.mockImplementationOnce(() => new Promise(() => {}));
    signIn();
    p.mount();

    await vi.advanceTimersByTimeAsync(5_999);
    expect(p.pending()).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(p.pending()).toBe(false);
  });
});

describe("useFirstLoadPending's listeners", () => {
  it("hears once that the wait is over, even when the answer comes after the six seconds", async () => {
    const p = await page([resume("Draft", 1_000)]);
    const answered = gate();
    const list = api.listResumes.getMockImplementation()!;
    api.listResumes.mockImplementationOnce(async (known?: KnownResumes) => {
      await answered.opened;
      return list(known);
    });
    signIn();
    p.pending();
    const listener = vi.fn();
    const unmounted = vi.fn();
    const subscribe = react.lastSubscribe();
    subscribe(listener);
    subscribe(unmounted)();
    p.mount();

    await vi.advanceTimersByTimeAsync(6_000);
    expect(listener).toHaveBeenCalledOnce();
    expect(unmounted).not.toHaveBeenCalled();
    expect(p.pending()).toBe(false);

    answered.open();
    await vi.advanceTimersByTimeAsync(0);
    expect(listener).toHaveBeenCalledOnce();
    expect(p.pending()).toBe(false);
  });
});

describe("flushCloudSync", () => {
  it("is done at once when nothing is syncing", async () => {
    const p = await page([resume("Draft", 1_000)]);
    await expect(p.flushCloudSync()).resolves.toBeUndefined();
    expect(api.listResumes).not.toHaveBeenCalled();
  });

  it("sends a waiting edit before it is done", async () => {
    const mine = resume("Draft", 1_000);
    const cloud = account([mine]);
    const p = await page([mine]);
    signIn();
    p.mount();
    await vi.advanceTimersByTimeAsync(0);

    p.edit(mine.id, "Sent before leaving");
    await p.flushCloudSync();

    expect(cloud.get(mine.id)?.title).toBe("Sent before leaving");
  });

  it("stops waiting for an account that doesn't answer", async () => {
    const mine = resume("Draft", 1_000);
    account([mine]);
    const p = await page([mine]);
    signIn();
    p.mount();
    await vi.advanceTimersByTimeAsync(0);
    api.putResume.mockImplementationOnce(() => new Promise(() => {}));

    p.edit(mine.id, "Never answered");
    let done = false;
    void p.flushCloudSync(3_000).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(2_999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });
});

describe("signOutAndRelease", () => {
  it("keeps every resume in the browser when the account can't be read, and still signs out", async () => {
    const mine = resume("Mine", 1_000);
    const p = await page([mine]);
    p.ledger.claim([mine.id], USER);
    api.listResumes.mockRejectedValueOnce(new p.ApiClientError("server_error", "Down.", 500));

    expect(await p.signOutAndRelease(USER)).toEqual({ kept: 1 });

    expect(api.logout).toHaveBeenCalledOnce();
    expect(resetUser).toHaveBeenCalledOnce();
    expect(p.store().resumes[mine.id]?.title).toBe("Mine");
  });

  it("loads the studio first when signing out from a page that never opened it", async () => {
    const synced = resume("Backed up", 1_000);
    const unsynced = resume("Only here", 2_000);
    account([synced]);
    const before = await page([synced, unsynced]);
    before.ledger.claim([synced.id, unsynced.id], USER);
    before.flushStudio();
    const p = await page([], { hydrate: false, dom: before.dom });

    expect(await p.signOutAndRelease(USER)).toEqual({ kept: 1 });

    expect(Object.keys(p.store().resumes)).toEqual([unsynced.id]);
    const saved = JSON.parse(p.localStorage.getItem("otto-studio-v1")!) as {
      state: { resumes: Record<string, unknown> };
    };
    expect(Object.keys(saved.state.resumes)).toEqual([unsynced.id]);
  });

  it("leaves everything as it was when signing out fails", async () => {
    const mine = resume("Mine", 1_000);
    account([mine]);
    const p = await page([mine]);
    p.ledger.claim([mine.id], USER);
    api.logout.mockRejectedValueOnce(new p.ApiClientError("network_error", "Offline.", 0));

    await expect(p.signOutAndRelease(USER)).rejects.toMatchObject({ code: "network_error" });

    expect(resetUser).not.toHaveBeenCalled();
    expect(p.store().resumes[mine.id]?.title).toBe("Mine");
    expect(p.ledger.ownerOf(mine.id)).toBe(USER);
  });

  it("stops backing up, so what stays in the browser is never sent again", async () => {
    const synced = resume("Backed up", 1_000);
    const unsent = resume("Not backed up", 2_000);
    const cloud = account([synced]);
    const p = await page([synced, unsent]);
    const put = api.putResume.getMockImplementation()!;
    api.putResume.mockImplementation(async (next: Resume) => {
      if (next.id === unsent.id) throw new p.ApiClientError("server_error", "Down.", 500);
      return put(next);
    });
    signIn();
    p.mount();
    await vi.advanceTimersByTimeAsync(0);
    expect(cloud.has(unsent.id)).toBe(false);

    expect(await p.signOutAndRelease(USER)).toEqual({ kept: 1 });
    api.putResume.mockClear();
    p.edit(unsent.id, "Edited after sign-out");
    await vi.advanceTimersByTimeAsync(120_000);

    expect(Object.keys(p.store().resumes)).toEqual([unsent.id]);
    expect(api.putResume).not.toHaveBeenCalled();
    expect(p.backup(unsent.id)).toBe("local");
  });
});
