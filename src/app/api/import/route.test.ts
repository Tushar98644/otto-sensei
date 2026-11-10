import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ANON_LIMITS, IP_LIMITS, PRO_TRIAL, UPLOAD_LIMITS } from "@/config/plans";
import { structureResume } from "@/lib/ai/structure";
import { AIError } from "@/lib/ai/types";
import type { ApiErrorBody, ImportResponse } from "@/lib/api/types";
import { cookieJar, resetDb, signInAs, signInOnTrial } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { getUsage } from "@/lib/usage";
import {
  blankPdf,
  cleanResumePdf,
  encryptedPdf,
  noTextPdf,
  templateDocx,
  twoColumnPdf,
} from "@/lib/parse/test-fixtures";
import { ResumeSchema } from "@/lib/resume/schema";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/structure", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/structure")>();
  return { ...actual, structureResume: vi.fn(actual.structureResume) };
});

// Midday UTC, so every request in a test lands in the same day window (12 hours left in it).
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0, 7);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let resumePdf: File;
let scanPdf: File;

function file(bytes: Uint8Array, name: string, type = ""): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function upload(
  entry: File | string | null,
  { ip = "203.0.113.7", reader }: { ip?: string; reader?: "ai" } = {},
): Request {
  const form = new FormData();
  if (entry !== null) form.append("file", entry);
  return new Request(`http://localhost/api/import${reader ? `?reader=${reader}` : ""}`, {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: form,
  });
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  const body = (await res.json()) as ApiErrorBody;
  expect(body.ok).toBe(false);
  return body.error;
}

beforeAll(async () => {
  resumePdf = file(await cleanResumePdf(), "jane-doe.pdf", "application/pdf");
  scanPdf = file(await noTextPdf(), "scan.pdf", "application/pdf");
});

