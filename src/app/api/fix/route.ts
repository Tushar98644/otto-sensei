import { TEXT_LIMITS } from "@/config/plans";
import { fixBullet } from "@/lib/ai/fix";
import { FixRequestSchema } from "@/lib/api/types";
import { passSubject } from "@/lib/usage-passes";
import { runMetered, type MeteredCopy } from "./metered";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const maxDuration = 60;

const COPY: MeteredCopy = {
  signIn: "Sign in to let Otto fix this line.",
  invalid: `Otto couldn't read that line. Check it isn't empty or over ${TEXT_LIMITS.bulletChars} characters.`,
  refused: "Otto can't help with that line. Try rewording it.",
  tooLong: `That line is too long for Otto. Keep it under ${TEXT_LIMITS.bulletChars} characters.`,
};

export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  return runMetered(req, {
    feature: "fix",
    schema: FixRequestSchema,
    copy: COPY,
    run: (input, user, { ui }) => fixBullet(input, { ui }),
    // Answering Otto's questions finishes the fix the first call paid for.
    followUp: {
      subject: ({ bullet, role }) => passSubject(bullet, role.title, role.company),
      isFollowUp: ({ answers }) => answers.length > 0,
      opensPass: (result) => result.questions.length > 0,
    },
  });
});
