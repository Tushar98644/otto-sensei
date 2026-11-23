import { eq } from "drizzle-orm";
import { extractText, getDocumentProxy } from "unpdf";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { buildDataExport } from "@/lib/account/data-export";
import { cookieJar, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import { saveWorkProfile } from "@/lib/eligibility/records";
import { companyFromLink, UNDO_MS } from "@/lib/extension/applied";
import { FILL_UPGRADE_PATH } from "@/lib/extension/links";
import { DEV_EXTENSION_ID } from "@/lib/extension/route";
import type {
  ApplyAnswersResponse,
  ExtensionApplicationResponse,
  ExtensionConnectResponse,
  FillProfileResponse,
} from "@/lib/extension/types";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume } from "@/lib/resume/schema";
import { getUsage } from "@/lib/usage";
import { upgradeHref } from "@/components/site/routes";
import { POST as connect } from "../account/extension/route";
import { saveBackup } from "../resumes/backups";
import { POST as answer } from "./answer/route";
import { GET as readAnswers, POST as saveAnswers } from "./answers/route";
import { DELETE as undo } from "./applications/[id]/route";
import { POST as applied } from "./applications/route";
import { GET as fill } from "./fill/route";
import { GET as resumeFile } from "./resume-file/route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const ORIGIN = `chrome-extension://${DEV_EXTENSION_ID}`;
const JOB_URL = "https://jobs.lever.co/acme/6ed76ce8-4156-4b60-b120-403538bd66cd";
const POST_TEXT =
  "We're hiring a Senior Backend Engineer to build our payments platform.\nRequirements:\n- 5+ years with Go and PostgreSQL\n- Kafka and Terraform";