beforeEach(async () => {
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/import", () => {
  it("turns a PDF into a valid resume plus the recruiter report", async () => {
    const res = await POST(upload(resumePdf));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ImportResponse;

    expect(body.ok).toBe(true);
    expect(body.usedAI).toBe(false);
    expect(ResumeSchema.safeParse(body.resume).success).toBe(true);
    expect(body.resume).toMatchObject({ source: "import", createdAt: NOW });
    expect(body.resume.basics.email).toBe("jane.doe@example.com");
    expect(body.resume.experience.length).toBeGreaterThan(0);

    expect(body.report).toMatchObject({ kind: "pdf", pageCount: 1, checkedAt: NOW });
    expect(body.report.readText).toContain("Jane Doe");
    expect(body.report.checks).toHaveLength(13);
    expect(body.report.counts.fail).toBe(0);
    // The device cookie the per-device limit counts against.
    expect(cookieJar.get("otto_did")?.value).toMatch(UUID);
  });

  it("reads Word files too", async () => {
    const res = await POST(upload(file(await templateDocx(), "sam.docx")));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ImportResponse;
    expect(body.report.kind).toBe("docx");
    expect(ResumeSchema.safeParse(body.resume).success).toBe(true);
    // The template's email sits only in the page header.
    expect(body.resume.basics.email).toBe("sam.rivera@example.com");
  });

  it("starts a scanned PDF as a blank imported resume without structuring it", async () => {
    vi.mocked(structureResume).mockClear();
    const res = await POST(upload(scanPdf));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ImportResponse;

    expect(structureResume).not.toHaveBeenCalled();
    expect(body.usedAI).toBe(false);
    expect(ResumeSchema.safeParse(body.resume).success).toBe(true);
    expect(body.resume).toMatchObject({ source: "import", summary: "", experience: [], createdAt: NOW });
    expect(body.report.checks.find((check) => check.id === "text-layer")?.status).toBe("fail");
  });

  it("turns away files that aren't a PDF or Word document", async () => {
    const res = await POST(upload(file(new TextEncoder().encode("just some notes"), "notes.txt")));
    expect(res.status).toBe(415);
    expect(await errorOf(res)).toEqual({
      code: "unsupported_type",
      message: "That file isn't a PDF or Word document. Upload a .pdf or .docx file.",
    });

    const legacy = Uint8Array.of(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0);
    const old = await POST(upload(file(legacy, "resume.doc")));
    expect(old.status).toBe(415);
    expect((await errorOf(old)).message).toContain(".docx");
  });

  it("refuses oversized files before parsing them", async () => {
    const justOver = await POST(upload(file(new Uint8Array(UPLOAD_LIMITS.maxBytes + 1), "big.pdf")));
    expect(justOver.status).toBe(413);
    expect(await errorOf(justOver)).toEqual({ code: "too_large", message: "That file is over 4 MB. Try a smaller copy." });

    // Past the body cap the read stops early, before the multipart body is even parsed.
    const huge = await POST(upload(file(new Uint8Array(UPLOAD_LIMITS.maxBytes + 200_000), "huge.pdf")));
    expect(huge.status).toBe(413);

    const declared = new Request("http://localhost/api/import", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x", "content-length": String(50 * 1024 * 1024) },
      body: "--x--",
    });
    expect((await POST(declared)).status).toBe(413);
  });

  it("asks for a file when there isn't a usable one", async () => {
    const missing = await POST(upload(null));
    expect(missing.status).toBe(400);
    expect(await errorOf(missing)).toEqual({ code: "bad_request", message: "Choose a PDF or Word (.docx) file to upload." });

    expect((await POST(upload("not a file"))).status).toBe(400);

    const empty = await POST(upload(file(new Uint8Array(0), "empty.pdf")));
    expect(empty.status).toBe(400);
    expect((await errorOf(empty)).message).toBe("That file is empty. Choose your resume and try again.");

    const json = new Request("http://localhost/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ file: "x" }),
    });
    expect((await POST(json)).status).toBe(400);
  });

  it("reports locked and overlong PDFs as files we couldn't read", async () => {
    const locked = await POST(upload(file(await encryptedPdf(), "locked.pdf")));
    expect(locked.status).toBe(422);
    expect(await errorOf(locked)).toMatchObject({ code: "parse_failed", message: expect.stringContaining("password") });

    const book = await POST(upload(file(await blankPdf(UPLOAD_LIMITS.maxPages + 1), "book.pdf")));
    expect(book.status).toBe(422);
    expect(await errorOf(book)).toEqual({
      code: "parse_failed",
      message: "That file has more than 6 pages. Most resumes are 1-2 pages.",
    });
  });

  it("answers 422 when the text is longer than a resume can be", async () => {
    vi.mocked(structureResume).mockRejectedValueOnce(new AIError("too_long", "Resume text is too long"));
    const res = await POST(upload(resumePdf));
    expect(res.status).toBe(422);
    expect((await errorOf(res)).code).toBe("parse_failed");
  });

  it("hides unexpected failures behind a plain server error", async () => {
    vi.mocked(structureResume).mockRejectedValueOnce(new Error("internal detail"));
    const res = await POST(upload(resumePdf));
    expect(res.status).toBe(500);
    const error = await errorOf(res);
    expect(error.code).toBe("server_error");
    expect(error.message).not.toContain("internal detail");
  });

  it(`allows ${ANON_LIMITS.uploadsPerDay} imports a day per device, then answers 429 with Retry-After`, async () => {
    for (let i = 0; i < ANON_LIMITS.uploadsPerDay; i++) {
      expect((await POST(upload(scanPdf))).status).toBe(200);
    }
    const res = await POST(upload(scanPdf));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe(String(12 * 60 * 60));
    expect(await errorOf(res)).toEqual({
      code: "rate_limited",
      message: "You've uploaded a lot of files today. Try again in 12 hours.",
    });

    // Another device on the same network still has its own allowance.
    cookieJar.clear();
    expect((await POST(upload(scanPdf))).status).toBe(200);
  });

  it("caps a whole network across devices", async () => {
    for (let i = 0; i < IP_LIMITS.uploadsPerDay; i++) {
      cookieJar.clear();
      expect((await POST(upload(scanPdf, { ip: "198.51.100.4" }))).status).toBe(200);
    }
    cookieJar.clear();
    expect((await POST(upload(scanPdf, { ip: "198.51.100.4" }))).status).toBe(429);
    expect((await POST(upload(scanPdf, { ip: "198.51.100.5" }))).status).toBe(200);
  });

  it("turns away uploads another website's page sent, before reading or counting them", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(structureResume).mockClear();
    const fromElsewhere = (headers: Record<string, string>) => {
      const form = new FormData();
      form.append("file", resumePdf);
      return new Request("http://localhost/api/import", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.7", ...headers },
        body: form,
      });
    };
    for (let i = 0; i < ANON_LIMITS.uploadsPerDay; i++) {
      const res = await POST(fromElsewhere({ "sec-fetch-site": "cross-site", origin: "https://evil.example" }));
      expect(res.status).toBe(403);
      expect((await errorOf(res)).code).toBe("forbidden");
    }
    // A browser without Sec-Fetch-Site still sends Origin.
    expect((await POST(fromElsewhere({ origin: "https://evil.example" }))).status).toBe(403);
    expect(structureResume).not.toHaveBeenCalled();
    expect(cookieJar.has("otto_did")).toBe(false);

    // The site's own page, and the visitor's full allowance, are unaffected.
    for (let i = 0; i < ANON_LIMITS.uploadsPerDay; i++) {
      expect((await POST(fromElsewhere({ "sec-fetch-site": "same-origin" }))).status).toBe(200);
    }
    warn.mockRestore();
  });

  it("doesn't count uploads it turned away before reading them", async () => {
    for (let i = 0; i < ANON_LIMITS.uploadsPerDay + 2; i++) {
      expect((await POST(upload(null))).status).toBe(400);
      expect((await POST(upload(file(new Uint8Array(UPLOAD_LIMITS.maxBytes + 1), "big.pdf")))).status).toBe(413);
    }
    expect((await POST(upload(resumePdf))).status).toBe(200);
  });
});

