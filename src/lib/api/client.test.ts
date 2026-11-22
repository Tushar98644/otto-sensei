import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JOBS_PREFETCH_HEADER } from "@/lib/job-feed/prefetch-header";
import { emptyResume } from "@/lib/resume/schema";
import { api, ApiClientError, isApiError, isBudgetReached } from "./client";
import { REQUEST_ID_HEADER, RESUME_HEADER } from "./request-id";

type Sent = { url: string; init: RequestInit };

let sent: Sent[] = [];
let answer: () => Response | Promise<Response> = () => Response.json({ ok: true });

beforeEach(() => {
  sent = [];
  answer = () => Response.json({ ok: true });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      sent.push({ url, init });
      return answer();
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const last = (): Sent => sent.at(-1)!;
const headerOf = (name: string) => new Headers(last().init.headers).get(name);
const jsonSent = (): unknown => JSON.parse(last().init.body as string);
const formSent = () => last().init.body as FormData;

async function failure(call: () => Promise<unknown>): Promise<ApiClientError> {
  const error: unknown = await call().then(
    () => null,
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(ApiClientError);
  return error as ApiClientError;
}

// The client only passes bodies through, so their exact shape doesn't matter here.
const BODY = { sample: "body" } as never;

describe("api requests", () => {
  it("gives back the route's answer and always sends the session cookie", async () => {
    answer = () => Response.json({ ok: true, url: "https://checkout.example/session" });

    await expect(api.portal()).resolves.toEqual({
      ok: true,
      url: "https://checkout.example/session",
    });
    expect(last().init.credentials).toBe("same-origin");
    expect(last().init.method).toBe("POST");
  });

  it("says the server can't be reached when the request never gets out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
    );

    const error = await failure(() => api.me());

    expect(error).toMatchObject({
      code: "network_error",
      status: 0,
      message: "Can't reach the server. Check your connection.",
    });
    expect(error.name).toBe("ApiClientError");
    expect(error.reason).toBeUndefined();
  });

  it("passes on the route's error code, message, status and reason", async () => {
    answer = () =>
      Response.json(
        {
          ok: false,
          error: { code: "limit_reached", message: "Otto is resting.", reason: "ai_budget" },
        },
        { status: 429 },
      );

    const error = await failure(() => api.fix(BODY));

    expect(error).toMatchObject({
      code: "limit_reached",
      message: "Otto is resting.",
      status: 429,
      reason: "ai_budget",
    });
    expect(isBudgetReached(error)).toBe(true);
  });

  it("treats a page that isn't JSON as a server error with its status", async () => {
    answer = () => new Response("<html>Bad gateway</html>", { status: 502 });

    const error = await failure(() => api.listApplications());

    expect(error).toMatchObject({
      code: "server_error",
      message: "Something went wrong. Please try again.",
      status: 502,
    });
  });

  it("treats a 200 that isn't an ok answer as a failure", async () => {
    answer = () => Response.json({ resumes: [] });
    expect(await failure(() => api.listResumes())).toMatchObject({
      code: "server_error",
      status: 200,
    });

    answer = () => Response.json(null);
    expect(await failure(() => api.writings())).toMatchObject({
      code: "server_error",
      status: 200,
    });

    answer = () => Response.json({ ok: "true" });
    expect((await failure(() => api.shares())).code).toBe("server_error");
  });

  it("fills in what an error answer leaves out", async () => {
    answer = () => Response.json({ ok: false, error: { message: "Not yours." } }, { status: 403 });
    expect(await failure(() => api.jobPost("job-1"))).toMatchObject({
      code: "server_error",
      message: "Not yours.",
      status: 403,
    });

    answer = () => Response.json({ ok: false }, { status: 404 });
    expect(await failure(() => api.jobPost("job-1"))).toMatchObject({
      code: "server_error",
      message: "Something went wrong. Please try again.",
      status: 404,
    });
  });

  it("is a failure even when the status is fine but the answer says otherwise", async () => {
    answer = () =>
      Response.json({ ok: false, error: { code: "unauthorized", message: "Sign in again." } });

    const error = await failure(() => api.me());

    expect(isApiError(error, "unauthorized")).toBe(true);
    expect(error.status).toBe(200);
  });
});

describe("isApiError and isBudgetReached", () => {
  it("matches only the client's errors, and the code when one is named", () => {
    const limit = new ApiClientError("limit_reached", "Full.", 429);
    expect(isApiError(limit)).toBe(true);
    expect(isApiError(limit, "limit_reached")).toBe(true);
    expect(isApiError(limit, "rate_limited")).toBe(false);
    expect(isApiError(new Error("limit_reached"))).toBe(false);
    expect(isApiError({ code: "limit_reached", status: 429 })).toBe(false);
    expect(isApiError(null)).toBe(false);
  });

  it("counts only the AI budget running out as the budget being reached", () => {
    expect(isBudgetReached(new ApiClientError("limit_reached", "Full.", 429, "ai_budget"))).toBe(
      true,
    );
    expect(isBudgetReached(new ApiClientError("limit_reached", "Full.", 429))).toBe(false);
    expect(
      isBudgetReached(new ApiClientError("rate_limited", "Slow down.", 429, "ai_budget")),
    ).toBe(false);
    expect(isBudgetReached(new Error("ai_budget"))).toBe(false);
  });
});

describe("api JSON requests", () => {
  const cases: [string, () => Promise<unknown>, string, string][] = [
    ["draft", () => api.draft(BODY), "POST", "/api/draft"],
    ["fix", () => api.fix(BODY), "POST", "/api/fix"],
    ["letter", () => api.letter(BODY), "POST", "/api/letter"],
    ["answer", () => api.answer(BODY), "POST", "/api/answer"],
    ["outreach", () => api.outreach(BODY), "POST", "/api/outreach"],
    ["interview", () => api.interview(BODY), "POST", "/api/interview"],
    ["saveWriting", () => api.saveWriting(BODY), "POST", "/api/writings"],
    ["editWriting", () => api.editWriting("w/1", BODY), "PATCH", "/api/writings/w%2F1"],
    ["summary", () => api.summary(BODY), "POST", "/api/summary"],
    ["readJob", () => api.readJob(BODY), "POST", "/api/job"],
    ["saveLookingFor", () => api.saveLookingFor(BODY), "PUT", "/api/jobs/looking-for"],
    ["createApplication", () => api.createApplication(BODY), "POST", "/api/applications"],
    [
      "updateApplication",
      () => api.updateApplication("app 1", BODY),
      "PATCH",
      "/api/applications/app%201",
    ],
    ["setApplicationsStatus", () => api.setApplicationsStatus(BODY), "PATCH", "/api/applications"],
    ["feedback", () => api.feedback(BODY), "POST", "/api/feedback"],
    ["saveWorkProfile", () => api.saveWorkProfile(BODY), "PUT", "/api/profile"],
    ["connectGitHub", () => api.connectGitHub(BODY), "POST", "/api/github/connection"],
    ["githubLookup", () => api.githubLookup(BODY), "POST", "/api/github/lookup"],
    ["githubDraft", () => api.githubDraft(BODY), "POST", "/api/github/draft"],
    ["markNotificationsRead", () => api.markNotificationsRead(BODY), "PATCH", "/api/notifications"],
    ["followUpAction", () => api.followUpAction(BODY), "POST", "/api/notifications/follow-up"],
    ["saveAccountSetup", () => api.saveAccountSetup(BODY), "PUT", "/api/setup"],
    ["saveSetupDefaults", () => api.saveSetupDefaults(BODY), "POST", "/api/setup/defaults"],
    ["saveWritingStyle", () => api.saveWritingStyle(BODY), "PUT", "/api/writing-style"],
    [
      "saveReminderSettings",
      () => api.saveReminderSettings(BODY),
      "PUT",
      "/api/notifications/settings",
    ],
    ["share", () => api.share(BODY), "POST", "/api/share"],
    ["updateShare", () => api.updateShare("s?1", BODY), "PATCH", "/api/share/s%3F1"],
    ["createPortfolio", () => api.createPortfolio(BODY), "POST", "/api/portfolio"],
    ["updatePortfolio", () => api.updatePortfolio(BODY), "PATCH", "/api/portfolio"],
  ];

  it.each(cases)("%s sends its body as JSON", async (_name, call, method, url) => {
    await call();
    expect(last().url).toBe(url);
    expect(last().init.method).toBe(method);
    expect(headerOf("content-type")).toBe("application/json");
    expect(jsonSent()).toEqual({ sample: "body" });
  });

  it("sends sign-in requests with exactly what the auth routes read", async () => {
    await api.requestCode("ada@example.com");
    expect([last().url, jsonSent()]).toEqual([
      "/api/auth/request-code",
      { email: "ada@example.com" },
    ]);

    await api.verifyCode("ada@example.com", "123456");
    expect([last().url, jsonSent()]).toEqual([
      "/api/auth/verify",
      { email: "ada@example.com", code: "123456" },
    ]);

    await api.googleSignIn("/studio?step=tailor");
    expect([last().url, jsonSent()]).toEqual(["/api/auth/google", { next: "/studio?step=tailor" }]);

    await api.claimReferral();
    expect([last().url, last().init.method, jsonSent()]).toEqual([
      "/api/referrals/claim",
      "POST",
      {},
    ]);
  });

  it("asks for Pro monthly unless told otherwise, with the page to come back to only when there is one", async () => {
    await api.checkout();
    expect(jsonSent()).toEqual({ plan: "pro", interval: "month" });

    await api.checkout("max", "year", null);
    expect(jsonSent()).toEqual({ plan: "max", interval: "year" });

    await api.checkout("pro", "year", "/studio");
    expect([last().url, jsonSent()]).toEqual([
      "/api/billing/checkout",
      { plan: "pro", interval: "year", next: "/studio" },
    ]);
  });
});

describe("api reads", () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    ["interviewPrep", () => api.interviewPrep("app/1"), "/api/interview/app%2F1"],
    ["interviewPacks", () => api.interviewPacks(), "/api/interview"],
    ["writings", () => api.writings(), "/api/writings"],
    ["jobPost", () => api.jobPost("gh:12 34"), "/api/jobs/gh%3A12%2034"],
    ["savedJobs", () => api.savedJobs(), "/api/jobs/saved"],
    ["me", () => api.me(), "/api/me"],
    ["listResumes", () => api.listResumes(), "/api/resumes"],
    ["listApplications", () => api.listApplications(), "/api/applications"],
    ["applicationThread", () => api.applicationThread("a&b"), "/api/applications/a%26b"],
    ["referrals", () => api.referrals(), "/api/referrals"],
    ["billingHistory", () => api.billingHistory(), "/api/billing/history"],
    ["workProfile", () => api.workProfile(), "/api/profile"],
    ["githubConnection", () => api.githubConnection(), "/api/github/connection"],
    ["notifications", () => api.notifications(), "/api/notifications"],
    ["accountSetup", () => api.accountSetup(), "/api/setup"],
    ["writingStyle", () => api.writingStyle(), "/api/writing-style"],
    ["reminderSettings", () => api.reminderSettings(), "/api/notifications/settings"],
    ["shares", () => api.shares(), "/api/share"],
    ["portfolio", () => api.portfolio(), "/api/portfolio"],
    [
      "checkPortfolioSlug",
      () => api.checkPortfolioSlug("ada lovelace"),
      "/api/portfolio/slug?value=ada%20lovelace",
    ],
    ["portfolioContent", () => api.portfolioContent(), "/api/portfolio/content"],
  ];

  it.each(cases)("%s reads fresh, never from the browser cache", async (_name, call, url) => {
    await call();
    expect(last().url).toBe(url);
    expect(last().init.method).toBeUndefined();
    expect(last().init.cache).toBe("no-store");
  });

  it("pages applications by cursor", async () => {
    await api.listApplications("2026-11-01T00:00:00Z|app 9");
    expect(last().url).toBe("/api/applications?cursor=2026-11-01T00%3A00%3A00Z%7Capp%209");
  });

  it("looks up an outreach writing by job and application", async () => {
    await api.outreachWriting({ job: "job 1", application: "app&2" });
    expect(last().url).toBe("/api/writings/outreach?job=job+1&application=app%262");
    expect(last().init.cache).toBe("no-store");
  });

  it("searches occupations with the query encoded and the caller's signal", async () => {
    const controller = new AbortController();
    await api.searchOccupations("c++ & data", controller.signal);
    expect(last().url).toBe("/api/jobs/occupations?q=c%2B%2B%20%26%20data");
    expect(last().init.signal).toBe(controller.signal);
  });
});

