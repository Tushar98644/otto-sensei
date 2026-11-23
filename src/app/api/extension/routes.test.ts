import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_RESUMES_PER_USER } from "@/config/plans";
import { getDb } from "@/db/client";
import { extensionTokens, savedPosts } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import { saveWorkProfile } from "@/lib/eligibility/records";
import { DEV_EXTENSION_ID } from "@/lib/extension/route";
import {
  deleteExpiredExtensionTokens,
  hashToken,
  verifyExtensionToken,
} from "@/lib/extension/tokens";
import type {
  ExtensionConnectResponse,
  ExtensionConnectionResponse,
  ExtensionProfileResponse,
  SavePostBody,
  SavePostResponse,
  SavedPostResponse,
  SavedPostsResponse,
} from "@/lib/extension/types";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import { createSampleResume } from "@/lib/resume/sample";
import { DAY_MS } from "@/lib/time";
import { saveBackup } from "../resumes/backups";
import {
  DELETE as disconnectAll,
  GET as connection,
  POST as connect,
} from "../account/extension/route";
import { DELETE as removePost, GET as readPost } from "../saved-posts/[id]/route";
import { GET as listPosts } from "../saved-posts/route";
import { GET as profile, OPTIONS as profileOptions } from "./profile/route";
import { POST as save } from "./posts/route";
import { DELETE as disconnect } from "./session/route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const ORIGIN = `chrome-extension://${DEV_EXTENSION_ID}`;
const POST_TEXT =
  "We're hiring a Senior Backend Engineer.\nRequirements:\n- 5+ years with Go and PostgreSQL\n- Kafka and Terraform\n- Remote within APAC.";