function bearer(
  method: string,
  path: string,
  token: string,
  body?: unknown,
  origin = ORIGIN,
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}`, origin },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function connectToken(): Promise<string> {
  const res = await connect(
    new Request("http://localhost/api/account/extension", {
      method: "POST",
      headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" },
      body: "{}",
    }),
  );
  return ((await res.json()) as ExtensionConnectResponse).token;
}

function resume(overrides: Partial<Resume> = {}): Resume {
  const base = createSampleResume(Date.UTC(2026, 10, 1));
  return {
    ...base,
    basics: {
      ...base.basics,
      name: "Ana Maria Souza",
      email: "ana@example.com",
      phone: "+351 912 345 678",
      location: "Lisbon, Portugal",
      links: [
        { id: "l1", label: "LinkedIn", url: "linkedin.com/in/anasouza" },
        { id: "l2", label: "GitHub", url: "https://github.com/anasouza" },
        { id: "l3", label: "Site", url: "https://anasouza.dev" },
      ],
    },
    ...overrides,
  };
}

async function proAccount(): Promise<{ user: SessionUser; token: string; base: Resume }> {
  const user = await setPlan(await signInAs("ana@example.com"), "pro");
  const base = resume();
  await saveBackup(user.id, { ...base, updatedAt: Date.UTC(2026, 10, 2) });
  return { user, token: await connectToken(), base };
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

describe("fill data", () => {
  it("is Pro and Max only, and Free gets the app's upgrade path", async () => {
    await signInAs("free@example.com");
    const token = await connectToken();
    const res = await fill(
      bearer("GET", `/api/extension/fill?url=${encodeURIComponent(JOB_URL)}`, token),
    );
    expect(res.status).toBe(402);
    expect(((await res.json()) as ApiErrorBody).error.code).toBe("upgrade_required");
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(FILL_UPGRADE_PATH).toBe(upgradeHref("pro", "month"));
    for (const call of [
      resumeFile(bearer("GET", "/api/extension/resume-file?id=x", token)),
      readAnswers(bearer("GET", "/api/extension/answers", token)),
      saveAnswers(bearer("POST", "/api/extension/answers", token, { noticePeriod: "30 days" })),
      answer(bearer("POST", "/api/extension/answer", token, {})),
      applied(bearer("POST", "/api/extension/applications", token, {})),
    ]) {
      expect((await call).status).toBe(402);
    }
  });

  it("gives contacts, history and saved answers from the resume to send, with the work profile's rights beneath", async () => {
    const { user, token, base } = await proAccount();
    await saveWorkProfile(user.id, {
      ...emptyWorkProfile(),
      country: "PT",
      rights: { us: "sponsorship", uk: null, eu: "authorized", ca: null },
    });
    const res = await fill(
      bearer("GET", `/api/extension/fill?url=${encodeURIComponent(JOB_URL)}`, token),
    );
    expect(res.status).toBe(200);
    const { fill: data } = (await res.json()) as FillProfileResponse;
    expect(data.resume).toMatchObject({
      id: base.id,
      tailored: false,
      fileName: "Ana-Maria-Souza-Resume.pdf",
    });
    expect(data.contact).toMatchObject({
      firstName: "Ana",
      lastName: "Maria Souza",
      email: "ana@example.com",
      city: "Lisbon",
      country: "PT",
      linkedin: "https://linkedin.com/in/anasouza",
      github: "https://github.com/anasouza",
      portfolio: "https://anasouza.dev",
    });
    expect(data.work.length).toBeGreaterThan(0);
    expect(data.current?.company).toBe(
      data.work.find((job) => job.current)?.company ?? data.work[0]?.company,
    );
    expect(data.answers.workRights).toMatchObject({
      PT: { authorized: true, sponsorship: false },
      US: { authorized: false, sponsorship: true },
      EU: { authorized: true, sponsorship: false },
    });
    expect(data.saved.workRights).toEqual({});
    expect(data.answers.heardFrom).toBe("Company website");
  });

  it("sends the copy tailored for this job when there is one", async () => {
    const { user, token, base } = await proAccount();
    const tailored = resume({
      id: "tailored-1",
      title: "Backend at Acme",
      tailor: {
        baseResumeId: base.id,
        jobTitle: "Senior Backend Engineer",
        company: "Acme",
        keywords: [],
        createdAt: Date.UTC(2026, 10, 3),
        jobUrl: `${JOB_URL}/apply?lever-source=x`,
      },
    });
    await saveBackup(user.id, { ...tailored, updatedAt: Date.UTC(2026, 10, 3) });
    const url = `/api/extension/fill?resume=${base.id}&url=${encodeURIComponent(`${JOB_URL}/apply`)}`;
    const { fill: data } = (await (
      await fill(bearer("GET", url, token))
    ).json()) as FillProfileResponse;
    expect(data.resume).toMatchObject({
      id: "tailored-1",
      tailored: true,
      fileName: "Ana-Maria-Souza-Acme-Resume.pdf",
    });
    const other = `/api/extension/fill?resume=${base.id}&url=${encodeURIComponent("https://jobs.lever.co/acme/other")}`;
    const plain = (await (await fill(bearer("GET", other, token))).json()) as FillProfileResponse;
    expect(plain.fill.resume.id).toBe(base.id);
  });

  it("answers 404 without a resume in the account", async () => {
    await setPlan(await signInAs("ana@example.com"), "pro");
    const token = await connectToken();
    expect((await fill(bearer("GET", "/api/extension/fill", token))).status).toBe(404);
  });

  it("refuses a web page's origin and a missing token", async () => {
    const { token } = await proAccount();
    expect(
      (await fill(bearer("GET", "/api/extension/fill", token, undefined, "https://evil.example")))
        .status,
    ).toBe(403);
    expect((await fill(new Request("http://localhost/api/extension/fill"))).status).toBe(401);
  });
});

describe("the resume file", () => {
  it("is the resume's PDF, drawn by the app's renderer", async () => {
    const { token, base } = await proAccount();
    const res = await resumeFile(
      bearer("GET", `/api/extension/resume-file?id=${base.id}&size=A4`, token),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("Ana-Maria-Souza-Resume.pdf");
    const bytes = new Uint8Array(await res.arrayBuffer());
    const pdf = await getDocumentProxy(bytes);
    try {
      const { text } = await extractText(pdf, { mergePages: true });
      expect(text).toContain("Ana Maria Souza");
      expect((await pdf.getPage(1)).view.map(Math.round)).toEqual([0, 0, 595, 842]);
    } finally {
      await pdf.loadingTask.destroy();
    }
  });

  it("is only another resume of the same account", async () => {
    const { base } = await proAccount();
    cookieJar.clear();
    await setPlan(await signInAs("someone@example.com"), "pro");
    const other = await connectToken();
    expect(
      (await resumeFile(bearer("GET", `/api/extension/resume-file?id=${base.id}`, other))).status,
    ).toBe(404);
  });
});

describe("saved answers", () => {
  it("saves a part at a time, remembers asked questions and forgets an emptied one", async () => {
    const { user, token } = await proAccount();
    const first = await saveAnswers(
      bearer("POST", "/api/extension/answers", token, {
        noticePeriod: "30 days",
        expectedPay: { amount: 2_400_000, currency: "INR", period: "year" },
        workRights: { US: { authorized: false, sponsorship: true } },
        custom: [{ question: "Are you at least 18 years of age? *", answer: "Yes" }],
      }),
    );
    expect(first.status).toBe(200);
    await saveAnswers(
      bearer("POST", "/api/extension/answers", token, {
        relocate: true,
        workRights: { GB: { authorized: true, sponsorship: false } },
        custom: [{ question: "Do you hold a security clearance?", answer: "No" }],
      }),
    );
    const read = (await (
      await readAnswers(bearer("GET", "/api/extension/answers", token))
    ).json()) as ApplyAnswersResponse;
    expect(read.saved).toMatchObject({
      noticePeriod: "30 days",
      relocate: true,
      expectedPay: { amount: 2_400_000, currency: "INR", period: "year" },
      workRights: {
        US: { authorized: false, sponsorship: true },
        GB: { authorized: true, sponsorship: false },
      },
    });
    expect(read.saved.custom.map((item) => item.question)).toEqual([
      "Do you hold a security clearance?",
      "Are you at least 18 years of age? *",
    ]);
    await saveAnswers(
      bearer("POST", "/api/extension/answers", token, {
        custom: [{ question: "are you at least 18 years of age", answer: "" }],
      }),
    );
    const after = (await (
      await readAnswers(bearer("GET", "/api/extension/answers", token))
    ).json()) as ApplyAnswersResponse;
    expect(after.saved.custom).toHaveLength(1);

    const zip = await buildDataExport(user.id);
    const exported = JSON.parse(
      (await zip.file("apply-answers.json")?.async("string")) ?? "{}",
    ) as {
      answers: { noticePeriod: string };
    };
    expect(exported.answers.noticePeriod).toBe("30 days");
    expect(await zip.file("README.txt")?.async("string")).toContain("apply-answers.json");
  });

  it("refuses answers out of shape", async () => {
    const { token } = await proAccount();
    for (const body of [
      { noticePeriod: "x".repeat(121) },
      { currentPay: { amount: -1, currency: "INR", period: "year" } },
      { workRights: { usa: { authorized: true, sponsorship: false } } },
      {
        custom: Array.from({ length: 61 }, (_, index) => ({ question: `Q${index}`, answer: "a" })),
      },
    ]) {
      expect(
        (await saveAnswers(bearer("POST", "/api/extension/answers", token, body))).status,
      ).toBe(400);
    }
  });
});

describe("Draft with Otto", () => {
  it("runs the app's metered answer flow for the token's account", async () => {
    const { user, token, base } = await proAccount();
    const before = await getUsage(user);
    const res = await answer(
      bearer("POST", "/api/extension/answer", token, {
        resumeId: base.id,
        job: { text: POST_TEXT, title: "Senior Backend Engineer", company: "Acme" },
        question: "Why do you want to work at Acme?",
        requestId: "req_0123456789abcdef",
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    const body = (await res.json()) as { result: { answer: string } };
    expect(body.result.answer.length).toBeGreaterThan(20);
    const after = await getUsage(user);
    expect(after.letter.used).toBe(before.letter.used + 1);
    const again = await answer(
      bearer("POST", "/api/extension/answer", token, {
        resumeId: base.id,
        job: { text: POST_TEXT, title: "Senior Backend Engineer", company: "Acme" },
        question: "Why do you want to work at Acme?",
        requestId: "req_0123456789abcdef",
      }),
    );
    expect(again.status).toBe(200);
    expect((await getUsage(user)).letter.used).toBe(after.letter.used);
  });

  it("needs a resume of this account and a real question", async () => {
    const { token, base } = await proAccount();
    const job = { text: POST_TEXT, title: "", company: "" };
    expect(
      (
        await answer(
          bearer("POST", "/api/extension/answer", token, {
            resumeId: "nope",
            job,
            question: "Why us here?",
          }),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await answer(
          bearer("POST", "/api/extension/answer", token, {
            resumeId: base.id,
            job,
            question: "Why",
          }),
        )
      ).status,
    ).toBe(400);
  });
});

describe("Applied after sending", () => {
  it("adds one application with the job link and the resume sent, and Undo takes it back", async () => {
    const { user, token, base } = await proAccount();
    const id = crypto.randomUUID();
    const body = {
      id,
      url: `${JOB_URL}/apply`,
      title: "Senior Backend Engineer",
      company: "",
      resumeId: base.id,
    };
    const res = await applied(bearer("POST", "/api/extension/applications", token, body));
    expect(res.status).toBe(201);
    const made = (await res.json()) as ExtensionApplicationResponse;
    expect(made.application).toMatchObject({
      id,
      company: "Acme",
      role: "Senior Backend Engineer",
    });
    expect(made.boardPath).toBe(`/dashboard/applications/${id}`);
    // The same thank-you page seen twice is still one application.
    expect((await applied(bearer("POST", "/api/extension/applications", token, body))).status).toBe(
      201,
    );
    const db = await getDb();
    const rows = await db.select().from(applications);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: user.id,
      jobUrl: JOB_URL,
      resumeId: base.id,
      status: "applied",
    });

    const gone = await undo(bearer("DELETE", `/api/extension/applications/${id}`, token), {
      params: Promise.resolve({ id }),
    });
    expect(gone.status).toBe(200);
    expect(await db.select().from(applications)).toHaveLength(0);
  });

  it("undoes only a new application of this account", async () => {
    const { token, base } = await proAccount();
    const id = crypto.randomUUID();
    await applied(
      bearer("POST", "/api/extension/applications", token, {
        id,
        url: JOB_URL,
        title: "Engineer",
        company: "Acme",
        resumeId: base.id,
      }),
    );
    const db = await getDb();
    await db
      .update(applications)
      .set({ createdAt: Date.now() - UNDO_MS - 1_000 })
      .where(eq(applications.id, id));
    const late = await undo(bearer("DELETE", `/api/extension/applications/${id}`, token), {
      params: Promise.resolve({ id }),
    });
    expect(late.status).toBe(404);
    expect(await db.select().from(applications)).toHaveLength(1);
  });

  it("names the company from the link when the post doesn't", () => {
    expect(companyFromLink("https://jobs.lever.co/zoox/8befaec7-bb9f-4cf3-a48c-46b5e3886bf3")).toBe(
      "Zoox",
    );
    expect(
      companyFromLink("https://job-boards.greenhouse.io/embed/job_app?for=discord&token=1"),
    ).toBe("Discord");
    expect(companyFromLink("https://nvidia.wd5.myworkdayjobs.com/en-US/x/job/y/z")).toBe("Nvidia");
  });
});