describe("AI reads of uploads", () => {
  // The model itself is replaced: these tests are about who gets an AI read, not what it returns.
  function answerAsAI() {
    vi.mocked(structureResume).mockImplementation(async (text, now, options) => {
      const { heuristicParse } = await import("@/lib/resume/heuristic-parse");
      return { resume: heuristicParse(text, now), usedAI: options?.ai !== false };
    });
  }

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    resetEnvForTests();
    answerAsAI();
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    resetEnvForTests();
    vi.mocked(structureResume).mockReset();
  });

  async function read(res: Response): Promise<ImportResponse> {
    expect(res.status).toBe(200);
    return (await res.json()) as ImportResponse;
  }

  // The rules read this one well, so it never needs the AI.
  const cleanFile = () => resumePdf;
  // Columns read straight across: 0 jobs by rules, so it goes to the AI reader.
  let weakFile: File;
  beforeAll(async () => {
    weakFile = file(await twoColumnPdf(), "two-column.pdf", "application/pdf");
  });

  it(`gives the trial ${PRO_TRIAL.limits.import} AI reads for weak reads, then never blocks`, async () => {
    const maya = await signInOnTrial("maya@example.com");
    for (let i = 0; i < PRO_TRIAL.limits.import; i++) {
      expect(await read(await POST(upload(weakFile)))).toMatchObject({
        usedAI: true,
        basicReader: false,
        readWell: false,
      });
    }
    const past = await read(await POST(upload(weakFile)));
    expect(past).toMatchObject({ usedAI: false, basicReader: true, readWell: false });
    expect(past.resume.basics.email).toBe("alex.morgan@example.com");
    expect(structureResume).toHaveBeenLastCalledWith(expect.any(String), NOW, { ai: false });
    expect((await getUsage(maya)).import).toEqual({ used: 5, limit: 5 });
  });

  it("keeps a good rules read without spending an AI read, even with reads left", async () => {
    const maya = await signInOnTrial("maya@example.com");
    const body = await read(await POST(upload(cleanFile())));
    expect(body).toMatchObject({ usedAI: false, basicReader: false, readWell: true });
    expect(body.resume.experience).toHaveLength(2);
    expect(vi.mocked(structureResume).mock.calls.every(([, , options]) => options?.ai === false)).toBe(true);
    expect((await getUsage(maya)).import.used).toBe(0);
  });

  it("reads a good file with the AI when asked to (Let Otto re-read it)", async () => {
    const maya = await signInOnTrial("maya@example.com");
    const body = await read(await POST(upload(cleanFile(), { reader: "ai" })));
    expect(body).toMatchObject({ usedAI: true, basicReader: false, readWell: false });
    expect(structureResume).toHaveBeenLastCalledWith(expect.any(String), NOW, { ai: true });
    expect((await getUsage(maya)).import.used).toBe(1);
  });

  it("reads every file with the basic reader, signed out and on Free, and never calls the AI", async () => {
    const signedOut = await read(await POST(upload(weakFile)));
    expect(signedOut).toMatchObject({ usedAI: false, basicReader: true });
    expect(signedOut.resume.basics.email).toBe("alex.morgan@example.com");
    const free = await signInAs("free@example.com");
    expect(await read(await POST(upload(weakFile)))).toMatchObject({ usedAI: false, basicReader: true });
    // A file the rules read well isn't sent to the basic reader for the plan, so there's no
    // AI reading to offer for it.
    expect(await read(await POST(upload(cleanFile())))).toMatchObject({
      usedAI: false,
      basicReader: false,
      readWell: true,
    });
    expect(vi.mocked(structureResume).mock.calls.every(([, , options]) => options?.ai === false)).toBe(true);
    expect((await getUsage(free)).import).toEqual({ used: 0, limit: 0 });
  });

  it("gives the read back when the AI fell back, and never counts a scan", async () => {
    const maya = await signInOnTrial("maya@example.com");
    vi.mocked(structureResume).mockImplementation(async (text, now) => {
      const { heuristicParse } = await import("@/lib/resume/heuristic-parse");
      return { resume: heuristicParse(text, now), usedAI: false };
    });
    expect((await read(await POST(upload(weakFile)))).usedAI).toBe(false);
    expect((await read(await POST(upload(scanPdf)))).basicReader).toBe(false);
    expect((await getUsage(maya)).import.used).toBe(0);
  });
});
