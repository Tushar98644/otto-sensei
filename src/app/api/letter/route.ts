import { TEXT_LIMITS } from "@/config/plans";
import { writeCoverLetter } from "@/lib/ai/writing";
import { LetterRequestSchema } from "@/lib/api/types";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { log } from "@/lib/log";
import { readWritingStyle } from "@/lib/writing-style/records";
import { runMetered, type MeteredCopy } from "../fix/metered";

export const runtime = "nodejs";
export const maxDuration = 60;

const COPY: MeteredCopy = {
  signIn: "Sign in to let Otto write a cover letter.",
  invalid: `Otto couldn't read that job post. Paste the full post (up to ${TEXT_LIMITS.jobPostChars.toLocaleString("en-US")} characters) and try again.`,
  refused: "Otto can't write a letter for that job post. Try pasting just the job description.",
  tooLong: "That job post or resume is too long for Otto. Try a shorter job post.",
};

export async function POST(req: Request): Promise<Response> {
  const crossSite = rejectCrossSite(req);
  if (crossSite) {
    log.warn("letter.cross_site");
    return crossSite;
  }
  return runMetered(req, {
    feature: "letter",
    schema: LetterRequestSchema,
    copy: COPY,
    run: async ({ resume, job }, user) =>
      writeCoverLetter(
        resume,
        { jobText: job.text, jobTitle: job.title, company: job.company },
        await readWritingStyle(user.id),
      ),
  });
}
