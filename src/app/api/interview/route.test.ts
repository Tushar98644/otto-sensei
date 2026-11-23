import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_APPLICATIONS_PER_USER, PRO_TRIAL } from "@/config/plans";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";
import { prepareInterview } from "@/lib/ai/interview";
import { AIError } from "@/lib/ai/types";
import { REQUEST_ID_HEADER, RESUME_HEADER } from "@/lib/api/request-id";
import type {
  ApiErrorBody,
  InterviewPacksResponse,
  InterviewPrepResponse,
  InterviewRequestBody,
  InterviewResponse,
} from "@/lib/api/types";
import {
  cookieJar,
  fakeAuth,
  jsonRequest,
  resetDb,
  signInAs,
  signInOnTrial,
} from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import type { InterviewPrep } from "@/lib/insights/prep";
import { getPrep, listPreps, savePrep } from "@/lib/insights/prep-store";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume } from "@/lib/resume/schema";
import { getUsage } from "@/lib/usage";
import { createApplication } from "../applications/records";
import { GET } from "./[id]/route";
import { GET as listPacks, POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/interview", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/interview")>();
  return { ...actual, prepareInterview: vi.fn(actual.prepareInterview) };
});
vi.mock("@/lib/insights/prep-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/insights/prep-store")>();
  return {
    ...actual,
    getPrep: vi.fn(actual.getPrep),
    listPreps: vi.fn(actual.listPreps),
    savePrep: vi.fn(actual.savePrep),
  };
});

const TRIAL_END = Date.UTC(2099, 0, 15, 12);
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0, 7);

const JOB_POST =
  "We're hiring a Senior Product Marketing Manager to lead launches for our B2B analytics suite.\n" +
  "What you bring:\n- B2B SaaS launches\n- SQL for campaign analysis\n";

function body(applicationId: string): InterviewRequestBody {
  return {
    applicationId,
    resume: createSampleResume(NOW),
    job: { text: JOB_POST, title: "Senior Product Marketing Manager", company: "Contoso" },
  };
}

async function newApplication(userId: string): Promise<string> {
  const result = await createApplication(
    userId,
    {
      resumeId: null,
      resumeTitle: "",
      company: "Contoso",
      role: "Senior Product Marketing Manager",
      jobUrl: "https://example.com/jobs/1",
      appliedAt: NOW - 1000,
      status: "interview",
      notes: "",
    },
    Date.now(),
    MAX_APPLICATIONS_PER_USER,
  );
  if (result.status !== "created") throw new Error("setup failed");
  return result.application.id;
}

const prepRequest = (id: string) =>
  GET(new Request(`http://localhost/api/interview/${id}`), { params: Promise.resolve({ id }) });

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

beforeEach(async () => {
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.useRealTimers();
  resetEnvForTests();
});

