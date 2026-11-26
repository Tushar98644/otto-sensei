import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Beacon } from "./beacon";

const config = vi.hoisted(() => ({ key: "phc_test" as string | undefined }));
vi.mock("./config", () => ({ posthogKey: () => config.key }));

type Client = typeof import("./client");

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type Page = {
  sent: Beacon[];
  idle: Array<() => void>;
  store: Map<string, string>;
  hide: () => void;
  close: () => void;
  restore: () => void;
  scrollTo: (y: number) => void;
  answer: { identified: boolean };
  location: { search: string; href: string; hostname: string };
};

function stubBrowser({
  navigator = { doNotTrack: null } as Record<string, unknown>,
  search = "",
  referrer = "",
  coarse = false,
  blockStorage = false,
  layout = undefined as { height: number; view: number } | undefined,
} = {}): Page {
  const store = new Map<string, string>();
  const idle: Array<() => void> = [];
  const listeners: Array<() => void> = [];
  const windowListeners = new Map<string, Array<(event: { persisted: boolean }) => void>>();
  const fire = (type: string, persisted: boolean) => {
    for (const listener of windowListeners.get(type) ?? []) listener({ persisted });
  };
  const page: Page = {
    sent: [],
    idle,
    store,
    answer: { identified: false },
    location: { search, href: `https://otto.example/dashboard${search}`, hostname: "otto.example" },
    hide: () => {
      document.visibilityState = "hidden";
      for (const listener of listeners) listener();
    },
    close: () => fire("pagehide", false),
    restore: () => fire("pageshow", true),
    scrollTo: (y: number) => {
      (window as unknown as { scrollY: number }).scrollY = y;
      fire("scroll", false);
    },
  };
  const storage = {
    getItem: (key: string) => {
      if (blockStorage) throw new Error("blocked");
      return store.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (blockStorage) throw new Error("blocked");
      store.set(key, value);
    },
    removeItem: (key: string) => void store.delete(key),
  };
  const document = {
    referrer,
    visibilityState: "visible",
    addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
    ...(layout ? { documentElement: { scrollHeight: layout.height } } : {}),
  };
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", {
    ...(layout ? { scrollY: 0, innerHeight: layout.view } : {}),
    navigator,
    location: page.location,
    localStorage: storage,
    screen: { width: 390, height: 844 },
    matchMedia: () => ({ matches: coarse }),
    history: {
      state: null,
      replaceState: (_state: unknown, _title: string, href: string) => {
        const url = new URL(href);
        page.location.href = href;
        page.location.search = url.search;
      },
    },
    requestIdleCallback: (run: () => void) => idle.push(run),
    addEventListener: (type: string, listener: (event: { persisted: boolean }) => void) =>
      windowListeners.set(type, [...(windowListeners.get(type) ?? []), listener]),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      page.sent.push(JSON.parse(String(init.body)) as Beacon);
      return { ok: true, json: async () => ({ ok: true, noted: true, ...page.answer }) };
    }),
  );
  return page;
}

