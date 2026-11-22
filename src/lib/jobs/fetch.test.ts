import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JobReadError, type JobReadReason } from "./errors";
import { FETCH_LIMITS, safeFetch, USER_AGENT } from "./fetch";
import { fakeNet } from "./test-network";

vi.mock("node:dns", async (importOriginal) =>
  (await import("./test-network")).dnsMock(await importOriginal()),
);
vi.mock("./transport", async () => (await import("./test-network")).transportMock);

const PUBLIC_IP = "93.184.216.34";

async function reasonOf(promise: Promise<unknown>): Promise<JobReadReason | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    if (!(error instanceof JobReadError)) throw error;
    return error.reason;
  }
}

const html = (url: string) => safeFetch(new URL(url), { kind: "html" });

beforeEach(() => {
  fakeNet.reset();
  fakeNet.resolve("jobs.example.com", PUBLIC_IP, "2606:2800:220:1:248:1893:25c8:1946");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("safeFetch", () => {
  it("connects only to the checked addresses and says who it is", async () => {
    fakeNet.html("https://jobs.example.com/1", "<p>Hello</p>");
    const page = await html("https://jobs.example.com/1");
    expect(page.body).toBe("<p>Hello</p>");
    const [request] = fakeNet.requests;
    expect(request?.addresses).toEqual([
      { address: PUBLIC_IP, family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ]);
    expect(request?.headers["user-agent"]).toBe(USER_AGENT);
    expect(USER_AGENT).not.toMatch(/@|mozilla/i);
    expect(Object.keys(request?.headers ?? {})).not.toContain("cookie");
  });

  it.each([
    "https://127.0.0.1/",
    "https://10.0.0.1/",
    "https://169.254.169.254/latest/meta-data/",
    "https://[::1]/",
    "https://[::ffff:127.0.0.1]/",
    "http://localhost/",
  ])("never connects to %s", async (url) => {
    expect(await reasonOf(html(url))).toBe("private_address");
    expect(fakeNet.requests).toHaveLength(0);
  });

  it("refuses a host when any DNS answer is private", async () => {
    fakeNet.resolve("sneaky.example.com", PUBLIC_IP, "10.0.0.5");
    fakeNet.resolve("v6.example.com", "::ffff:127.0.0.1");
    fakeNet.resolve("metadata.example.com", "169.254.169.254");
    for (const host of ["sneaky.example.com", "v6.example.com", "metadata.example.com"]) {
      expect(await reasonOf(html(`https://${host}/`))).toBe("private_address");
    }
    expect(fakeNet.requests).toHaveLength(0);
  });

  it("checks every redirect again", async () => {
    fakeNet.resolve("internal.example.net", "192.168.1.10");
    fakeNet.redirect("https://jobs.example.com/a", "https://internal.example.net/admin");
    expect(await reasonOf(html("https://jobs.example.com/a"))).toBe("private_address");

    fakeNet.redirect("https://jobs.example.com/b", "http://169.254.169.254/latest/meta-data/");
    expect(await reasonOf(html("https://jobs.example.com/b"))).toBe("private_address");
    expect(fakeNet.urls()).toEqual(["https://jobs.example.com/a", "https://jobs.example.com/b"]);

    fakeNet.redirect("https://jobs.example.com/c", "file:///etc/passwd");
    expect(await reasonOf(html("https://jobs.example.com/c"))).toBe("unreachable");
    fakeNet.redirect("https://jobs.example.com/d", "https://jobs.example.com:8443/");
    expect(await reasonOf(html("https://jobs.example.com/d"))).toBe("unreachable");
    expect(fakeNet.requests).toHaveLength(4);
  });

  it("follows up to 3 redirects, upgrading http to https", async () => {
    fakeNet.redirect("https://jobs.example.com/1", "/2", 301);
    fakeNet.redirect("https://jobs.example.com/2", "http://jobs.example.com/3", 307);
    fakeNet.redirect("https://jobs.example.com/3", "https://jobs.example.com/4", 308);
    fakeNet.html("https://jobs.example.com/4", "<p>Done</p>");
    const page = await html("https://jobs.example.com/1");
    expect(page.url.toString()).toBe("https://jobs.example.com/4");

    fakeNet.redirect("https://jobs.example.com/4", "https://jobs.example.com/5");
    expect(await reasonOf(html("https://jobs.example.com/1"))).toBe("unreachable");
  });

  it("maps HTTP errors to reasons", async () => {
    const cases: [number, JobReadReason][] = [
      [401, "login_required"],
      [403, "blocked"],
      [429, "blocked"],
      [999, "blocked"],
      [404, "not_found"],
      [410, "not_found"],
      [500, "unreachable"],
    ];
    for (const [status, reason] of cases) {
      fakeNet.html(`https://jobs.example.com/${status}`, "nope", status);
      expect(await reasonOf(html(`https://jobs.example.com/${status}`))).toBe(reason);
    }
  });

  it("only takes HTML for pages and JSON for APIs", async () => {
    fakeNet.route("https://jobs.example.com/job.pdf", {
      headers: { "content-type": "application/pdf" },
      body: "%PDF",
    });
    expect(await reasonOf(html("https://jobs.example.com/job.pdf"))).toBe("not_a_page");
    fakeNet.route("https://jobs.example.com/none", { body: "?" });
    expect(await reasonOf(html("https://jobs.example.com/none"))).toBe("not_a_page");

    fakeNet.html("https://jobs.example.com/api", "<p>Error</p>");
    expect(
      await reasonOf(safeFetch(new URL("https://jobs.example.com/api"), { kind: "json" })),
    ).toBe("unreachable");
    fakeNet.json("https://jobs.example.com/api", { ok: true });
    const api = await safeFetch(new URL("https://jobs.example.com/api"), { kind: "json" });
    expect(JSON.parse(api.body)).toEqual({ ok: true });
  });

  it("posts JSON when asked, and never replays a post on a redirect", async () => {
    fakeNet.json("https://jobs.example.com/search", { ok: true });
    const res = await safeFetch(new URL("https://jobs.example.com/search"), {
      kind: "json",
      json: { offset: 20 },
    });
    expect(res.body).toBe('{"ok":true}');
    const [request] = fakeNet.requests;
    expect(request?.body).toBe('{"offset":20}');
    expect(request?.headers).toMatchObject({
      "content-type": "application/json",
      "content-length": "13",
      "accept-language": "en-US,en;q=0.9",
    });
    fakeNet.redirect("https://jobs.example.com/moved", "https://jobs.example.com/search", 307);
    const moved = safeFetch(new URL("https://jobs.example.com/moved"), { kind: "json", json: {} });
    expect(await reasonOf(moved)).toBe("unreachable");
    expect(fakeNet.requests).toHaveLength(2);
    expect(fakeNet.requests.every((sent) => sent.body !== undefined)).toBe(true);
  });

  it("reads plain text, such as robots.txt", async () => {
    fakeNet.route("https://jobs.example.com/robots.txt", {
      headers: { "content-type": "text/plain;charset=ISO-8859-1" },
      body: "User-agent: *",
    });
    const res = await safeFetch(new URL("https://jobs.example.com/robots.txt"), { kind: "text" });
    expect(res.body).toBe("User-agent: *");
    expect(fakeNet.requests[0]?.body).toBeUndefined();
  });

  it("stops at 2 MB, whether or not the size is declared", async () => {
    const big = FETCH_LIMITS.maxBytes + 1;
    fakeNet.route("https://jobs.example.com/declared", {
      headers: { "content-type": "text/html", "content-length": String(big) },
      body: "<p>small</p>",
    });
    expect(await reasonOf(html("https://jobs.example.com/declared"))).toBe("too_large");

    const chunk = new Uint8Array(512 * 1024);
    fakeNet.route("https://jobs.example.com/streamed", {
      headers: { "content-type": "text/html" },
      body: [chunk, chunk, chunk, chunk, new Uint8Array(1)],
    });
    expect(await reasonOf(html("https://jobs.example.com/streamed"))).toBe("too_large");

    fakeNet.route("https://jobs.example.com/exact", {
      headers: { "content-type": "text/html" },
      body: [chunk, chunk, chunk, chunk],
    });
    expect((await html("https://jobs.example.com/exact")).body).toHaveLength(FETCH_LIMITS.maxBytes);
  });

  it("gives up after 8 seconds, on a slow body or a silent server", async () => {
    vi.useFakeTimers();
    fakeNet.route("https://jobs.example.com/slow", {
      headers: { "content-type": "text/html" },
      stallBody: true,
    });
    const slow = reasonOf(html("https://jobs.example.com/slow"));
    await vi.advanceTimersByTimeAsync(FETCH_LIMITS.timeoutMs);
    expect(await slow).toBe("timeout");

    fakeNet.route("https://jobs.example.com/silent", { stallConnect: true });
    const silent = reasonOf(html("https://jobs.example.com/silent"));
    await vi.advanceTimersByTimeAsync(FETCH_LIMITS.timeoutMs - 1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await silent).toBe("timeout");
  });

  it("honors a shared deadline that is already spent", async () => {
    fakeNet.html("https://jobs.example.com/1", "<p>Hi</p>");
    const reason = await reasonOf(
      safeFetch(new URL("https://jobs.example.com/1"), { kind: "html", deadline: Date.now() - 1 }),
    );
    expect(reason).toBe("timeout");
    expect(fakeNet.requests).toHaveLength(0);
  });

  it("reports hosts that don't resolve as unreachable", async () => {
    expect(await reasonOf(html("https://nowhere.example.org/"))).toBe("unreachable");
  });

  it("decodes the declared charset", async () => {
    fakeNet.route("https://jobs.example.com/latin", {
      headers: { "content-type": "text/html; charset=ISO-8859-1" },
      body: [new Uint8Array([0x63, 0x61, 0x66, 0xe9])],
    });
    expect((await html("https://jobs.example.com/latin")).body).toBe("café");
  });
});
