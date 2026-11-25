import { TEXT_LIMITS } from "@/config/plans";
import { tailorResume } from "@/lib/ai/tailor";
import { TailorRequestSchema } from "@/lib/api/types";
import { runMetered, type MeteredCopy } from "../fix/metered";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const maxDuration = 60;

const COPY: MeteredCopy = {
  signIn: "Sign in to let Otto tailor your resume.",
  invalid: `Otto couldn't read that job post. Paste the full post (up to ${TEXT_LIMITS.jobPostChars.toLocaleString("en-US")} characters) and try again.`,
  refused: "Otto can't work with that job post. Try pasting just the job description.",
  tooLong: "That job post or resume is too long for Otto. Try a shorter job post.",
};

export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  return runMetered(req, {
    feature: "tailor",
    schema: TailorRequestSchema,
    copy: COPY,
    run: ({ resume, job }, user, { ui }) =>
      tailorResume(
        resume,
        { jobText: job.text, jobTitle: job.title, company: job.company },
        { ui },
      ),
  });
});