describe("api writes without a body", () => {
  const cases: [string, () => Promise<unknown>, string, string][] = [
    ["saveJob", () => api.saveJob("job/1"), "PUT", "/api/jobs/saved/job%2F1"],
    ["unsaveJob", () => api.unsaveJob("job/1"), "DELETE", "/api/jobs/saved/job%2F1"],
    ["logout", () => api.logout(), "POST", "/api/auth/logout"],
    ["deleteResume", () => api.deleteResume("r 1"), "DELETE", "/api/resumes/r%201"],
    ["portal", () => api.portal(), "POST", "/api/billing/portal"],
    ["deleteAccount", () => api.deleteAccount(), "DELETE", "/api/account"],
    ["disconnectGitHub", () => api.disconnectGitHub(), "DELETE", "/api/github/connection"],
    ["deletePortfolio", () => api.deletePortfolio(), "DELETE", "/api/portfolio"],
    ["refreshPortfolioGitHub", () => api.refreshPortfolioGitHub(), "POST", "/api/portfolio/github"],
  ];

  it.each(cases)("%s uses its method and sends no body", async (_name, call, method, url) => {
    await call();
    expect(last().url).toBe(url);
    expect(last().init.method).toBe(method);
    expect(last().init.body).toBeUndefined();
  });

  it("keeps a deletion alive past the page closing only when asked", async () => {
    const deletions = [
      (keepalive?: boolean) =>
        api.deleteWriting("w1", keepalive === undefined ? undefined : { keepalive }),
      (keepalive?: boolean) =>
        api.deleteApplication("a1", keepalive === undefined ? undefined : { keepalive }),
      (keepalive?: boolean) =>
        api.revokeShare("s1", keepalive === undefined ? undefined : { keepalive }),
    ];
    for (const remove of deletions) {
      await remove();
      expect([last().init.method, last().init.keepalive]).toEqual(["DELETE", false]);
      await remove(true);
      expect(last().init.keepalive).toBe(true);
    }
    expect(sent.map((request) => request.url)).toEqual([
      "/api/writings/w1",
      "/api/writings/w1",
      "/api/applications/a1",
      "/api/applications/a1",
      "/api/share/s1",
      "/api/share/s1",
    ]);
  });
});

