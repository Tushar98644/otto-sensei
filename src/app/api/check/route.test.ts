import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ANON_LIMITS, UPLOAD_LIMITS } from "@/config/plans";
import type { ApiErrorBody, CheckResponse } from "@/lib/api/types";
import { cookieJar, resetDb } from "@/lib/auth/test-helpers";
import { blankPdf, cleanResumePdf, templateDocx } from "@/lib/parse/test-fixtures";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const NOW = Date.UTC(2026, 10, 7, 12, 0, 0, 7);

let resumePdf: File;
let onePagePdf: File;

function file(bytes: Uint8Array, name: string): File {
  return new File([new Uint8Array(bytes)], name);
}

function check(entry: Blob, name = "resume.pdf"): Request {
  const form = new FormData();
  form.append("file", entry, name);
  return new Request("http://localhost/api/check", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.7" },
    body: form,
  });
}

beforeAll(async () => {
  resumePdf = file(await cleanResumePdf(), "resume.pdf");
  onePagePdf = file(await blankPdf(1), "page.pdf");
});

beforeEach(async () => {
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/check", () => {
  it("returns only the recruiter report for a PDF", async () => {
    const res = await POST(check(resumePdf));
    expect(res.status).toBe(200);
    const body = (await res.json()) as CheckResponse;
    expect(Object.keys(body).sort()).toEqual(["ok", "report"]);
    expect(body.report).toMatchObject({ kind: "pdf", pageCount: 1, checkedAt: NOW });
    expect(body.report.checks).toHaveLength(13);
    expect(body.report.counts.fail).toBe(0);
  });

  it("flags the problems in a template-style Word file", async () => {
    const res = await POST(check(file(await templateDocx(), "sam.docx"), "sam.docx"));
    expect(res.status).toBe(200);
    const { report } = (await res.json()) as CheckResponse;
    expect(report.kind).toBe("docx");
    expect(report.counts.fail).toBeGreaterThan(0);
    expect(report.checks.find((item) => item.id === "text-boxes")?.status).toBe("fail");
  });

  it("refuses unsupported and oversized files", async () => {
    const text = await POST(check(new Blob(["hello"]), "notes.txt"));
    expect(text.status).toBe(415);
    expect(((await text.json()) as ApiErrorBody).error.code).toBe("unsupported_type");

    const big = await POST(check(new Blob([new Uint8Array(UPLOAD_LIMITS.maxBytes + 1)])));
    expect(big.status).toBe(413);
  });

  it("refuses files another website's page sent", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const form = new FormData();
    form.append("file", resumePdf, "resume.pdf");
    const res = await POST(
      new Request("http://localhost/api/check", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.7", "sec-fetch-site": "cross-site" },
        body: form,
      }),
    );
    expect(res.status).toBe(403);
    expect(((await res.json()) as ApiErrorBody).error.code).toBe("forbidden");
    expect(cookieJar.has("otto_did")).toBe(false);
    warn.mockRestore();
  });

  it(`allows ${ANON_LIMITS.checksPerDay} checks a day per device`, async () => {
    for (let i = 0; i < ANON_LIMITS.checksPerDay; i++) {
      expect((await POST(check(onePagePdf))).status).toBe(200);
    }
    const res = await POST(check(onePagePdf));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBe(12 * 60 * 60);
    expect(((await res.json()) as ApiErrorBody).error).toEqual({
      code: "rate_limited",
      message: "You've checked a lot of files today. Try again in 12 hours.",
    });
  });
});