describe("POST /api/interview", () => {
  it("needs a signed-in user", async () => {
    const res = await POST(jsonRequest("/api/interview", body(crypto.randomUUID())));
    expect(res.status).toBe(401);
    expect((await errorOf(res)).message).toBe("Sign in to let Otto help you prepare.");
  });

  it("makes a demo pack, saves it on the application and counts one letter", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    const res = await POST(jsonRequest("/api/interview", body(id)));
    expect(res.status).toBe(200);
    const json = (await res.json()) as InterviewResponse;
    expect(json.demo).toBe(true);
    expect(json.result.saved).toBe(true);
    expect(json.result.prep.version).toBe(3);
    expect(json.result.prep.technical).toBeNull();
    expect(json.result.prep.questions[0]?.round).toBe("opening");
    expect(json.result.prep.questions.at(-1)?.round).toBe("closing");
    expect(json.result.prep.stories[0]?.place).toBe("Product Marketing Manager at Brightloop");
    expect(json.usage.letter).toEqual({ used: 1, limit: PRO_TRIAL.limits.letter });
    expect((await getUsage(user)).letter.used).toBe(1);

    const loaded = await prepRequest(id);
    expect(loaded.status).toBe(200);
    expect(loaded.headers.get("Cache-Control")).toBe("no-store");
    const stored = (await loaded.json()) as InterviewPrepResponse;
    expect(stored.target).toMatchObject({
      id,
      company: "Contoso",
      jobUrl: "https://example.com/jobs/1",
    });
    expect(stored.prep).toEqual(json.result.prep);
  });

  it("asks Supabase who's calling once, though it saves the pack after the AI answers", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    const getUser = vi.spyOn(fakeAuth.server, "getUser");
    const res = await POST(jsonRequest("/api/interview", body(id)));
    expect(((await res.json()) as InterviewResponse).result.saved).toBe(true);
    expect(getUser).toHaveBeenCalledOnce();
    getUser.mockRestore();
  });

  it("still hands over the pack when the application is gone", async () => {
    await signInOnTrial(undefined, TRIAL_END);
    const res = await POST(jsonRequest("/api/interview", body(crypto.randomUUID())));
    expect(res.status).toBe(200);
    expect(((await res.json()) as InterviewResponse).result.saved).toBe(false);
  });

  it("rejects a post that's too short without spending a letter", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    const res = await POST(
      jsonRequest("/api/interview", {
        ...body(id),
        job: { text: "Apply now.", title: "", company: "" },
      }),
    );
    expect(res.status).toBe(400);
    expect((await getUsage(user)).letter.used).toBe(0);
  });
});

describe("GET /api/interview/:id", () => {
  it("needs a signed-in user", async () => {
    const res = await prepRequest(crypto.randomUUID());
    expect(res.status).toBe(401);
  });

  it("answers 404 for another account's application and for a bad id", async () => {
    const owner = await signInOnTrial("owner@example.com", TRIAL_END);
    const id = await newApplication(owner.id);
    cookieJar.clear();
    await signInOnTrial("other@example.com", TRIAL_END);
    expect((await prepRequest(id)).status).toBe(404);
    expect((await prepRequest("not-a-uuid")).status).toBe(404);
  });

  it("returns no pack before one is made", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    const res = await prepRequest(id);
    expect(((await res.json()) as InterviewPrepResponse).prep).toBeNull();
  });
});

describe("prep store", () => {
  it("never writes another account's row and reads a broken pack as none", async () => {
    const owner = await signInOnTrial("owner@example.com", TRIAL_END);
    const id = await newApplication(owner.id);
    const pack: InterviewPrep = {
      version: 3,
      technical: null,
      job: { title: "", company: "" },
      questions: [],
      stories: [],
      asks: [],
      createdAt: NOW,
      demo: true,
    };
    expect(await savePrep(crypto.randomUUID(), id, pack)).toBe(false);
    expect(await savePrep(owner.id, id, pack)).toBe(true);
    expect((await getPrep(owner.id, id))?.prep).toEqual(pack);
    await expect(savePrep(owner.id, id, { ...pack, asks: ["x".repeat(500)] })).rejects.toThrow();
  });

  it("adds a technical round for a technical role, and leaves it out when the person turns it off", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    const backend = {
      ...body(id),
      job: {
        text: "We're hiring a Senior Backend Engineer for our payments API.\nWhat you bring:\n- Postgres and Kafka\n- Idempotent retries\n",
        title: "Senior Backend Engineer",
        company: "Contoso",
      },
    };
    const made = (await (
      await POST(jsonRequest("/api/interview", backend))
    ).json()) as InterviewResponse;
    expect(made.result.prep.technical).toMatchObject({
      focus: "backend",
      level: "senior",
      coding: false,
    });
    expect(made.result.prep.technical?.questions.length).toBeGreaterThanOrEqual(8);
    expect(made.result.prep.questions.some((item) => item.round === "skills")).toBe(false);
    const general = made.result.prep.questions.length;
    const listed = ((await (await listPacks()).json()) as InterviewPacksResponse).packs;
    expect(listed).toEqual([
      expect.objectContaining({
        applicationId: id,
        questions: general + (made.result.prep.technical?.questions.length ?? 0),
      }),
    ]);

    const off = { ...backend, focus: { role: "none" as const, level: "auto" as const } };
    const plain = (await (
      await POST(jsonRequest("/api/interview", off))
    ).json()) as InterviewResponse;
    expect(plain.result.prep.technical).toBeNull();
    expect(plain.result.prep.questions.some((item) => item.round === "skills")).toBe(true);
    expect((await getUsage(user)).letter.used).toBe(2);
  });

  it("reads a pack saved before rounds as v3 with no technical round, and lists it", async () => {
    const owner = await signInOnTrial("owner@example.com", TRIAL_END);
    const id = await newApplication(owner.id);
    const v1 = {
      version: 1,
      job: { title: "", company: "" },
      questions: [{ question: "Tell me about a launch.", why: "The post asks for launches." }],
      stories: [],
      asks: [],
      createdAt: NOW,
      demo: false,
    };
    const db = await getDb();
    await db
      .update(applications)
      .set({ prep: v1 as unknown as InterviewPrep })
      .where(eq(applications.id, id));

    const res = await prepRequest(id);
    expect(res.status).toBe(200);
    const { prep } = (await res.json()) as InterviewPrepResponse;
    expect(prep?.version).toBe(3);
    expect(prep?.technical).toBeNull();
    expect(prep?.questions).toEqual([
      {
        round: "fit",
        question: "Tell me about a launch.",
        checking: "The post asks for launches.",
        followUp: "",
        points: [],
        story: null,
      },
    ]);
    const { packs } = (await (await listPacks()).json()) as InterviewPacksResponse;
    expect(packs).toEqual([expect.objectContaining({ applicationId: id, questions: 1 })]);
  });
});

