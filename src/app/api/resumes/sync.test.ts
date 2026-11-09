import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api/client";
import type { ApiErrorBody, EmptyOk, PutResumeResponse, ResumesResponse } from "@/lib/api/types";
import { cookieJar, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { useStudioStore } from "@/lib/store/resume-store";
import { startCloudSync, type CloudSync, type SyncApi } from "@/lib/sync/cloud-sync";
import { createLedger, type LedgerStorage } from "@/lib/sync/ledger";

import { DELETE, PUT } from "./[id]/route";
import { GET } from "./route";

// Two browsers signed in to one account, syncing through the real route handlers and database.

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

type StudioStore = typeof useStudioStore;

const context = (id: string) => ({ params: Promise.resolve({ id }) });

async function unwrap<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T | ApiErrorBody;
  if ((body as ApiErrorBody).ok === false) {
    const { code, message } = (body as ApiErrorBody).error;
    throw new ApiClientError(code, message, res.status);
  }
  return body as T;
}

function routeApi() {
  return {
    listResumes: vi.fn(async () => unwrap<ResumesResponse>(await GET())),
    putResume: vi.fn(async (resume: Resume) => {
      const req = new Request(`http://localhost/api/resumes/${resume.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(resume),
      });
      return unwrap<PutResumeResponse>(await PUT(req, context(resume.id)));
    }),
    deleteResume: vi.fn(async (id: string) => {
      const req = new Request(`http://localhost/api/resumes/${id}`, { method: "DELETE" });
      return unwrap<EmptyOk>(await DELETE(req, context(id)));
    }),
  } satisfies SyncApi;
}

function memoryStorage(): LedgerStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

// Each device needs its own studio store, and the store is a module singleton.
async function freshStore(): Promise<StudioStore> {
  vi.resetModules();
  return (await import("@/lib/store/resume-store")).useStudioStore;
}

const running: CloudSync[] = [];

function device(store: StudioStore, userId: string) {
  const ledger = createLedger(memoryStorage());
  const api = routeApi();
  const onDeletedElsewhere = vi.fn();
  const startSession = () => {
    const sync = startCloudSync({
      userId,
      api,
      store,
      ledger,
      // Long enough that only explicit flushes send anything during a test.
      debounceMs: 60_000,
      onDeletedElsewhere,
      warn: () => {},
    });
    running.push(sync);
    return sync;
  };
  return { store, api, ledger, onDeletedElsewhere, startSession };
}

const uploadedIds = (api: ReturnType<typeof routeApi>) =>
  api.putResume.mock.calls.map(([resume]) => resume.id);

async function cloudState(): Promise<{ ids: string[]; deletedIds: string[] }> {
  const { resumes, deletedIds } = await unwrap<ResumesResponse>(await GET());
  return { ids: resumes.map((r) => r.id).sort(), deletedIds };
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  for (const sync of running.splice(0)) sync.stop();
});

// On Pro: these are about devices, and Free keeps just one resume.
async function signedInDevices() {
  const user = await setPlan(await signInAs("ada@example.com"), "pro");
  const laptop = device(await freshStore(), user.id);
  const phone = device(await freshStore(), user.id);
  return { laptop, phone };
}

describe("Free's resume limit in sync", () => {
  it("backs up the first resume and keeps a second one in the browser, asking only once per version", async () => {
    const user = await signInAs("ada@example.com");
    const laptop = device(await freshStore(), user.id);
    const first = { ...emptyResume(1_000), title: "First" };
    const second = { ...emptyResume(2_000), title: "Second" };
    // Made before signing in, so the studio's own check never saw the account.
    laptop.store.getState().addResume(first);
    laptop.store.getState().addResume(second);
    const session = laptop.startSession();
    await session.flush();

    expect((await cloudState()).ids).toHaveLength(1);
    expect(Object.keys(laptop.store.getState().resumes)).toHaveLength(2);
    const sent = laptop.api.putResume.mock.calls.length;
    await session.flush();
    expect(laptop.api.putResume.mock.calls.length).toBe(sent);

    // The one that made it keeps backing up its edits.
    const [backedUp] = (await cloudState()).ids;
    laptop.store.getState().updateResume(backedUp!, (r) => ({ ...r, title: "First, edited" }));
    await session.flush();
    expect((await cloudState()).ids).toEqual([backedUp]);
  });
});

describe("resume deletions across devices", () => {
  it("a resume deleted on one device is dropped by the next sign-in elsewhere, not restored", async () => {
    const { laptop, phone } = await signedInDevices();
    const cv = { ...emptyResume(1_000), title: "CV" };
    const cover = { ...emptyResume(1_000), title: "Cover letter version" };
    laptop.store.getState().addResume(cv);
    laptop.store.getState().addResume(cover);
    const laptopSession = laptop.startSession();
    await laptopSession.flush();

    const phoneSession = phone.startSession();
    await phoneSession.flush();
    expect(Object.keys(phone.store.getState().resumes).sort()).toEqual([cv.id, cover.id].sort());
    phoneSession.stop();

    laptop.store.getState().removeResume(cv.id);
    await laptopSession.flush();
    expect(await cloudState()).toEqual({ ids: [cover.id], deletedIds: [cv.id] });

    // The phone, offline meanwhile, edits and opens its copy, then comes back.
    phone.store.getState().updateResume(cv.id, (r) => ({ ...r, title: "CV, edited on the phone" }));
    phone.store.getState().setActive(cv.id);
    phone.api.putResume.mockClear();
    await phone.startSession().flush();

    expect(phone.store.getState().resumes[cv.id]).toBeUndefined();
    expect(phone.store.getState().activeId).toBe(cover.id);
    expect(uploadedIds(phone.api)).not.toContain(cv.id);
    expect(phone.api.deleteResume).not.toHaveBeenCalled();
    expect(phone.onDeletedElsewhere).toHaveBeenCalledExactlyOnceWith({ ids: [cv.id], wasActive: true });
    expect(await cloudState()).toEqual({ ids: [cover.id], deletedIds: [cv.id] });
  });

  it("a save that races a deletion is refused, and the saving device drops its copy", async () => {
    const { laptop, phone } = await signedInDevices();
    const cv = { ...emptyResume(1_000), title: "CV" };
    const other = { ...emptyResume(1_000), title: "Other" };
    laptop.store.getState().addResume(cv);
    laptop.store.getState().addResume(other);
    const laptopSession = laptop.startSession();
    await laptopSession.flush();
    const phoneSession = phone.startSession();
    await phoneSession.flush();
    phone.store.getState().setActive(other.id);

    // Both sessions are already loaded when the laptop deletes it.
    laptop.store.getState().removeResume(cv.id);
    await laptopSession.flush();
    phone.store.getState().updateResume(cv.id, (r) => ({ ...r, title: "Edited on the phone" }));
    await phoneSession.flush();

    expect(uploadedIds(phone.api)).toEqual([cv.id]);
    expect(phone.store.getState().resumes[cv.id]).toBeUndefined();
    expect(phone.store.getState().activeId).toBe(other.id);
    expect(phone.onDeletedElsewhere).toHaveBeenCalledExactlyOnceWith({ ids: [cv.id], wasActive: false });
    expect(phone.api.deleteResume).not.toHaveBeenCalled();
    expect(await cloudState()).toEqual({ ids: [other.id], deletedIds: [cv.id] });

    // Nothing is left to send, so later flushes stay quiet.
    await phoneSession.flush();
    expect(uploadedIds(phone.api)).toEqual([cv.id]);
  });
});
