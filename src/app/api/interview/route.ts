import { TEXT_LIMITS } from "@/config/plans";
import { prepareInterview } from "@/lib/ai/interview";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { InterviewRequestSchema, type InterviewPrep, type InterviewResult } from "@/lib/insights/prep";
import { savePrep } from "@/lib/insights/prep-store";
import { log } from "@/lib/log";
import { runMetered, type MeteredCopy } from "../fix/metered";

export const runtime = "nodejs";
export const maxDuration = 60;

const COPY: MeteredCopy = {
  signIn: "Sign in to let Otto help you prepare.",
  invalid: `Otto couldn't read that job post. Paste the full post (up to ${TEXT_LIMITS.jobPostChars.toLocaleString("en-US")} characters) and try again.`,
  refused: "Otto can't prepare for that job post. Try pasting just the job description.",
  tooLong: "That job post or resume is too long for Otto. Try a shorter job post.",
};

// The pack was paid for once it's made, so a failed save still hands it over (saved: false).
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

// Resume + job post → likely questions, STAR outlines from the resume's own lines and questions to
// ask, saved on the application. Uses one of the month's cover letters and answers.
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
