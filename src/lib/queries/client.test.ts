import { describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api/client";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  isServer: false,
}));

// A stand-in for the /api/me store: who is signed in, and its change listeners.
const me = vi.hoisted(() => ({ userId: null as string | null, listeners: new Set<() => void>() }));
vi.mock("@/components/account/use-me", () => ({
  signedInUserId: () => me.userId,
  subscribeToMe: (listener: () => void) => {
    me.listeners.add(listener);
    return () => me.listeners.delete(listener);
  },
}));

const { getQueryClient, shouldRetry } = await import("./client");

function signIn(userId: string | null) {
  me.userId = userId;
  for (const listener of me.listeners) listener();
}

describe("shouldRetry", () => {
  it("asks once more after a lost connection or a server error, never after a 4xx", () => {
    expect(shouldRetry(0, new ApiClientError("network_error", "offline", 0))).toBe(true);
    expect(shouldRetry(0, new ApiClientError("server_error", "oops", 502))).toBe(true);
    expect(shouldRetry(0, new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldRetry(1, new ApiClientError("server_error", "oops", 500))).toBe(false);
    for (const [code, status] of [
      ["unauthorized", 401],
      ["upgrade_required", 402],
      ["not_found", 404],
      ["rate_limited", 429],
    ] as const) {
      expect(shouldRetry(0, new ApiClientError(code, "no", status))).toBe(false);
    }
  });
});

describe("the tab's query client", () => {
  it("is one client, emptied when the account signs out or changes", () => {
    const client = getQueryClient();
    expect(getQueryClient()).toBe(client);

    signIn("ada");
    client.setQueryData(["writings", "ada"], { items: [], total: 0 });
    signIn("ada");
    expect(client.getQueryData(["writings", "ada"])).toBeDefined();

    signIn(null);
    expect(client.getQueryData(["writings", "ada"])).toBeUndefined();

    signIn("grace");
    client.setQueryData(["writings", "grace"], { items: [], total: 0 });
    signIn("ada");
    expect(client.getQueryData(["writings", "grace"])).toBeUndefined();
  });
});
