import { answerQuestion } from "@/lib/ai/writing";
import { AnswerRequestSchema } from "@/lib/api/types";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { log } from "@/lib/log";
import { readWritingStyle } from "@/lib/writing-style/records";
import { runMetered, type MeteredCopy } from "../fix/metered";

export const runtime = "nodejs";
export const maxDuration = 60;

const COPY: MeteredCopy = {
  signIn: "Sign in to let Otto draft an answer.",
  invalid:
    "Otto couldn't read that. Check the question is 8 to 500 characters and the job post is the full post.",
  refused: "Otto can't answer that question. Try rewording it.",
  tooLong: "That job post or resume is too long for Otto. Try a shorter job post.",
};

export async function POST(req: Request): Promise<Response> {
  const crossSite = rejectCrossSite(req);
  if (crossSite) {
    log.warn("answer.cross_site");
    return crossSite;
  }
  return runMetered(req, {
    feature: "letter",
    schema: AnswerRequestSchema,
    copy: COPY,
    run: async ({ resume, job, question }, user) =>
      answerQuestion(
        resume,
        { jobText: job.text, jobTitle: job.title, company: job.company },
        question,
        await readWritingStyle(user.id),
      ),
  });
}
