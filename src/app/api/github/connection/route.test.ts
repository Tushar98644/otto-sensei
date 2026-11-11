import { AuthApiError } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as callback } from "@/app/auth/callback/route";
import type { ApiErrorBody, UrlResponse } from "@/lib/api/types";
import {
  cookieJar,
  fakeAuth,
  jsonRequest,
  linkGitHub,
  resetDb,
  signInAs,
} from "@/lib/auth/test-helpers";
import type { GitHubConnectionResponse } from "@/lib/github/connect";
import { DELETE, GET, POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidateTag: () => {}, revalidatePath: () => {} }));

const start = (next = "/studio?step=fix&github=r1") =>
  POST(jsonRequest("/api/github/connection", { next }));
const disconnect = () =>
  DELETE(new Request("http://localhost/api/github/connection", { method: "DELETE" }));

async function connectionOf(res: Response) {
  return ((await res.json()) as GitHubConnectionResponse).connection;
}

async function errorOf(res: Response) {
  return ((await res.json()) as ApiErrorBody).error;
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("GET /api/github/connection", () => {
  it("needs sign-in, then names the connected account or none", async () => {
    expect((await GET()).status).toBe(401);
    const user = await signInAs();
    expect(await connectionOf(await GET())).toBeNull();
    linkGitHub(user, "octocat");
    expect(await connectionOf(await GET())).toEqual({ login: "octocat", canDisconnect: true });
  });
});

describe("POST /api/github/connection", () => {
  it("starts linking GitHub to the signed-in account and comes back to the page", async () => {
    await signInAs();
    const res = await start();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const { url } = (await res.json()) as UrlResponse;
    expect(new URL(url).pathname).toBe("/auth/v1/user/identities/authorize");
    const [credentials] = fakeAuth.linkStarts;
    expect(credentials?.provider).toBe("github");
    expect(credentials?.options?.skipBrowserRedirect).toBe(true);
    const back = new URL(credentials?.options?.redirectTo ?? "");
    expect(back.pathname).toBe("/auth/callback");
    expect(back.searchParams.get("link")).toBe("github");
    expect(back.searchParams.get("next")).toBe("/studio?step=fix&github=r1");
    expect(cookieJar.get("sb-test-auth-token-code-verifier")?.httpOnly).toBe(true);
  });

  it("never sends anyone off the site afterwards", async () => {
    await signInAs();
    await start("https://evil.example/steal");
    const back = new URL(fakeAuth.linkStarts[0]?.options?.redirectTo ?? "");
    expect(back.searchParams.get("next")).toBe("/dashboard");
  });

  it("needs sign-in and JSON, and refuses a second GitHub account", async () => {
    expect((await start()).status).toBe(401);
    const user = await signInAs();
    const form = jsonRequest("/api/github/connection", {}, { contentType: "text/plain" });
    expect((await POST(form)).status).toBe(415);
    linkGitHub(user, "octocat");
    expect((await start()).status).toBe(409);
    expect(fakeAuth.linkStarts).toHaveLength(0);
  });

  it("says plainly when GitHub linking isn't set up yet in Supabase", async () => {
    await signInAs();
    for (const code of ["manual_linking_disabled", "provider_disabled"]) {
      fakeAuth.failNext(
        "linkIdentity",
        new AuthApiError("off", code === "provider_disabled" ? 400 : 404, code),
      );
      const res = await start();
      expect(res.status).toBe(503);
      expect(await errorOf(res)).toEqual({
        code: "auth_unavailable",
        message: "Connecting GitHub isn't set up yet. Please try again later.",
      });
    }
  });
});

describe("DELETE /api/github/connection", () => {
  it("disconnects GitHub", async () => {
    const user = await signInAs();
    linkGitHub(user, "octocat");
    const res = await disconnect();
    expect(res.status).toBe(200);
    expect(await connectionOf(res)).toBeNull();
    expect(fakeAuth.githubOf(user.id)).toBeNull();
    expect(await connectionOf(await GET())).toBeNull();
  });

  it("keeps GitHub on an account that signs in only with GitHub", async () => {
    const code = fakeAuth.issueOAuthCode("dev@example.com", { github: "newdev" });
    cookieJar.set("sb-test-auth-token-code-verifier", "verifier");
    await callback(new NextRequest(`https://otto.test/auth/callback?code=${code}`));
    expect(await connectionOf(await GET())).toEqual({ login: "newdev", canDisconnect: false });
    const res = await disconnect();
    expect(res.status).toBe(409);
    expect(await connectionOf(await GET())).toEqual({ login: "newdev", canDisconnect: false });
  });

  it("refuses a request from another site", async () => {
    const user = await signInAs();
    linkGitHub(user, "octocat");
    const req = new Request("http://localhost/api/github/connection", {
      method: "DELETE",
      headers: { "sec-fetch-site": "cross-site" },
    });
    expect((await DELETE(req)).status).toBe(403);
    expect(fakeAuth.githubOf(user.id)).toBe("octocat");
  });
});
