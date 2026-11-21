import { describe, expect, it, vi } from "vitest";
import type { CloudSync } from "./cloud-sync";
import { createSyncSession } from "./sync-session";

function fakeSync(): CloudSync & { stopped: boolean } {
  const sync = {
    stopped: false,
    flush: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    leave: vi.fn(() => {}),
    retryRefused: vi.fn(() => {}),
    backupOf: () => "local" as const,
    stop: vi.fn(() => {
      sync.stopped = true;
    }),
    isStopped: () => sync.stopped,
    firstLoad: Promise.resolve(),
  };
  return sync;
}

function setup() {
  const started: (CloudSync & { stopped: boolean })[] = [];
  const start = vi.fn((userId: string | null) => {
    const sync = Object.assign(fakeSync(), { userId });
    started.push(sync);
    return sync;
  });
  return { session: createSyncSession(start, 300_000), start, started };
}

describe("createSyncSession", () => {
  it("keeps one session for the account across shells, re-reading only when it is old", () => {
    const { session, start, started } = setup();
    const first = session.acquire("user-1");
    const second = session.acquire("user-1");

    expect(second).toBe(first);
    expect(start).toHaveBeenCalledTimes(1);
    expect(started[0]?.refresh).toHaveBeenCalledWith(300_000);
    expect(started[0]?.stop).not.toHaveBeenCalled();
  });

  it("stops the old account's session when another account signs in", () => {
    const { session, start, started } = setup();
    session.acquire("user-1");
    const next = session.acquire("user-2");

    expect(start).toHaveBeenCalledTimes(2);
    expect(started[0]?.stopped).toBe(true);
    expect(session.current()).toBe(next);
  });

  it("starts again after the server ended the session", () => {
    const { session, start, started } = setup();
    session.acquire("user-1");
    started[0]?.stop();

    session.acquire("user-1");

    expect(start).toHaveBeenCalledTimes(2);
  });

  it("treats signed out as its own session", () => {
    const { session, start } = setup();
    session.acquire("user-1");
    session.acquire(null);
    session.acquire(null);

    expect(start).toHaveBeenCalledTimes(2);
    expect(start).toHaveBeenLastCalledWith(null);
  });

  it("ends the session on sign-out", () => {
    const { session, started } = setup();
    session.acquire("user-1");
    session.end();

    expect(started[0]?.stopped).toBe(true);
    expect(session.current()).toBeNull();
  });
});
