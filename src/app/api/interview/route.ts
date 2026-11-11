import { TEXT_LIMITS } from "@/config/plans";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import type { InterviewPacksResponse } from "@/lib/api/types";
import { prepareInterview } from "@/lib/ai/interview";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { InterviewRequestSchema, type InterviewPrep, type InterviewResult } from "@/lib/insights/prep";
import { listPreps, savePrep } from "@/lib/insights/prep-store";
import { log } from "@/lib/log";
import { runMetered, type MeteredCopy } from "../fix/metered";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const COPY: MeteredCopy = {
  signIn: "Sign in to let Otto help you prepare.",
  invalid: `Otto couldn't read that job post. Paste the full post (up to ${TEXT_LIMITS.jobPostChars.toLocaleString("en-US")} characters) and try again.`,
  refused: "Otto can't prepare for that job post. Try pasting just the job description.",
  tooLong: "That job post or resume is too long for Otto. Try a shorter job post.",
};

async function saveForCaller(applicationId: string, prep: InterviewPrep): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    const saved = await savePrep(user.id, applicationId, prep);
    if (!saved) log.info("interview.application_gone");
    return saved;
  } catch (error) {
    log.error("interview.save_failed", error);
    return false;
  }
}

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to see your interview prep.", 401, NO_STORE);
    const response: Omit<InterviewPacksResponse, "ok"> = { packs: await listPreps(user.id) };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("interview.list_failed", error);
    return fail("server_error", "Couldn't load your interview prep. Please try again.", 500, NO_STORE);
  }
}

export async function POST(req: Request): Promise<Response> {
  const crossSite = rejectCrossSite(req);
  if (crossSite) {
    log.warn("interview.cross_site");
    return crossSite;
  }
  return runMetered(req, {
    feature: "letter",
    schema: InterviewRequestSchema,
    copy: COPY,
    run: async ({ applicationId, resume, job }): Promise<InterviewResult> => {
      const prep = await prepareInterview(resume, {
        jobText: job.text,
        jobTitle: job.title,
        company: job.company,
      });
      return { prep, saved: await saveForCaller(applicationId, prep) };
    },
  });
}