describe("api resume sync requests", () => {
  it("lists the account's resumes against the versions the browser holds", async () => {
    await api.listResumes({ "resume-1": 1_000 });
    expect([last().url, last().init.method, jsonSent()]).toEqual([
      "/api/resumes",
      "POST",
      { known: { "resume-1": 1_000 } },
    ]);
  });

  it("saves a resume on the version it was made on, even version 0", async () => {
    const resume = { ...emptyResume(2_000), id: "cv/1" };

    await api.putResume(resume);
    expect([last().url, last().init.method, last().init.keepalive]).toEqual([
      "/api/resumes/cv%2F1",
      "PUT",
      false,
    ]);
    expect(jsonSent()).toEqual(resume);

    await api.putResume(resume, { base: 0 });
    expect(last().url).toBe("/api/resumes/cv%2F1?base=0");

    await api.putResume(resume, { base: 1_500, keepalive: true });
    expect([last().url, last().init.keepalive]).toEqual(["/api/resumes/cv%2F1?base=1500", true]);
  });

  it("saves portfolio content as JSON, kept alive only when asked", async () => {
    await api.savePortfolioContent(BODY);
    expect([last().url, last().init.method, last().init.keepalive, jsonSent()]).toEqual([
      "/api/portfolio/content",
      "PUT",
      false,
      { sample: "body" },
    ]);

    await api.savePortfolioContent(BODY, { keepalive: true });
    expect(last().init.keepalive).toBe(true);
  });
});

