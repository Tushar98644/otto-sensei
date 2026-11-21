import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appUrl, env, resetEnvForTests } from "./env";

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

beforeEach(() => {
  useEnv({
    NODE_ENV: "development",
    NEXT_PUBLIC_APP_URL: undefined,
    VERCEL_PROJECT_PRODUCTION_URL: undefined,
  });
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

describe("DODO_ENVIRONMENT", () => {
  it("is test mode unless it plainly says live, so a missing or mistyped value never takes real money", () => {
    const cases: [string | undefined, "test" | "live"][] = [
      [undefined, "test"],
      ["", "test"],
      ["   ", "test"],
      ["test", "test"],
      ["test_mode", "test"],
      ["sandbox", "test"],
      ["livex", "test"],
      ["prod", "test"],
      ["true", "test"],
      ["live", "live"],
      [" LIVE ", "live"],
      ["live_mode", "live"],
      ["Live_Mode", "live"],
      ["production", "live"],
      ["Production", "live"],
    ];
    const environmentOf = (value: string | undefined) => {
      vi.stubEnv("DODO_ENVIRONMENT", value);
      resetEnvForTests();
      return env().DODO_ENVIRONMENT;
    };
    expect(cases.map(([value]) => [value, environmentOf(value)])).toEqual(cases);
  });
});

describe("Paddle variables", () => {
  it("are no longer read, so values left in a deployment's env do nothing", () => {
    useEnv({
      PADDLE_API_KEY: "paddle_api_key_value",
      PADDLE_ENVIRONMENT: "live",
      NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "paddle_client_token_value",
      PADDLE_PRO_MONTHLY_PRICE_ID: "paddle_price_value",
    });
    expect(Object.keys(env()).filter((name) => /paddle/i.test(name))).toEqual([]);
  });
});

describe("Dodo variables", () => {
  it("are optional and treat blank values as unset", () => {
    const names = [
      "DODO_API_KEY",
      "DODO_WEBHOOK_SECRET",
      "DODO_PRO_MONTHLY_PRODUCT_ID",
      "DODO_PRO_YEARLY_PRODUCT_ID",
      "DODO_MAX_MONTHLY_PRODUCT_ID",
      "DODO_MAX_YEARLY_PRODUCT_ID",
      "DODO_PRO_TRIAL_PRODUCT_ID",
      "BILLING_SIGNING_SECRET",
    ] as const;
    useEnv(Object.fromEntries(names.map((name) => [name, " "])));
    expect(names.map((name) => env()[name])).toEqual(names.map(() => undefined));
    useEnv(Object.fromEntries(names.map((name) => [name, `${name.toLowerCase()}_value`])));
    expect(names.map((name) => env()[name])).toEqual(
      names.map((name) => `${name.toLowerCase()}_value`),
    );
  });
});
