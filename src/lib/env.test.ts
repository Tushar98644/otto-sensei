import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appUrl, resetEnvForTests } from "./env";

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

beforeEach(() => {
  useEnv({ NODE_ENV: "development", NEXT_PUBLIC_APP_URL: undefined, VERCEL_PROJECT_PRODUCTION_URL: undefined });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetEnvForTests();
});

describe("appUrl", () => {
  it("uses NEXT_PUBLIC_APP_URL without a trailing slash", () => {
    useEnv({ NEXT_PUBLIC_APP_URL: "https://ottoresume.com/" });
    expect(appUrl()).toBe("https://ottoresume.com");
  });

  it("prefers NEXT_PUBLIC_APP_URL over Vercel's production domain", () => {
    useEnv({
      NEXT_PUBLIC_APP_URL: "https://ottoresume.com",
      VERCEL_PROJECT_PRODUCTION_URL: "otto-resume.vercel.app",
    });
    expect(appUrl()).toBe("https://ottoresume.com");
  });

  it("falls back to Vercel's production domain over https", () => {
    useEnv({ VERCEL_PROJECT_PRODUCTION_URL: "otto-resume.vercel.app" });
    expect(appUrl()).toBe("https://otto-resume.vercel.app");
  });

  it("treats blank values as unset", () => {
    useEnv({ NEXT_PUBLIC_APP_URL: "  ", VERCEL_PROJECT_PRODUCTION_URL: "otto-resume.vercel.app" });
    expect(appUrl()).toBe("https://otto-resume.vercel.app");
  });

  it("adds https to a bare host", () => {
    useEnv({ NEXT_PUBLIC_APP_URL: "ottoresume.com" });
    expect(appUrl()).toBe("https://ottoresume.com");
  });

  it("keeps a local http URL as it is", () => {
    useEnv({ NEXT_PUBLIC_APP_URL: "http://localhost:3001" });
    expect(appUrl()).toBe("http://localhost:3001");
  });

  it("falls back to localhost quietly in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(appUrl()).toBe("http://localhost:3000");
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once when production falls back to localhost", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useEnv({ NODE_ENV: "production" });
    expect(appUrl()).toBe("http://localhost:3000");
    expect(appUrl()).toBe("http://localhost:3000");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("env.app_url_localhost");
  });

  it("doesn't warn in production when Vercel provides the domain", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useEnv({ NODE_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "otto-resume.vercel.app" });
    expect(appUrl()).toBe("https://otto-resume.vercel.app");
    expect(warn).not.toHaveBeenCalled();
  });
});