describe("api job feed requests", () => {
  it("marks a prefetch of matches so the route can tell it from a visit", async () => {
    await api.jobMatches(BODY);
    expect(headerOf(JOBS_PREFETCH_HEADER)).toBeNull();
    expect([last().url, last().init.method, jsonSent()]).toEqual([
      "/api/jobs/matches",
      "POST",
      { sample: "body" },
    ]);

    await api.jobMatches(BODY, { prefetch: true });
    expect(headerOf(JOBS_PREFETCH_HEADER)).toBe("1");
    expect(headerOf("content-type")).toBe("application/json");
    expect(jsonSent()).toEqual({ sample: "body" });
  });

  it("sends job events and impressions so they outlive the page", async () => {
    await api.jobEvent(BODY);
    expect([last().url, last().init.method, last().init.keepalive]).toEqual([
      "/api/jobs/events",
      "POST",
      true,
    ]);

    await api.jobImpressions(BODY);
    expect([last().url, last().init.keepalive, jsonSent()]).toEqual([
      "/api/jobs/events",
      true,
      { sample: "body" },
    ]);
  });
});

describe("api paid runs", () => {
  it("names the run so a retry after a reload gets the answer already paid for", async () => {
    await api.tailor(BODY, { id: "run-1" });
    expect(last().url).toBe("/api/tailor");
    expect(headerOf(REQUEST_ID_HEADER)).toBe("run-1");
    expect(headerOf(RESUME_HEADER)).toBeNull();
    expect(headerOf("content-type")).toBe("application/json");
    expect(jsonSent()).toEqual({ sample: "body" });

    await api.tailor(BODY, { id: "run-1", resume: true });
    expect(headerOf(REQUEST_ID_HEADER)).toBe("run-1");
    expect(headerOf(RESUME_HEADER)).toBe("1");
  });
});

