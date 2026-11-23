import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_RESUMES_PER_USER } from "@/config/plans";
import { getDb } from "@/db/client";
import { notifications } from "@/db/schema";
import { GET as listApplications } from "@/app/api/applications/route";
import { GET as readCareerLog } from "@/app/api/career-log/route";
import { GET as readEmailTracking } from "@/app/api/email-tracking/route";
import { GET as readNotifications } from "@/app/api/notifications/route";
import { GET as readWorkProfile } from "@/app/api/profile/route";
import { saveBackup } from "@/app/api/resumes/backups";
import { DELETE as deleteResume } from "@/app/api/resumes/[id]/route";
import { POST as listResumes } from "@/app/api/resumes/route";
import { GET as readSavedPosts } from "@/app/api/saved-posts/route";
import { GET as readAccountSetup } from "@/app/api/setup/route";
import { GET as readWritings } from "@/app/api/writings/route";
import {
  listFromVersions,
  type ApiSeeds,
  type ResumeVersions,
  type SeedKey,
} from "@/lib/api/seeds";
import { cookieJar, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { createSampleResume } from "@/lib/resume/sample";
import { dashboardSeeds } from "./seeds";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

async function signIn(plan: "free" | "pro" = "pro"): Promise<SessionUser> {
  const user = await signInAs("ada@example.com");
  return plan === "free" ? user : setPlan(user, plan);
}

const keysOf = (seeds: ApiSeeds) => Object.keys(seeds).sort();

const routeJson = async (res: Response | Promise<Response>) =>
  (await res).json() as Promise<unknown>;

describe("dashboardSeeds", () => {
  it("answers each read exactly as its route would", async () => {
    const user = await signIn();
    const seeds = dashboardSeeds(user, "/dashboard/applications?view=board");

    expect(await seeds.notifications).toEqual(await routeJson(readNotifications()));
    expect(await seeds.workProfile).toEqual(await routeJson(readWorkProfile()));
    expect(await seeds.accountSetup).toEqual(await routeJson(readAccountSetup()));
    expect(await seeds.writings).toEqual(await routeJson(readWritings()));
    expect(await seeds.applications).toEqual(
      await routeJson(listApplications(new Request("http://localhost/api/applications"))),
    );
    expect(await seeds.savedPosts).toEqual(await routeJson(readSavedPosts()));
    expect(await seeds.emailTracking).toEqual(await routeJson(readEmailTracking()));
    expect(await seeds.careerLog).toEqual(await routeJson(readCareerLog()));
  });

  it("asks for the shell's and the shared reads everywhere, and only the page's own besides", async () => {
    const user = await signIn();
    const everywhere: SeedKey[] = [
      "accountSetup",
      "interviewPacks",
      "notifications",
      "reminderSettings",
      "resumeVersions",
      "savedJobs",
      "shares",
      "workProfile",
    ];
    expect(keysOf(dashboardSeeds(user, "/dashboard/account"))).toEqual(everywhere);
    expect(keysOf(dashboardSeeds(user, "/dashboard/jobs"))).toEqual(
      [...everywhere, "applications"].sort(),
    );
    expect(keysOf(dashboardSeeds(user, "/dashboard/portfolio"))).toEqual(
      [...everywhere, "githubConnection", "portfolio"].sort(),
    );
    expect(keysOf(dashboardSeeds(user, "/dashboard/applications"))).toEqual(
      [
        ...everywhere,
        "applications",
        "careerLog",
        "emailTracking",
        "savedPosts",
        "writings",
      ].sort(),
    );
    expect(keysOf(dashboardSeeds(user, "/dashboard/career-log/check-in?month=2026-10"))).toEqual(
      [...everywhere, "careerLog"].sort(),
    );
  });

  it("carries the applications and the letters only on the pages that draw them as they open", async () => {
    const user = await signIn();
    for (const path of [
      "/dashboard",
      "/dashboard/resumes",
      "/dashboard/jobs",
      "/dashboard/letters",
      "/dashboard/applications",
      "/dashboard/applications/a1/prep",
      "/dashboard/interview",
      "/dashboard/interview/a1",
    ]) {
      expect(keysOf(dashboardSeeds(user, path))).toContain("applications");
    }
    for (const path of [
      "/dashboard/account",
      "/dashboard/portfolio",
      "/dashboard/career-log",
      "/dashboard/trash",
      "/dashboard/formats",
      "/dashboard/interviews",
    ]) {
      expect(keysOf(dashboardSeeds(user, path))).not.toContain("applications");
    }
    for (const path of ["/dashboard", "/dashboard/letters", "/dashboard/applications"]) {
      expect(keysOf(dashboardSeeds(user, path))).toContain("writings");
    }
    for (const path of ["/dashboard/resumes", "/dashboard/jobs", "/dashboard/interview"]) {
      expect(keysOf(dashboardSeeds(user, path))).not.toContain("writings");
    }
  });

  it("leaves out the reads a Free account's pages never make", async () => {
    const user = await signIn("free");
    const home = keysOf(dashboardSeeds(user, "/dashboard"));
    for (const key of ["reminderSettings", "savedJobs", "writings", "interviewPacks"]) {
      expect(home).not.toContain(key);
    }
    expect(keysOf(dashboardSeeds(user, "/dashboard/portfolio"))).not.toContain("portfolio");
    expect(keysOf(dashboardSeeds(user, "/dashboard/letters"))).toContain("writings");
  });

  it("brings Home the career log only while the bell has the check-in card's note", async () => {
    const user = await signIn();
    expect(await dashboardSeeds(user, "/dashboard").careerLog).toBeNull();
    await (await getDb()).insert(notifications).values({
      id: crypto.randomUUID(),
      userId: user.id,
      kind: "career_checkin",
      title: "Your November check-in",
      body: "",
      link: "/dashboard/career-log/check-in?month=2026-11",
      createdAt: Date.now(),
    });
    expect(await dashboardSeeds(user, "/dashboard").careerLog).toEqual(
      await routeJson(readCareerLog()),
    );
    expect(keysOf(dashboardSeeds(user, "/dashboard/jobs"))).not.toContain("careerLog");
  });

  it("answers null when the route would refuse, so the browser asks for itself", async () => {
    const user = await signIn();
    const seeds = dashboardSeeds(user, "/dashboard");
    cookieJar.clear();
    expect(await dashboardSeeds(user, "/dashboard").notifications).toBeNull();
    expect(await seeds.resumeVersions).toEqual({ resumes: [], deletedIds: [] });
  });

  it("lists resume versions that rebuild POST /api/resumes' answer when the browser is current", async () => {
    const user = await signIn();
    const kept = { ...createSampleResume(1_000), title: "Kept", updatedAt: 2_000 };
    const newer = { ...createSampleResume(1_000), title: "Newer", updatedAt: 3_000 };
    const gone = { ...createSampleResume(1_000), title: "Gone" };
    for (const resume of [kept, newer, gone]) {
      await saveBackup(user.id, resume, Date.now(), MAX_RESUMES_PER_USER);
    }
    await deleteResume(
      new Request(`http://localhost/api/resumes/${gone.id}`, { method: "DELETE" }),
      {
        params: Promise.resolve({ id: gone.id }),
      },
    );

    const versions = (await dashboardSeeds(user, "/dashboard").resumeVersions) as ResumeVersions;
    const known = { [kept.id]: 2_000, [newer.id]: 3_000, "local-only": 9 };
    const answer = await routeJson(
      listResumes(
        new Request("http://localhost/api/resumes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ known }),
        }),
      ),
    );

    expect(listFromVersions(versions, known)).toEqual(answer);
    expect(listFromVersions(versions, { [kept.id]: 2_000, [newer.id]: 2_500 })).toBeNull();
  });
});