async function loadClient(): Promise<Client> {
  const client = await import("./client");
  client.resetAnalyticsForTests();
  return client;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function runIdle(page: Page) {
  for (const run of page.idle.splice(0)) run();
}

beforeEach(() => {
  vi.resetModules();
  config.key = "phc_test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("when it may not send", () => {
  it("sends nothing without a key", async () => {
    config.key = undefined;
    const page = stubBrowser();
    const client = await loadClient();
    expect(client.analyticsEnabled()).toBe(false);
    client.trackPageView("/", "/");
    client.track("landing_viewed");
    runIdle(page);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is off on the server", async () => {
    vi.stubGlobal("window", undefined);
    const client = await loadClient();
    expect(client.analyticsEnabled()).toBe(false);
  });

  it.each([
    { doNotTrack: "1" },
    { doNotTrack: null, globalPrivacyControl: true },
    { doNotTrack: null, webdriver: true },
  ])("sends nothing for %o", async (navigator) => {
    const page = stubBrowser({ navigator });
    const client = await loadClient();
    client.trackPageView("/pricing", "/pricing");
    client.track("resume_imported", { source: "pdf" });
    runIdle(page);
    expect(page.idle).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("page views", () => {
  it("sends the page template, device and the referring site's name in one idle beacon", async () => {
    const page = stubBrowser({
      search: "?utm_source=newsletter&utm_campaign=spring&gclid=abc",
      referrer: "https://www.google.com/search?q=jane+doe+resume",
      coarse: true,
    });
    const client = await loadClient();
    client.setPageRoute("/resume-examples/[role]");
    client.track("landing_viewed");
    client.trackPageView("/resume-examples/[role]", "/resume-examples/nurse");
    expect(fetch).not.toHaveBeenCalled();

    runIdle(page);
    expect(page.sent).toHaveLength(1);
    const [beacon] = page.sent;
    expect(beacon?.visitor).toMatch(UUID_V7);
    expect(beacon?.session).toMatch(UUID_V7);
    expect(beacon?.linked).toBe(false);
    expect(beacon?.items).toEqual([
      { type: "event", event: "landing_viewed", route: "/resume-examples/[role]" },
      {
        type: "view",
        route: "/resume-examples/[role]",
        device: "Mobile",
        referrer: "www.google.com",
        utm: { utm_source: "newsletter", utm_campaign: "spring" },
      },
    ]);
  });

  it("names the referrer only for the page the visitor arrived on", async () => {
    const page = stubBrowser({ referrer: "https://news.ycombinator.com/item?id=1" });
    const client = await loadClient();
    client.trackPageView("/", "/");
    runIdle(page);
    client.trackPageView("/pricing", "/pricing");
    runIdle(page);
    expect(page.sent.map((beacon) => beacon.items.find((item) => item.type === "view"))).toEqual([
      { type: "view", route: "/", device: "Desktop", referrer: "news.ycombinator.com" },
      { type: "view", route: "/pricing", device: "Desktop" },
    ]);
  });

  it("leaves our own site out as a referrer", async () => {
    const page = stubBrowser({ referrer: "https://otto.example/pricing" });
    const client = await loadClient();
    client.trackPageView("/login", "/login");
    runIdle(page);
    expect(page.sent[0]?.items[0]).toEqual({ type: "view", route: "/login", device: "Desktop" });
  });

  it("adds the time zone on app pages and takes our email's tags off the address", async () => {
    const page = stubBrowser({
      search: "?utm_source=otto&utm_medium=email&utm_campaign=weekly_jobs&utm_content=tailor",
    });
    const client = await loadClient();
    client.trackPageView("/dashboard/jobs", "/dashboard/jobs");
    runIdle(page);
    expect(page.sent[0]?.items[0]).toMatchObject({
      type: "view",
      route: "/dashboard/jobs",
      timeZone: expect.any(String),
      email: { campaign: "weekly_jobs", link: "tailor" },
    });
    expect(page.location.search).toBe("");
  });
});

describe("leaving a page", () => {
  it("notes how long the last page was open, just before the next page's view", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.UTC(2026, 10, 25, 9));
    const page = stubBrowser();
    const client = await loadClient();
    client.trackPageView("/", "/");
    runIdle(page);
    vi.setSystemTime(Date.UTC(2026, 10, 25, 9, 0, 42));
    client.trackPageView("/pricing", "/pricing");
    runIdle(page);
    expect(page.sent[1]?.items).toEqual([
      { type: "leave", route: "/", seconds: 42 },
      { type: "view", route: "/pricing", device: "Desktop" },
    ]);
  });

  it("sends the leave at once when the tab closes, and only once", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.UTC(2026, 10, 25, 9));
    const page = stubBrowser();
    const client = await loadClient();
    client.trackPageView("/pricing", "/pricing");
    runIdle(page);
    vi.setSystemTime(Date.UTC(2026, 10, 25, 9, 0, 7));
    page.close();
    page.close();
    expect(page.sent.slice(1).map((beacon) => beacon.items)).toEqual([
      [{ type: "leave", route: "/pricing", seconds: 7 }],
    ]);
  });

  it("sends how far down the page was read, for the scroll depth report", async () => {
    const page = stubBrowser({ layout: { height: 3000, view: 800 } });
    const client = await loadClient();
    client.trackPageView("/", "/");
    runIdle(page);
    page.scrollTo(1100);
    page.scrollTo(400);
    page.close();
    expect(page.sent.at(-1)?.items).toEqual([
      {
        type: "leave",
        route: "/",
        seconds: 0,
        scroll: {
          lastY: 400,
          maxY: 1100,
          maxHeight: 2200,
          lastContent: 1200,
          maxContent: 1900,
          contentHeight: 3000,
        },
      },
    ]);
  });

  it("counts again from when the page comes back from the browser's cache", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.UTC(2026, 10, 25, 9));
    const page = stubBrowser();
    const client = await loadClient();
    client.trackPageView("/", "/");
    runIdle(page);
    page.close();
    vi.setSystemTime(Date.UTC(2026, 10, 25, 10));
    page.restore();
    vi.setSystemTime(Date.UTC(2026, 10, 25, 10, 0, 5));
    page.close();
    expect(page.sent.at(-1)?.items).toEqual([{ type: "leave", route: "/", seconds: 5 }]);
  });
});