describe("api file uploads", () => {
  it("imports a file with the usual reader unless the AI reader is asked for", async () => {
    const file = new File(["%PDF-1.7"], "cv.pdf", { type: "application/pdf" });

    await api.importFile(file);
    expect([last().url, last().init.method]).toEqual(["/api/import", "POST"]);
    expect((formSent().get("file") as File).name).toBe("cv.pdf");

    await api.importFile(file, { reader: "ai" });
    expect(last().url).toBe("/api/import?reader=ai");
  });

  it("checks a file under the name it was given", async () => {
    await api.checkFile(new Blob(["%PDF-1.7"], { type: "application/pdf" }), "Ada Lovelace.pdf");
    expect([last().url, last().init.method]).toEqual(["/api/check", "POST"]);
    const file = formSent().get("file") as File;
    expect(file.name).toBe("Ada Lovelace.pdf");
    expect(await file.text()).toBe("%PDF-1.7");
  });

  it("names a voice clip after its format and sends its length to a tenth of a second", async () => {
    const controller = new AbortController();

    await api.transcribe(
      new Blob(["clip"], { type: "audio/webm;codecs=opus" }),
      3,
      controller.signal,
    );
    expect([last().url, last().init.method, last().init.signal]).toEqual([
      "/api/transcribe",
      "POST",
      controller.signal,
    ]);
    expect((formSent().get("file") as File).name).toBe("speech.webm");
    expect(formSent().get("seconds")).toBe("3.0");

    await api.transcribe(new Blob(["clip"], { type: "audio/mp4" }), 12.04);
    expect((formSent().get("file") as File).name).toBe("speech.mp4");
    expect(formSent().get("seconds")).toBe("12.0");

    await api.transcribe(new Blob(["clip"]), 0.96);
    expect((formSent().get("file") as File).name).toBe("speech.audio");
    expect(formSent().get("seconds")).toBe("1.0");
  });
});
