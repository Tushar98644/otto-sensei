import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application, ApplicationResponse, ApplicationsResponse } from "@/lib/api/types";
import { getQueryClient } from "@/lib/queries/client";
import { queryKeys } from "@/lib/queries/keys";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  isServer: false,
}));

const api = vi.hoisted(() => ({
  listApplications: vi.fn(),
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
  setApplicationsStatus: vi.fn(),
}));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));
vi.mock("@/components/account/use-me", () => ({
  signedInUserId: () => USER,
  subscribeToMe: () => () => {},
  useMe: () => ({ me: null, user: null, loading: false, refresh: async () => {} }),
}));

const { ApiClientError } = await import("@/lib/api/client");
const {
  addApplication,
  applicationsQuery,
  changeApplication,
  commitDelete,
  hideApplication,
  markPrepped,
  removeApplication,
  restoreApplication,
} = await import("./use-applications");

const USER = "6f1c1b7e-8a3c-4c39-9a51-8f4c6b0f2d11";
const KEY = queryKeys.applications(USER);
const DAY_MS = 24 * 60 * 60 * 1_000;
const APPLIED_AT = Date.UTC(2026, 9, 1, 12);

function application(overrides: Partial<Application> = {}): Application {
  return {
    id: crypto.randomUUID(),
    resumeId: null,
    resumeTitle: "",
    company: "Stripe",
    role: "Product Manager",
    jobUrl: "",
    appliedAt: APPLIED_AT,
    status: "applied",
    stageReached: "applied",
    statusChangedAt: APPLIED_AT,
    notes: "",
    followUpAt: APPLIED_AT + 7 * DAY_MS,
    jobId: null,
    hasPrep: false,
    interviewAt: null,
    createdAt: APPLIED_AT,
    updatedAt: APPLIED_AT,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const shown = () => getQueryClient().getQueryData<Application[]>(KEY);
const page = (applications: Application[]): ApplicationsResponse => ({
  ok: true,
  applications,
  nextCursor: null,
});

beforeEach(() => {
  getQueryClient().clear();
  vi.clearAllMocks();
});

describe("adding an application", () => {
  it("shows it at once under the id it keeps, then takes the server's copy whatever its clock", async () => {
    const older = application({ company: "Linear", appliedAt: APPLIED_AT - DAY_MS });
    getQueryClient().setQueryData(KEY, [older]);
    const reply = deferred<ApplicationResponse>();
    api.createApplication.mockReturnValue(reply.promise);

    const adding = addApplication({ company: "  Stripe ", appliedAt: APPLIED_AT });
    const draft = shown()?.find((item) => item.id !== older.id);
    expect(draft).toMatchObject({ company: "Stripe", status: "applied", hasPrep: false });
    expect(draft?.followUpAt).not.toBeNull();
    expect(api.createApplication).toHaveBeenCalledWith(expect.objectContaining({ id: draft?.id }));

    const saved = application({ id: draft?.id, company: "Stripe", updatedAt: 1 });
    reply.resolve({ ok: true, application: saved });
    await expect(adding).resolves.toEqual(saved);
    expect(shown()).toEqual([saved, older]);
  });

  it("takes it off again when the server says no", async () => {
    getQueryClient().setQueryData(KEY, []);
    api.createApplication.mockRejectedValue(new ApiClientError("server_error", "No", 500));
    await expect(addApplication({ company: "Stripe", appliedAt: APPLIED_AT })).rejects.toThrow(
      "No",
    );
    expect(shown()).toEqual([]);
  });

  it("holds a change to it until the server has it", async () => {
    getQueryClient().setQueryData(KEY, []);
    const reply = deferred<ApplicationResponse>();
    api.createApplication.mockReturnValue(reply.promise);
    void addApplication({ company: "Stripe", appliedAt: APPLIED_AT });
    const draft = shown()![0]!;
    const moved = { ...draft, status: "interview" as const, stageReached: "interview" as const };
    api.updateApplication.mockResolvedValue({ ok: true, application: moved });

    const changing = changeApplication(draft, { status: "interview" });
    await Promise.resolve();
    expect(api.updateApplication).not.toHaveBeenCalled();
    expect(shown()![0]!.status).toBe("interview");

    reply.resolve({ ok: true, application: draft });
    await changing;
    expect(api.updateApplication).toHaveBeenCalledWith(draft.id, { status: "interview" });
    expect(shown()![0]!.status).toBe("interview");
  });
});

describe("changing an application", () => {
  it("moves it at once and puts it back when the save fails", async () => {
    const original = application();
    getQueryClient().setQueryData(KEY, [original]);
    const reply = deferred<ApplicationResponse>();
    api.updateApplication.mockReturnValue(reply.promise);

    const changing = changeApplication(original, { status: "offer" });
    await Promise.resolve();
    expect(shown()![0]).toMatchObject({ status: "offer", stageReached: "offer", followUpAt: null });

    reply.reject(new ApiClientError("server_error", "No", 500));
    await expect(changing).rejects.toThrow("No");
    expect(shown()).toEqual([original]);
  });

  it("drops one that was deleted on another device", async () => {
    const original = application();
    getQueryClient().setQueryData(KEY, [original]);
    api.updateApplication.mockRejectedValue(new ApiClientError("not_found", "Gone", 404));
    await expect(changeApplication(original, { status: "offer" })).rejects.toThrow("Gone");
    expect(shown()).toEqual([]);
  });
});

describe("the list and changes made while it loads", () => {
  it("replays a change made during a load over the list that arrives", async () => {
    const original = application();
    const answer = deferred<ApplicationsResponse>();
    api.listApplications.mockReturnValue(answer.promise);
    api.updateApplication.mockReturnValue(new Promise(() => {}));

    const loading = getQueryClient().fetchQuery(applicationsQuery(USER));
    void changeApplication(original, { status: "interview" });
    answer.resolve(page([original]));

    expect((await loading)[0]).toMatchObject({ id: original.id, status: "interview" });
  });

  it("keeps a deleted row out of fresh loads until the delete is sent, and brings it back on Undo", async () => {
    const kept = application({ company: "Linear" });
    const deleted = application({ appliedAt: APPLIED_AT + 1 });
    getQueryClient().setQueryData(KEY, [deleted, kept]);
    api.listApplications.mockResolvedValue(page([deleted, kept]));

    hideApplication(deleted);
    expect(shown()).toEqual([kept]);
    expect(await getQueryClient().fetchQuery({ ...applicationsQuery(USER), staleTime: 0 })).toEqual(
      [kept],
    );

    restoreApplication(deleted);
    expect(shown()).toEqual([deleted, kept]);

    hideApplication(deleted);
    api.deleteApplication.mockResolvedValue({ ok: true });
    await commitDelete(deleted, { keepalive: false });
    api.listApplications.mockResolvedValue(page([kept]));
    expect(await getQueryClient().fetchQuery({ ...applicationsQuery(USER), staleTime: 0 })).toEqual(
      [kept],
    );
  });

  it("pages through the whole list, newest applied first", async () => {
    const first = application({ appliedAt: APPLIED_AT });
    const second = application({ appliedAt: APPLIED_AT - DAY_MS });
    api.listApplications
      .mockResolvedValueOnce({ ok: true, applications: [second], nextCursor: "next" })
      .mockResolvedValueOnce(page([first]));
    expect(await getQueryClient().fetchQuery(applicationsQuery(USER))).toEqual([first, second]);
    expect(api.listApplications).toHaveBeenNthCalledWith(2, "next");
  });
});

describe("how often the list is fetched", () => {
  it("stays fresh for 5 minutes and asks again when the tab comes back after that", () => {
    const options = applicationsQuery(USER);
    expect(options.staleTime).toBe(5 * 60_000);
    expect(options.refetchOnWindowFocus).toBe(true);
  });

  it("marks one application as prepped without fetching the list again", () => {
    const prepped = application();
    const other = application({ company: "Linear" });
    getQueryClient().setQueryData(KEY, [prepped, other]);
    markPrepped(prepped.id);
    expect(shown()).toEqual([{ ...prepped, hasPrep: true }, other]);
    expect(api.listApplications).not.toHaveBeenCalled();
  });

  it("reloads the prep packs once a deleted application took its pack with it, and only then", async () => {
    const packs = queryKeys.prepPacks(USER);
    const stale = () => getQueryClient().getQueryState(packs)?.isInvalidated;
    const prepped = application({ hasPrep: true });
    const plain = application({ company: "Linear" });
    api.deleteApplication.mockResolvedValue({ ok: true });

    getQueryClient().setQueryData(packs, []);
    await removeApplication(plain);
    hideApplication(plain);
    await commitDelete(plain, { keepalive: false });
    expect(stale()).toBe(false);

    await removeApplication(prepped);
    expect(stale()).toBe(true);

    getQueryClient().setQueryData(packs, []);
    hideApplication(prepped);
    await commitDelete(prepped, { keepalive: false });
    expect(stale()).toBe(true);
  });
});