function cookieRequest(method: string, path: string, body?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function bearer(
  method: string,
  path: string,
  token: string | null,
  body?: unknown,
  origin: string | null = ORIGIN,
): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (origin) headers.origin = origin;
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function connectToken(): Promise<string> {
  const res = await connect(cookieRequest("POST", "/api/account/extension", {}));
  expect(res.status).toBe(200);
  return ((await res.json()) as ExtensionConnectResponse).token;
}

function post(overrides: Partial<SavePostBody> = {}): SavePostBody {
  return {
    url: "https://www.linkedin.com/jobs/search/?currentJobId=4471319619&keywords=go",
    site: "linkedin",
    title: "Senior Backend Engineer",
    company: "Northwind",
    location: "Remote, APAC",
    text: POST_TEXT,
    ...overrides,
  };
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

describe("connecting", () => {
  it("issues a token only to a signed-in account, from this site", async () => {
    const out = await connect(cookieRequest("POST", "/api/account/extension", {}));
    expect(out.status).toBe(401);
    await signInAs("priya@example.com");
    const crossSite = new Request("http://localhost/api/account/extension", {
      method: "POST",
      headers: { "content-type": "application/json", "sec-fetch-site": "cross-site" },
      body: "{}",
    });
    expect((await connect(crossSite)).status).toBe(403);
    const token = await connectToken();
    expect(token).toMatch(/^otto_ext_[A-Za-z0-9_-]{43}$/);
    const [row] = await (await getDb()).select().from(extensionTokens);
    expect(row?.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(row)).not.toContain(token);
    expect(row?.expiresAt).toBe((row?.createdAt ?? 0) + 90 * DAY_MS);
  });

  it("shows the connection on the Account page and disconnects every browser", async () => {
    await signInAs("priya@example.com");
    const empty = (await (await connection()).json()) as ExtensionConnectionResponse;
    expect(empty.connection).toBeNull();
    const first = await connectToken();
    await connectToken();
    const shown = (await (await connection()).json()) as ExtensionConnectionResponse;
    expect(shown.connection?.browsers).toBe(2);
    const res = await disconnectAll(cookieRequest("DELETE", "/api/account/extension"));
    expect(res.status).toBe(200);
    expect((await profile(bearer("GET", "/api/extension/profile", first))).status).toBe(401);
  });

  it("keeps at most ten browsers, dropping the oldest", async () => {
    await signInAs("priya@example.com");
    const first = await connectToken();
    for (let i = 0; i < 10; i++) await connectToken();
    expect(await (await getDb()).$count(extensionTokens)).toBe(10);
    expect(await verifyExtensionToken(first)).toBeNull();
  });
});

describe("token routes", () => {
  it("never reads cookies, and refuses another website's origin", async () => {
    await signInAs("priya@example.com");
    const token = await connectToken();
    expect((await profile(bearer("GET", "/api/extension/profile", null))).status).toBe(401);
    const page = await profile(
      bearer("GET", "/api/extension/profile", token, undefined, "https://evil.example"),
    );
    expect(page.status).toBe(403);
    expect(page.headers.get("access-control-allow-origin")).toBeNull();
    const ok = await profile(bearer("GET", "/api/extension/profile", token));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("access-control-allow-origin")).toBe(ORIGIN);
  });

  it("answers preflights for the extension only", async () => {
    const own = profileOptions(bearer("OPTIONS", "/api/extension/profile", null));
    expect(own.status).toBe(204);
    expect(own.headers.get("access-control-allow-headers")).toContain("authorization");
    const other = profileOptions(
      bearer("OPTIONS", "/api/extension/profile", null, undefined, "https://evil.example"),
    );
    expect(other.status).toBe(403);
  });

  it("sends match data without contacts, and an unchanged answer when nothing moved", async () => {
    const user = await setPlan(await signInAs("priya@example.com"), "pro");
    const resume = createSampleResume(Date.UTC(2026, 10, 1));
    await saveBackup(
      user.id,
      { ...resume, updatedAt: Date.UTC(2026, 10, 2) },
      Date.now(),
      MAX_RESUMES_PER_USER,
    );
    await saveWorkProfile(user.id, {
      ...emptyWorkProfile(),
      country: "IN",
      timeZone: "Asia/Kolkata",
    });
    const token = await connectToken();
    const res = await profile(bearer("GET", "/api/extension/profile", token));
    const body = (await res.json()) as ExtensionProfileResponse;
    if (body.unchanged) throw new Error("expected a profile");
    expect(body.profile.resumes).toHaveLength(1);
    expect(body.profile.resumes[0]?.text).not.toContain(resume.basics.email);
    expect(body.profile.resumes[0]?.text).not.toContain(resume.basics.name);
    expect(body.profile.workProfile?.country).toBe("IN");
    expect(body.profile.lookingFor.place).toBe("c:IN");
    expect(body.profile.access).toEqual({
      badge: true,
      save: true,
      tailor: true,
      letter: true,
      fill: true,
    });
    const again = await profile(
      bearer("GET", `/api/extension/profile?known=${body.profile.version}`, token),
    );
    expect(await again.json()).toEqual({
      ok: true,
      unchanged: true,
      version: body.profile.version,
    });
  });

  it("gives Free accounts the badge and Save, not Tailor or Letter", async () => {
    await signInAs("free@example.com");
    const token = await connectToken();
    const body = (await (
      await profile(bearer("GET", "/api/extension/profile", token))
    ).json()) as ExtensionProfileResponse;
    if (body.unchanged) throw new Error("expected a profile");
    expect(body.profile.access).toEqual({
      badge: true,
      save: true,
      tailor: false,
      letter: false,
      fill: false,
    });
    expect(body.profile.workProfile).toBeNull();
    expect(body.profile.lookingFor.place).toBe("anywhere");
  });

  it("slides the expiry when a token is used a day later, and stops it once expired", async () => {
    await signInAs("priya@example.com");
    const token = await connectToken();
    const db = await getDb();
    const [row] = await db.select().from(extensionTokens);
    const later = (row?.createdAt ?? 0) + 2 * DAY_MS;
    await verifyExtensionToken(token, later);
    const [slid] = await db.select().from(extensionTokens);
    expect(slid?.expiresAt).toBe(later + 90 * DAY_MS);
    expect(await verifyExtensionToken(token, later + 91 * DAY_MS)).toBeNull();
    expect(await deleteExpiredExtensionTokens(later + 91 * DAY_MS, 100)).toBe(1);
  });

  it("disconnects only this browser from inside the extension", async () => {
    await signInAs("priya@example.com");
    const one = await connectToken();
    const two = await connectToken();
    expect((await disconnect(bearer("DELETE", "/api/extension/session", one))).status).toBe(200);
    expect((await profile(bearer("GET", "/api/extension/profile", one))).status).toBe(401);
    expect((await profile(bearer("GET", "/api/extension/profile", two))).status).toBe(200);
  });
});

describe("saving", () => {
  it("saves a post once per job link, on any plan, and keeps the copy for Tailor", async () => {
    const user = await signInAs("free@example.com");
    const token = await connectToken();
    const first = await save(bearer("POST", "/api/extension/posts", token, post()));
    expect(first.status).toBe(201);
    const saved = (await first.json()) as SavePostResponse;
    expect(saved.post.created).toBe(true);
    expect(saved.boardPath).toBe(`/dashboard/applications#saved-${saved.post.id}`);

    const again = await save(
      bearer(
        "POST",
        "/api/extension/posts",
        token,
        post({
          url: "https://www.linkedin.com/jobs/view/4471319619/?trk=x",
          title: "Senior Backend Engineer II",
        }),
      ),
    );
    expect(again.status).toBe(200);
    const second = (await again.json()) as SavePostResponse;
    expect(second.post).toMatchObject({ id: saved.post.id, created: false, key: saved.post.key });
    const rows = await (
      await getDb()
    )
      .select()
      .from(savedPosts)
      .where(eq(savedPosts.userId, user.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      url: "https://www.linkedin.com/jobs/view/4471319619/",
      title: "Senior Backend Engineer II",
    });

    const list = (await (await listPosts()).json()) as SavedPostsResponse;
    expect(list.posts.map((item) => item.id)).toEqual([saved.post.id]);
    expect(list.posts[0]).not.toHaveProperty("text");
    const one = (await (
      await readPost(new Request("http://localhost/x"), {
        params: Promise.resolve({ id: saved.post.id }),
      })
    ).json()) as SavedPostResponse;
    expect(one.post.text).toBe(POST_TEXT);

    const body = (await (
      await profile(bearer("GET", "/api/extension/profile", token))
    ).json()) as ExtensionProfileResponse;
    if (body.unchanged) throw new Error("expected a profile");
    expect(body.profile.saved).toEqual([
      { key: saved.post.key, id: saved.post.id, savedAt: saved.post.savedAt },
    ]);
  });

  it("refuses links that aren't web pages and bodies that aren't JSON", async () => {
    await signInAs("priya@example.com");
    const token = await connectToken();
    const bad = await save(
      bearer("POST", "/api/extension/posts", token, post({ url: "javascript:alert(1)" })),
    );
    expect(bad.status).toBe(400);
    const form = new Request("http://localhost/api/extension/posts", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "text/plain", origin: ORIGIN },
      body: JSON.stringify(post()),
    });
    expect((await save(form)).status).toBe(415);
  });

  it("removes a saved post from To apply, only the account's own", async () => {
    await signInAs("priya@example.com");
    const token = await connectToken();
    const saved = (await (
      await save(bearer("POST", "/api/extension/posts", token, post()))
    ).json()) as SavePostResponse;
    cookieJar.clear();
    await signInAs("someone@example.com");
    await removePost(cookieRequest("DELETE", "/x"), {
      params: Promise.resolve({ id: saved.post.id }),
    });
    expect(await (await getDb()).$count(savedPosts)).toBe(1);
    const missing = await readPost(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: saved.post.id }),
    });
    expect(missing.status).toBe(404);
    expect(((await missing.json()) as ApiErrorBody).error.code).toBe("not_found");
  });
});