describe("GET /api/interview", () => {
  it("lists the account's packs as counts, newest first, on any plan", async () => {
    expect((await listPacks()).status).toBe(401);
    const owner = await signInOnTrial("owner@example.com", TRIAL_END);
    const older = await newApplication(owner.id);
    const newer = await newApplication(owner.id);
    await newApplication(owner.id);
    const pack: InterviewPrep = {
      version: 3,
      technical: null,
      job: { title: "", company: "" },
      questions: [
        {
          round: "behavioural",
          question: "Tell me about a launch.",
          checking: "",
          followUp: "",
          points: [],
          story: null,
        },
      ],
      stories: [],
      asks: [],
      createdAt: NOW - 5_000,
      demo: true,
    };
    await savePrep(owner.id, older, pack);
    await savePrep(owner.id, newer, { ...pack, createdAt: NOW, demo: false, questions: [] });

    const res = await listPacks();
    expect(res.headers.get("cache-control")).toBe("no-store");
    const { packs } = (await res.json()) as InterviewPacksResponse;
    expect(packs).toEqual([
      expect.objectContaining({
        applicationId: newer,
        createdAt: NOW,
        questions: 0,
        stories: 0,
        demo: false,
      }),
      expect.objectContaining({
        applicationId: older,
        company: "Contoso",
        questions: 1,
        demo: true,
      }),
    ]);

    cookieJar.clear();
    await signInAs("free@example.com");
    expect(((await (await listPacks()).json()) as InterviewPacksResponse).packs).toEqual([]);
  });
});

