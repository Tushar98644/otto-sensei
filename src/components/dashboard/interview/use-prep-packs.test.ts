import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application } from "@/lib/api/types";
import { queryKeys } from "@/lib/queries/keys";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  isServer: false,
}));
vi.mock("@/components/account/use-me", () => ({
  signedInUserId: () => "ada",
  subscribeToMe: () => () => {},
}));

const { getQueryClient } = await import("@/lib/queries/client");
const { forgetPrepPacks } = await import("./use-prep-packs");

const LIST = queryKeys.applications("ada");
const PACKS = queryKeys.prepPacks("ada");

const application = (id: string) => ({ id, company: "Stripe", hasPrep: false }) as Application;
const invalidated = (key: readonly unknown[]) => getQueryClient().getQueryState(key)?.isInvalidated;

beforeEach(() => {
  getQueryClient().clear();
  getQueryClient().setQueryData(LIST, [application("a"), application("b")]);
  getQueryClient().setQueryData(PACKS, []);
});

describe("forgetPrepPacks", () => {
  it("reloads the packs and flips hasPrep on the one application, without reloading the list", () => {
    forgetPrepPacks("a", true);
    expect(invalidated(PACKS)).toBe(true);
    expect(invalidated(LIST)).toBe(false);
    expect(getQueryClient().getQueryData<Application[]>(LIST)?.map((item) => item.hasPrep)).toEqual([
      true,
      false,
    ]);
  });

  it("reloads the list when the pack wasn't saved, since the application has gone", () => {
    forgetPrepPacks("a", false);
    expect(invalidated(PACKS)).toBe(true);
    expect(invalidated(LIST)).toBe(true);
    expect(getQueryClient().getQueryData<Application[]>(LIST)?.[0]?.hasPrep).toBe(false);
  });
});
