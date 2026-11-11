import { afterEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";

const local = vi.hoisted(() => ({ openLocalDb: vi.fn(async () => ({ local: true })) }));
vi.mock("./local", () => local);

async function realClient() {
  vi.resetModules();
  return vi.importActual<typeof import("./client")>("./client");
}

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

afterEach(() => {
  local.openLocalDb.mockClear();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("getDb", () => {
  it("uses the local database in development's dev sign-in, even with a real URL set", async () => {
    useEnv({ NODE_ENV: "development", DATABASE_URL: "postgres://u:p@db.example.com:6543/postgres" });
    const { getDb } = await realClient();
    await expect(getDb()).resolves.toEqual({ local: true });
  });

  it("uses DATABASE_URL in development once DEV_AUTH=supabase", async () => {
    useEnv({ NODE_ENV: "development", DEV_AUTH: "supabase", DATABASE_URL: "postgres://u:p@db.example.com:6543/postgres" });
    const { getDb } = await realClient();
    await expect(getDb()).resolves.not.toEqual({ local: true });
    expect(local.openLocalDb).not.toHaveBeenCalled();
  });

  it("never opens the local database in production", async () => {
    useEnv({ NODE_ENV: "production", DATABASE_URL: undefined, POSTGRES_URL: undefined });
    const { getDb } = await realClient();
    await expect(getDb()).rejects.toThrow("Database is not configured");
    useEnv({ NODE_ENV: "production", DATABASE_URL: "postgres://u:p@db.example.com:6543/postgres" });
    await expect((await realClient()).getDb()).resolves.not.toEqual({ local: true });
    expect(local.openLocalDb).not.toHaveBeenCalled();
  });
});
