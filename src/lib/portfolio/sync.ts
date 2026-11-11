import { log } from "@/lib/log";
import type { Resume } from "@/lib/resume/schema";
import { refreshPortfolioPages } from "./cache";
import { followResume } from "./records";

// Never throws: a missed page update must not fail the backup itself.
export async function syncPortfolioWith(userId: string, resume: Resume): Promise<void> {
  try {
    const slug = await followResume(userId, resume);
    if (slug) refreshPortfolioPages([slug]);
  } catch (error) {
    log.warn("portfolio.sync_failed", {}, error);
  }
}
