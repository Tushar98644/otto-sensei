import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mightBeSexual, MODERATION_MODEL } from "@/lib/ai/moderation";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { emptyContent } from "./content";
import { saveContent } from "./content-records";
import { createPortfolio, getPortfolio, updatePortfolio } from "./records";
import { syncPortfolioWith } from "./sync";
import { sampleResume } from "./testing";

const later = vi.hoisted(() => ({ tasks: [] as (() => unknown)[], outsideRequest: false }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => {
    if (later.outsideRequest) throw new Error("`after` was called outside a request scope");
    later.tasks.push(task);
  },
}));

const purged = vi.hoisted(() => [] as string[]);
vi.mock("next/cache", () => ({
  revalidateTag: (tag: string) => void purged.push(tag),
  unstable_cache: <T>(load: () => Promise<T>) => load,
}));

type ChatBody = { model: string; messages: { content: string }[] };

const checked: string[] = [];
let guard: (text: string) => string | Promise<string> = () => "safe";

const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
  const body = JSON.parse(String(init?.body)) as ChatBody;
  if (body.model !== MODERATION_MODEL) throw new Error(`unexpected call to ${body.model}`);
  const text = body.messages[0]?.content ?? "";
  checked.push(text);
  return Response.json({ choices: [{ message: { content: await guard(text) } }] });
});

const CHECKED = "I volunteered as an escort for visiting students.";

async function answered(): Promise<void> {
  for (const task of later.tasks.splice(0)) await task();
}

async function followedPage({
  live = true,
  summary = CHECKED,
  basics = sampleResume().basics,
} = {}) {
  const user = await setPlan(await createUser("maya@example.com"), "pro");
  await createPortfolio(user.id, { resume: sampleResume({ summary, basics }) });
  if (live) await updatePortfolio(user.id, { published: true }, { plan: "pro" });
  purged.length = 0;
  return user;
}

const edited = (changes: Parameters<typeof sampleResume>[0]) =>
  sampleResume({ summary: CHECKED, updatedAt: 9_000, ...changes });

