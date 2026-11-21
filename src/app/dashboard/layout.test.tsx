import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetDb, signInAs } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { REQUEST_PATH_HEADER } from "@/lib/request-path";

const request = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", async () => ({
  ...(await import("@/lib/auth/test-helpers")).nextHeadersMock,
  headers: async () => request.headers,
}));
vi.mock("@/components/dashboard/app-shell", () => ({ AppShell: () => null }));
vi.mock("@/lib/billing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/billing")>()),
  billingMode: () => "mock",
}));
const usage = vi.hoisted(() => ({ fails: false }));
vi.mock("@/lib/usage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/usage")>();
  return {
    ...actual,
    getUsageState: async (...args: Parameters<typeof actual.getUsageState>) => {
      if (usage.fails) throw new Error("usage table unavailable");
      return actual.getUsageState(...args);
    },
  };
});

const { default: DashboardLayout } = await import("./layout");
const { GET } = await import("@/app/api/me/route");

type ShellProps = { initialUser: SessionUser; initialMe: unknown };

async function shellProps(): Promise<ShellProps> {
  return ((await DashboardLayout({ children: null })) as ReactElement<ShellProps>).props;
}

beforeEach(async () => {
  vi.restoreAllMocks();
  await resetDb();
  cookieJar.clear();
  usage.fails = false;
  request.headers = new Headers();
});

async function redirectFor(asked?: string): Promise<string> {
  request.headers = new Headers(asked === undefined ? {} : { [REQUEST_PATH_HEADER]: asked });
  const failure: unknown = await DashboardLayout({ children: null }).then(
    () => null,
    (error: unknown) => error,
  );
  const digest = (failure as { digest?: string } | null)?.digest ?? "";
  const url = digest.split(";").find((part) => part.startsWith("/api/auth/expired"));
  return url ?? "";
}

describe("the dashboard layout", () => {
  it("hands the shell the answer GET /api/me would give, so the browser needn't ask", async () => {
    await signInAs("ada@example.com");
    const { initialUser, initialMe } = await shellProps();
    const { ok, ...answer } = await (await GET()).json();
    expect(ok).toBe(true);
    expect(initialMe).toEqual(answer);
    expect(initialUser).toEqual(answer.user);
  });

  it("leaves the answer to the browser when it can't be built, and still renders", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const user = await signInAs("ada@example.com");
    usage.fails = true;
    const { initialUser, initialMe } = await shellProps();
    expect(initialMe).toBeNull();
    expect(initialUser.id).toBe(user.id);
  });

  it("sends a visitor without a session through /api/auth/expired", async () => {
    await expect(DashboardLayout({ children: null })).rejects.toMatchObject({
      digest: expect.stringContaining("/api/auth/expired?next=%2Fdashboard"),
    });
  });

  it("brings them back to the page and query they asked for, after sign-in", async () => {
    expect(await redirectFor("/dashboard/jobs?resume=r1")).toBe(
      `/api/auth/expired?next=${encodeURIComponent("/dashboard/jobs?resume=r1")}`,
    );
    expect(await redirectFor("/dashboard/portfolio")).toBe(
      `/api/auth/expired?next=${encodeURIComponent("/dashboard/portfolio")}`,
    );
  });

  it("falls back to Home when the asked-for page isn't a dashboard page", async () => {
    for (const asked of [
      undefined,
      "/studio",
      "https://evil.example/dashboard",
      "//evil.example",
    ]) {
      expect(await redirectFor(asked), String(asked)).toBe("/api/auth/expired?next=%2Fdashboard");
    }
  });
});
