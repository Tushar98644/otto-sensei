import { runMetered, type MeteredCopy } from "@/app/api/fix/metered";
import { withWordsOnly } from "@/lib/career-log/entry";
import { logLines } from "@/lib/career-log/lines";
import { entriesBetween } from "@/lib/career-log/records";
import type { LogLinesResult } from "@/lib/career-log/types";
import { LogLinesSchema } from "@/lib/career-log/validation";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const maxDuration = 60;

const COPY: MeteredCopy = {
  signIn: "Sign in to turn your log into resume lines.",
  invalid: "Pick a job and the months to read, then try again.",
  refused: "Otto can't write lines from those notes. Try a different range.",
  tooLong: "That's a lot of notes at once. Pick fewer months.",
};

// Pro: one press is one Build with Otto draft. A range with no notes in it costs nothing.
export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  return runMetered(req, {
    feature: "draft",
    schema: LogLinesSchema,
    copy: COPY,
    nothingToDo: async (input, user): Promise<LogLinesResult | null> => {
      const entries = withWordsOnly(await entriesBetween(user.id, input.from, input.to));
      return entries.length === 0 ? { lines: [], months: 0 } : null;
    },
    run: async (input, user) =>
      logLines(input, await entriesBetween(user.id, input.from, input.to)),
  });
});
