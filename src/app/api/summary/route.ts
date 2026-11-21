import { nothingToSummarize, writeSummary } from "@/lib/ai/summary";
import { SummaryRequestSchema } from "@/lib/api/types";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { log } from "@/lib/log";
import { runMetered, type MeteredCopy } from "../fix/metered";

export const runtime = "nodejs";
export const maxDuration = 60;

const COPY: MeteredCopy = {
  signIn: "Sign in to let Otto help with your summary.",
  invalid: "Otto couldn't read that. Write a sentence or two first, or add a job to your resume.",
  refused: "Otto can't help with that summary. Try rewording it.",
  tooLong: "That resume is too long for Otto. Trim it a little and try again.",
};

export async function POST(req: Request): Promise<Response> {
  const crossSite = rejectCrossSite(req);
  if (crossSite) {
    log.warn("summary.cross_site");
    return crossSite;
  }
  return runMetered(req, {
    feature: "fix",
    schema: SummaryRequestSchema,
    copy: COPY,
    run: writeSummary,
    nothingToDo: nothingToSummarize,
  });
}