beforeEach(async () => {
  await resetDb();
  later.tasks.length = 0;
  later.outsideRequest = false;
  purged.length = 0;
  checked.length = 0;
  guard = () => "safe";
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
  resetEnvForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("syncPortfolioWith", () => {
  it("uses a checked line the word pre-check flags, so the already-checked tests mean something", () => {
    expect(mightBeSexual(CHECKED)).toBe(true);
    expect(mightBeSexual("I work out the kinks in our releases.")).toBe(true);
  });

  it("follows the resume once the backup has answered, then drops the live page's copy", async () => {
    const user = await followedPage();
    await syncPortfolioWith(user.id, edited({ summary: "Edited in the studio." }));
    expect((await getPortfolio(user.id))?.snapshot.summary).toBe(CHECKED);
    expect(later.tasks).toHaveLength(1);

    await answered();
    expect((await getPortfolio(user.id))?.snapshot.summary).toBe("Edited in the studio.");
    expect(purged).toEqual(["portfolio:maya-chen"]);
  });

  it("follows at once where there is no request to wait for", async () => {
    const user = await followedPage();
    later.outsideRequest = true;
    await syncPortfolioWith(user.id, edited({ summary: "Edited in a script." }));
    expect((await getPortfolio(user.id))?.snapshot.summary).toBe("Edited in a script.");
  });

  it("only marks the copy current when just the resume's name or tailoring changed", async () => {
    const user = await followedPage();
    const before = await getPortfolio(user.id);
    await syncPortfolioWith(user.id, edited({ title: "Renamed", tailor: null }));
    await answered();
    const after = await getPortfolio(user.id);
    expect(after?.updatedAt).toBe(before?.updatedAt);
    expect(after?.snapshot).toEqual({ ...before?.snapshot, updatedAt: 9_000 });
    expect(after?.versionAt).toBe(9_000);
    expect(purged).toEqual([]);
    expect(checked).toEqual([]);
  });

  it("keeps a draft page in step without dropping a copy nobody is served", async () => {
    const user = await followedPage({ live: false });
    await syncPortfolioWith(user.id, edited({ summary: "Draft edit." }));
    await answered();
    expect((await getPortfolio(user.id))?.snapshot.summary).toBe("Draft edit.");
    expect(purged).toEqual([]);
    expect(checked).toEqual([]);
  });

  it("sends a live page to the safety model only for new copy with a flagged word", async () => {
    const user = await followedPage();
    const basics = { ...sampleResume().basics, headline: "Frontend engineer, design systems" };
    await syncPortfolioWith(user.id, edited({ basics }));
    await answered();
    expect(checked).toEqual([]);
    expect((await getPortfolio(user.id))?.snapshot.basics.headline).toBe(basics.headline);

    const flagged = `${CHECKED}\n\nI work out the kinks in our releases.`;
    await syncPortfolioWith(user.id, edited({ basics, summary: flagged, updatedAt: 10_000 }));
    await answered();
    expect(checked).toHaveLength(1);
    expect(checked[0]).toContain("Frontend engineer, design systems");
    expect((await getPortfolio(user.id))?.snapshot.summary).toBe(flagged);
  });

  it("checks again when the page changes while it's being checked", async () => {
    const user = await followedPage();
    let first = true;
    guard = async () => {
      if (first) {
        first = false;
        const moved = (await getPortfolio(user.id))!.updatedAt + 1;
        await saveContent(user.id, { ...emptyContent(), pitch: "Saved meanwhile" }, moved);
      }
      return "safe";
    };
    await syncPortfolioWith(user.id, edited({ summary: "A sex-ed teacher at heart." }));
    await answered();
    expect(checked).toHaveLength(2);
    const page = await getPortfolio(user.id);
    expect(page?.snapshot.summary).toBe("A sex-ed teacher at heart.");
    expect(page?.content.pitch).toBe("Saved meanwhile");
    expect(purged).toEqual(["portfolio:maya-chen"]);
  });

  it("never lets an older save that's still being checked land over a newer one", async () => {
    const user = await followedPage();
    let release = () => {};
    guard = () => new Promise<string>((resolve) => (release = () => resolve("safe")));
    const flagged = `${CHECKED}\n\nI work out the kinks in our releases.`;
    await syncPortfolioWith(user.id, edited({ summary: flagged }));
    await syncPortfolioWith(user.id, edited({ title: "Took the line out", updatedAt: 10_000 }));
    const [older, newer] = later.tasks.splice(0);

    const checking = older!();
    await vi.waitFor(() => expect(checked).toHaveLength(1));
    await newer!();
    release();
    await checking;
    const page = await getPortfolio(user.id);
    expect(page?.snapshot.summary).toBe(CHECKED);
    expect(page?.versionAt).toBe(10_000);
    expect(purged).toEqual([]);
  });

  it("doesn't send lines the live page was already checked with, even inside an edited paragraph", async () => {
    const user = await followedPage();
    const summary = `${CHECKED}\n\nI like small teams.`;
    await syncPortfolioWith(user.id, edited({ summary }));
    await answered();
    expect(checked).toEqual([]);
    expect((await getPortfolio(user.id))?.snapshot.summary).toBe(summary);
  });

  it("still checks flagged copy the live page was never checked with, such as a link's label", async () => {
    const basics = {
      ...sampleResume().basics,
      links: [{ id: "l1", label: "Worked out the kinks", url: "example.com/bar" }],
    };
    const user = await followedPage({ basics });
    const [job] = sampleResume().experience;
    const bullets = [...job!.bullets, { id: "b9", text: "Worked out the kinks" }];
    await syncPortfolioWith(user.id, edited({ basics, experience: [{ ...job!, bullets }] }));
    await answered();
    expect(checked).toHaveLength(1);
  });
});
