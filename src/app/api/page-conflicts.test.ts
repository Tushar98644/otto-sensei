import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MODERATION_MODEL } from "@/lib/ai/moderation";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { emptyContent } from "@/lib/portfolio/content";
import { saveContent } from "@/lib/portfolio/content-records";
import { getPortfolio } from "@/lib/portfolio/records";
import { sampleResume } from "@/lib/portfolio/testing";
import { PUT as putContent } from "./portfolio/content/route";
import { PATCH as patchPortfolio, POST as createPortfolio } from "./portfolio/route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("next/cache", () => ({
  revalidateTag: () => {},
  revalidatePath: () => {},
  unstable_cache: <T>(load: () => Promise<T>) => load,
}));

const CHANGED = {
  code: "bad_request",
  message: "Your page changed while it was saving. Try again.",
};

let duringCheck: () => Promise<void>;
let checks = 0;

const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
  const body = JSON.parse(String(init?.body)) as { model?: string };
  if (
    String(input) !== "https://openrouter.ai/api/v1/chat/completions" ||
    body.model !== MODERATION_MODEL
  ) {
    throw new Error(`unexpected request to ${String(input)}`);
  }
  checks += 1;
  await duringCheck();
  return Response.json({ choices: [{ message: { content: "safe" } }] });
});

function send(handler: (req: Request) => Promise<Response>, method: string, body: unknown) {
  return handler(
    new Request("http://localhost/api/portfolio", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

async function proWithPortfolio() {
  const user = await setPlan(await signInAs("maya@example.com"), "pro");
  const res = await createPortfolio(jsonRequest("/api/portfolio", { resume: sampleResume() }));
  expect(res.status).toBe(201);
  return user;
}

// Another tab's save: only the version moves, so every try's write finds the page changed.
function otherTabSavesEachCheck(userId: string, times = Infinity) {
  let saves = 0;
  duringCheck = async () => {
    if (saves >= times) return;
    saves += 1;
    const later = (await getPortfolio(userId))!.updatedAt + 1;
    await saveContent(userId, { ...emptyContent(), pitch: `Other tab, save ${saves}` }, later);
  };
}

beforeEach(async () => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
  checks = 0;
  duringCheck = async () => {};
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
  resetEnvForTests();
  await resetDb();
  cookieJar.clear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetEnvForTests();
});

describe("a public page that keeps changing while it's checked", () => {
  it("gives up publishing after three tries, keeps it private and keeps the other tab's edit", async () => {
    const user = await proWithPortfolio();
    otherTabSavesEachCheck(user.id);

    const res = await send(patchPortfolio, "PATCH", { published: true });
    expect(res.status).toBe(409);
    expect(await errorOf(res)).toEqual(CHANGED);
    expect(checks).toBe(3);
    expect(await getPortfolio(user.id)).toMatchObject({
      published: false,
      publishedAt: null,
      content: { pitch: "Other tab, save 3" },
    });

    duringCheck = async () => {};
    const retry = await send(patchPortfolio, "PATCH", { published: true });
    expect(retry.status).toBe(200);
    expect(await getPortfolio(user.id)).toMatchObject({
      published: true,
      content: { pitch: "Other tab, save 3" },
    });
  });

  it("publishes on the next try when the page changed only once, checking the newer copy", async () => {
    const user = await proWithPortfolio();
    otherTabSavesEachCheck(user.id, 1);

    const res = await send(patchPortfolio, "PATCH", { published: true });
    expect(res.status).toBe(200);
    expect(checks).toBe(2);
    const sent = fetchMock.mock.calls.map(([, init]) => String(init?.body));
    expect(sent[0]).not.toContain("Other tab, save 1");
    expect(sent[1]).toContain("Other tab, save 1");
    expect(await getPortfolio(user.id)).toMatchObject({
      published: true,
      content: { pitch: "Other tab, save 1" },
    });
  });

  it("won't overwrite a live page's newer edit with a content save that started earlier", async () => {
    const user = await proWithPortfolio();
    expect((await send(patchPortfolio, "PATCH", { published: true })).status).toBe(200);
    checks = 0;
    otherTabSavesEachCheck(user.id);

    const res = await send(putContent, "PUT", {
      content: { pitch: "I volunteer at a sexual health clinic" },
    });
    expect(res.status).toBe(409);
    expect(await errorOf(res)).toEqual(CHANGED);
    expect(checks).toBe(3);
    expect(await getPortfolio(user.id)).toMatchObject({
      published: true,
      content: { pitch: "Other tab, save 3" },
    });
  });
});
