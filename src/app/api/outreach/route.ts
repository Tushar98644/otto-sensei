import { TEXT_LIMITS } from "@/config/plans";
import { writeOutreach } from "@/lib/ai/writing";
import { OutreachRequestSchema } from "@/lib/api/types";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { log } from "@/lib/log";
import { readWritingStyle } from "@/lib/writing-style/records";
import { runMetered, type MeteredCopy } from "../fix/metered";

export const runtime = "nodejs";
export const maxDuration = 60;

const COPY: MeteredCopy = {
  signIn: "Sign in to let Otto write an outreach message.",
  invalid: `Otto couldn't read that job post. Paste the full post (up to ${TEXT_LIMITS.jobPostChars.toLocaleString("en-US")} characters) and try again.`,
  refused: "Otto can't write a message for that job post. Try pasting just the job description.",
  tooLong: "That job post or resume is too long for Otto. Try a shorter job post.",
};

// Counts against the same allowance as cover letters and answers.
export async function POST(req: Request): Promise<Response> {
  const crossSite = rejectCrossSite(req);
  if (crossSite) {
    log.warn("outreach.cross_site");
    return crossSite;
  }
  return runMetered(req, {
    feature: "letter",
    schema: OutreachRequestSchema,
    copy: COPY,
    run: async ({ resume, job, followUp }, user) =>
      writeOutreach(
        resume,
        { jobText: job.text, jobTitle: job.title, company: job.company },
        await readWritingStyle(user.id),
        { followUpDays: followUp?.days ?? null },
      ),
  });
}
