import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { IP_LIMITS, UPLOAD_LIMITS } from "@/config/plans";
import { getDb } from "@/db/client";
import { rateLimits, usage } from "@/db/schema";
import type { ApiErrorBody, CheckResponse } from "@/lib/api/types";
import { cookieJar, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { extractDocument } from "@/lib/parse";
import { blankPdf, cleanResumePdf, encryptedPdf } from "@/lib/parse/test-fixtures";
import { DAY_MS } from "@/lib/time";
import { getUsage } from "@/lib/usage";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/parse", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/parse")>();
  return { ...actual, extractDocument: vi.fn(actual.extractDocument) };
});

const NOW = Date.UTC(2026, 10, 7, 12, 0, 0, 7);
const WINDOW = Math.floor(NOW / DAY_MS) * DAY_MS;
const IP = "203.0.113.7";
const DEVICE_COOKIE = "otto_did";
const NO_FILE = { code: "bad_request", message: "Choose a PDF or Word (.docx) file to upload." };

let resumePdf: File;

function request(body: BodyInit, ip = IP, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/check", {
    method: "POST",
    headers: { "x-forwarded-for": ip, ...headers },
    body,
  });
}

function check(entry: Blob | string | null, ip = IP, name = "resume.pdf"): Request {
  const form = new FormData();
  if (typeof entry === "string") form.append("file", entry);
  else if (entry) form.append("file", entry, name);
  return request(form, ip);
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

async function counters() {
  const rows = await (await getDb()).select().from(rateLimits);
  return Object.fromEntries(
    rows.map((row) => [row.key.replace(/:device:.*/, ":device"), row.count]),
  );
}

async function networkAlreadyAt(bucket: string, count: number) {
  await (
    await getDb()
  )
    .insert(rateLimits)
    .values({ key: `check:ip:${bucket}`, windowStart: WINDOW, count });
}

beforeAll(async () => {
  resumePdf = new File([new Uint8Array(await cleanResumePdf())], "resume.pdf");
});

beforeEach(async () => {
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("POST /api/check without a usable file", () => {
  it("asks for a file, and doesn't use up one of the day's checks", async () => {
    const json = await POST(
      request(JSON.stringify({ file: "resume.pdf" }), IP, { "content-type": "application/json" }),
    );
    expect(json.status).toBe(400);
    expect(await errorOf(json)).toEqual(NO_FILE);

    const missing = await POST(check(null));
    expect(missing.status).toBe(400);
    expect(await errorOf(missing)).toEqual(NO_FILE);

    const text = await POST(check("Jane Doe, engineer"));
    expect(text.status).toBe(400);
    expect(await errorOf(text)).toEqual(NO_FILE);

    const empty = await POST(check(new Blob([])));
    expect(empty.status).toBe(400);
    expect(await errorOf(empty)).toEqual({
      code: "bad_request",
      message: "That file is empty. Choose your resume and try again.",
    });

    expect(await counters()).toEqual({});
    expect(cookieJar.has(DEVICE_COOKIE)).toBe(false);
  });

  it("refuses a body declared over the size limit before reading it", async () => {
    const res = await POST(
      request("--x--", IP, {
        "content-type": "multipart/form-data; boundary=x",
        "content-length": String(UPLOAD_LIMITS.maxBytes * 10),
      }),
    );
    expect(res.status).toBe(413);
    expect(await errorOf(res)).toEqual({
      code: "too_large",
      message: "That file is over 4 MB. Try a smaller copy.",
    });
    expect(await counters()).toEqual({});
  });

  it("reports locked and overlong PDFs as unreadable, each using one check", async () => {
    const locked = await POST(
      check(new Blob([new Uint8Array(await encryptedPdf())]), IP, "locked.pdf"),
    );
    expect(locked.status).toBe(422);
    expect(await errorOf(locked)).toMatchObject({
      code: "parse_failed",
      message: expect.stringContaining("password"),
    });

    const book = await POST(
      check(new Blob([new Uint8Array(await blankPdf(UPLOAD_LIMITS.maxPages + 1))]), IP, "book.pdf"),
    );
    expect(book.status).toBe(422);
    expect(await errorOf(book)).toEqual({
      code: "parse_failed",
      message: `That file has more than ${UPLOAD_LIMITS.maxPages} pages. Most resumes are 1-2 pages.`,
    });

    expect(await counters()).toEqual({ [`check:ip:${IP}`]: 2, "check:device": 2 });
  });
});

describe("POST /api/check network limits", () => {
  it(`stops a network after ${IP_LIMITS.checksPerDay} checks a day, before handing out a device id`, async () => {
    await networkAlreadyAt(IP, IP_LIMITS.checksPerDay);

    const res = await POST(check(resumePdf));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe(String(12 * 60 * 60));
    expect(await errorOf(res)).toEqual({
      code: "rate_limited",
      message: "You've checked a lot of files today. Try again in 12 hours.",
    });
    expect(cookieJar.has(DEVICE_COOKIE)).toBe(false);
    expect(await counters()).toEqual({ [`check:ip:${IP}`]: IP_LIMITS.checksPerDay + 1 });

    expect((await POST(check(resumePdf, "198.51.100.4"))).status).toBe(200);
  });

  it("counts IPv6 visitors by their /64, so a new address in the same block is still limited", async () => {
    await networkAlreadyAt("2001:db8:1:2::/64", IP_LIMITS.checksPerDay);

    expect((await POST(check(resumePdf, "2001:db8:1:2:aaaa::1"))).status).toBe(429);
    expect((await POST(check(resumePdf, "2001:db8:1:2:bbbb::2"))).status).toBe(429);
    expect((await POST(check(resumePdf, "2001:db8:1:3::1"))).status).toBe(200);
  });

  it("starts a fresh allowance the next day", async () => {
    await networkAlreadyAt(IP, IP_LIMITS.checksPerDay);
    expect((await POST(check(resumePdf))).status).toBe(429);

    vi.setSystemTime(WINDOW + DAY_MS);
    expect((await POST(check(resumePdf))).status).toBe(200);
  });

  it("still checks the file when the rate limit store is down", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(await getDb(), "insert").mockImplementation(() => {
      throw new Error("connection terminated unexpectedly");
    });

    const res = await POST(check(resumePdf));
    expect(res.status).toBe(200);
    const { report } = (await res.json()) as CheckResponse;
    expect(report).toMatchObject({ kind: "pdf", pageCount: 1, checkedAt: NOW });
    expect(warn).toHaveBeenCalledWith("[warn] check.rate_limit_unavailable", expect.anything());
    expect(JSON.stringify(warn.mock.calls)).not.toContain(IP);
  });
});

describe("POST /api/check for signed-in users", () => {
  it("checks a Free user's file without spending any of their plan's allowance", async () => {
    const user = await signInAs("ada@example.com");

    const res = await POST(check(resumePdf));
    expect(res.status).toBe(200);
    expect(((await res.json()) as CheckResponse).report.counts.fail).toBe(0);
    expect(Object.values(await getUsage(user)).every((item) => item.used === 0)).toBe(true);
    expect(await (await getDb()).select().from(usage)).toEqual([]);
  });
});

describe("POST /api/check when the checker breaks", () => {
  it("answers a plain 500 without the internal error, and logs it", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.mocked(extractDocument).mockRejectedValueOnce(
      new Error("pdfjs worker crashed in /var/task/chunks/pdf.worker.js"),
    );

    const res = await POST(check(resumePdf));
    expect(res.status).toBe(500);
    const body = (await res.json()) as ApiErrorBody;
    expect(body).toEqual({
      ok: false,
      error: {
        code: "server_error",
        message: "Something went wrong checking that file. Please try again.",
      },
    });
    expect(JSON.stringify(body)).not.toContain("pdfjs");
    expect(errors).toHaveBeenCalledWith(
      "[error] check.failed",
      expect.objectContaining({ errorMessage: expect.stringContaining("worker crashed") }),
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain("check.completed");

    expect((await POST(check(resumePdf))).status).toBe(200);
  });
});

describe("POST /api/check logs", () => {
  it("logs the file's shape and never its text", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    expect((await POST(check(resumePdf))).status).toBe(200);
    expect(info).toHaveBeenCalledWith("[info] check.completed", {
      kind: "pdf",
      pages: 1,
      bytes: resumePdf.size,
      fails: 0,
      durationMs: expect.any(Number),
    });
    const logged = JSON.stringify(info.mock.calls);
    expect(logged).not.toContain("Jane Doe");
    expect(logged).not.toContain("jane.doe@example.com");
  });
});