describe("interview prep guards and failures", () => {
  const INVALID =
    "Otto couldn't read that job post. Paste the full post (up to 20,000 characters) and try again.";
  const TOO_LONG = "That job post or resume is too long for Otto. Try a shorter job post.";
  const LOAD_FAILED = "Couldn't load your interview prep. Please try again.";
  const CROSS_SITE: Record<string, string>[] = [
    { "sec-fetch-site": "cross-site" },
    { origin: "https://evil.example" },
  ];

  const PACK: InterviewPrep = {
    version: 3,
    technical: null,
    job: { title: "Senior Product Marketing Manager", company: "Contoso" },
    questions: [
      {
        round: "behavioural",
        question: "Tell me about a B2B launch you led.",
        checking: "Whether you have run launches like ours.",
        followUp: "What would you change next time?",
        points: ["Name the launch", "Say what moved"],
        story: null,
      },
    ],
    stories: [],
    asks: ["How does the team measure a launch?"],
    createdAt: NOW,
    demo: false,
  };

  const lettersUsed = async (user: SessionUser) => (await getUsage(user)).letter.used;
  const storedPrep = async (userId: string, id: string) =>
    (await getPrep(userId, id))?.prep ?? null;
  const prepared = () => vi.mocked(prepareInterview).mock.calls.length;

  function send(payload: unknown, headers: Record<string, string> = {}): Promise<Response> {
    const req = jsonRequest("/api/interview", payload);
    for (const [name, value] of Object.entries(headers)) req.headers.set(name, value);
    return POST(req);
  }

  function longResume(): Resume {
    const resume = createSampleResume(NOW);
    const job = resume.experience[0]!;
    const experience = [0, 1].map((n) => ({
      ...job,
      id: `long-job-${n}`,
      bullets: Array.from({ length: 40 }, (_, i) => ({
        id: `long-${n}-${i}`,
        text: `Launch ${n}-${i}: ${"ran the campaign from brief to results. ".repeat(24)}`.slice(
          0,
          1_000,
        ),
      })),
    }));
    return { ...resume, experience };
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("refuses a request sent from another website without counting or saving anything", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    const before = prepared();
    for (const headers of CROSS_SITE) {
      const res = await send(body(id), headers);
      expect(res.status).toBe(403);
      expect((await errorOf(res)).code).toBe("forbidden");
    }
    expect(prepared()).toBe(before);
    expect(await lettersUsed(user)).toBe(0);
    expect(await storedPrep(user.id, id)).toBeNull();
  });

  it("never saves a pack on another account's application", async () => {
    const owner = await signInOnTrial("owner@example.com", TRIAL_END);
    const id = await newApplication(owner.id);
    cookieJar.clear();
    const other = await signInOnTrial("other@example.com", TRIAL_END);

    const res = await send(body(id));
    expect(res.status).toBe(200);
    expect(((await res.json()) as InterviewResponse).result.saved).toBe(false);
    expect(await storedPrep(owner.id, id)).toBeNull();
    expect(await lettersUsed(other)).toBe(1);
    expect(await lettersUsed(owner)).toBe(0);
  });

  it("says what Otto needs when the application id can't be read, without spending a letter", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const res = await send(body("not-a-uuid"));
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toEqual({ code: "bad_request", message: INVALID });
    expect(await lettersUsed(user)).toBe(0);
  });

  it("still hands over the pack, counted, when saving it fails", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    vi.mocked(savePrep).mockRejectedValueOnce(new Error("connection reset by peer"));

    const res = await send(body(id));
    expect(res.status).toBe(200);
    const json = (await res.json()) as InterviewResponse;
    expect(json.result.saved).toBe(false);
    expect(json.result.prep.questions.length).toBeGreaterThan(0);
    expect(await lettersUsed(user)).toBe(1);
    expect(await storedPrep(user.id, id)).toBeNull();
  });

  it("puts each AI failure in the prep's own words, gives the letter back and saves nothing", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);

    vi.mocked(prepareInterview).mockRejectedValueOnce(new AIError("refused", "declined"));
    const refused = await send(body(id));
    expect(refused.status).toBe(422);
    expect(await errorOf(refused)).toEqual({
      code: "ai_refused",
      message: "Otto can't prepare for that job post. Try pasting just the job description.",
    });

    vi.mocked(prepareInterview).mockRejectedValueOnce(new AIError("too_long", "too long"));
    const tooLong = await send(body(id));
    expect(tooLong.status).toBe(400);
    expect(await errorOf(tooLong)).toEqual({ code: "bad_request", message: TOO_LONG });

    vi.mocked(prepareInterview).mockRejectedValueOnce(
      new AIError("invalid_output", "no usable questions"),
    );
    const broken = await send(body(id));
    expect(broken.status).toBe(502);
    expect(await errorOf(broken)).toEqual({
      code: "ai_unavailable",
      message:
        "Otto couldn't finish that right now. Try again in a minute. It won't count against your allowance.",
    });

    expect(await lettersUsed(user)).toBe(0);
    expect(await storedPrep(user.id, id)).toBeNull();
  });

  it("turns down a resume too long to read, without counting a letter", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    const res = await send({ ...body(id), resume: longResume() });
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toEqual({ code: "bad_request", message: TOO_LONG });
    expect(await lettersUsed(user)).toBe(0);
  });

  it("hands the trimmed job over and saves a pack from the AI as real", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("no network in tests");
      }),
    );
    resetEnvForTests();
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    vi.mocked(prepareInterview).mockResolvedValueOnce(PACK);

    const res = await send({
      ...body(id),
      job: {
        text: `  ${JOB_POST}`,
        title: " Senior Product Marketing Manager ",
        company: " Contoso ",
      },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as InterviewResponse;
    expect(json.demo).toBe(false);
    expect(json.result).toEqual({ prep: PACK, saved: true });
    expect(vi.mocked(prepareInterview).mock.lastCall?.[1]).toEqual({
      jobText: JOB_POST.trim(),
      jobTitle: "Senior Product Marketing Manager",
      company: "Contoso",
    });
    expect(vi.mocked(prepareInterview).mock.lastCall?.[2]).toEqual({
      focus: { role: "auto", level: "auto" },
    });
    expect(await storedPrep(user.id, id)).toEqual(PACK);
  });

  it("hands back a pack already paid for under the same request id, without making another", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    const sent = body(id);
    const run = { [REQUEST_ID_HEADER]: "interview-run-00000001" };
    const before = prepared();

    const first = (await (await send(sent, run)).json()) as InterviewResponse;
    const again = await send(sent, run);
    expect(again.status).toBe(200);
    const replayed = (await again.json()) as InterviewResponse;
    expect(replayed.result).toEqual(first.result);
    expect(replayed.result.saved).toBe(true);
    expect(replayed.usage.letter).toEqual({ used: 1, limit: PRO_TRIAL.limits.letter });
    expect(prepared()).toBe(before + 1);
    expect(await lettersUsed(user)).toBe(1);
  });

  it("has nothing to pick up for a request id that never ran", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    const res = await send(body(id), {
      [REQUEST_ID_HEADER]: "interview-run-00000002",
      [RESUME_HEADER]: "1",
    });
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("not_found");
    expect(await lettersUsed(user)).toBe(0);
    expect(await storedPrep(user.id, id)).toBeNull();
  });

  it("lists nothing to a signed-out caller and answers 500 when the packs can't be loaded, never cached", async () => {
    const signedOut = await listPacks();
    expect(signedOut.status).toBe(401);
    expect(signedOut.headers.get("Cache-Control")).toBe("no-store");
    expect(await errorOf(signedOut)).toEqual({
      code: "unauthorized",
      message: "Sign in to see your interview prep.",
    });

    await signInOnTrial(undefined, TRIAL_END);
    vi.mocked(listPreps).mockRejectedValueOnce(new Error("connection reset by peer"));
    const res = await listPacks();
    expect(res.status).toBe(500);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({ code: "server_error", message: LOAD_FAILED });
  });

  it("answers one pack's 404 and 500 in plain words, never cached", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const missing = await prepRequest(crypto.randomUUID());
    expect(missing.status).toBe(404);
    expect(missing.headers.get("Cache-Control")).toBe("no-store");
    expect(await errorOf(missing)).toEqual({
      code: "not_found",
      message: "That application isn't in your list anymore.",
    });

    const id = await newApplication(user.id);
    vi.mocked(getPrep).mockRejectedValueOnce(new Error("connection reset by peer"));
    const res = await prepRequest(id);
    expect(res.status).toBe(500);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({ code: "server_error", message: LOAD_FAILED });
  });
});