describe("the visitor id", () => {
  it("keeps one id across beacons and marks it linked once the server has joined it to the account", async () => {
    const page = stubBrowser();
    const client = await loadClient();
    page.answer.identified = true;
    client.trackPageView("/dashboard", "/dashboard");
    runIdle(page);
    await settle();
    page.answer.identified = false;
    client.trackPageView("/dashboard/jobs", "/dashboard/jobs");
    runIdle(page);

    const [first, second] = page.sent;
    expect(second?.visitor).toBe(first?.visitor);
    expect([first?.linked, second?.linked]).toEqual([false, true]);
  });

  it("starts a new id after signing out", async () => {
    const page = stubBrowser();
    const client = await loadClient();
    client.trackPageView("/", "/");
    runIdle(page);
    client.resetUser();
    client.trackPageView("/", "/");
    runIdle(page);
    expect(page.sent[1]?.visitor).not.toBe(page.sent[0]?.visitor);
    expect(page.sent[1]?.linked).toBe(false);
  });

  it("starts a new session after half an hour away", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.UTC(2026, 10, 22, 9));
    const page = stubBrowser();
    const client = await loadClient();
    client.trackPageView("/", "/");
    runIdle(page);
    vi.setSystemTime(Date.UTC(2026, 10, 22, 9, 20));
    client.trackPageView("/pricing", "/pricing");
    runIdle(page);
    vi.setSystemTime(Date.UTC(2026, 10, 22, 10));
    client.trackPageView("/", "/");
    runIdle(page);

    const sessions = page.sent.map((beacon) => beacon.session);
    expect(sessions[1]).toBe(sessions[0]);
    expect(sessions[2]).not.toBe(sessions[1]);
    expect(new Set(page.sent.map((beacon) => beacon.visitor)).size).toBe(1);
  });

  it("keeps one id for the visit when storage is blocked", async () => {
    const page = stubBrowser({ blockStorage: true });
    const client = await loadClient();
    client.trackPageView("/", "/");
    runIdle(page);
    client.trackPageView("/pricing", "/pricing");
    runIdle(page);
    expect(page.sent[0]?.visitor).toMatch(UUID_V7);
    expect(page.sent[1]?.visitor).toBe(page.sent[0]?.visitor);
  });
});

describe("sending", () => {
  it("sends what is queued at once when the page is hidden", async () => {
    const page = stubBrowser();
    const client = await loadClient();
    client.setPageRoute("/studio");
    client.track("pdf_downloaded", { page_size: "A4" });
    page.hide();
    expect(page.sent[0]?.items).toEqual([
      { type: "event", event: "pdf_downloaded", route: "/studio", props: { page_size: "A4" } },
    ]);
    runIdle(page);
    expect(page.sent).toHaveLength(1);
  });

  it("sends web vitals straight away", async () => {
    const page = stubBrowser();
    const client = await loadClient();
    client.trackVitals("/pricing", { LCP: 1200, CLS: 0.02 });
    expect(page.sent[0]?.items).toEqual([
      { type: "vitals", route: "/pricing", metrics: { LCP: 1200, CLS: 0.02 } },
    ]);
  });

  it("goes to our own address as same-origin JSON that outlives the page", async () => {
    const page = stubBrowser();
    const client = await loadClient();
    client.trackPageView("/", "/");
    runIdle(page);
    expect(fetch).toHaveBeenCalledWith("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.any(String),
      credentials: "same-origin",
      keepalive: true,
    });
  });
});
