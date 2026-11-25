import { answerQuestion } from "@/lib/ai/writing";
import { AnswerRequestSchema } from "@/lib/api/types";
import { readWritingStyle } from "@/lib/writing-style/records";
import type { MeteredRoute } from "../fix/metered";

// One answer flow, so the app and Otto for Chrome share its plan rule, allowance and limits.
export const ANSWER_ROUTE = {
  feature: "letter",
  schema: AnswerRequestSchema,
  copy: {
    signIn: "Sign in to let Otto draft an answer.",
    invalid:
      "Otto couldn't read that. Check the question is 8 to 500 characters and the job post is the full post.",
    refused: "Otto can't answer that question. Try rewording it.",
    tooLong: "That job post or resume is too long for Otto. Try a shorter job post.",
  },
  run: async ({ resume, job, question }, user, { ui }) =>
    answerQuestion(
      resume,
      { jobText: job.text, jobTitle: job.title, company: job.company },
      question,
      await readWritingStyle(user.id),
      { ui },
    ),
} satisfies MeteredRoute<typeof AnswerRequestSchema, Awaited<ReturnType<typeof answerQuestion>>>;
