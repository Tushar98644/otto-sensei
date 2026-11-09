import { log } from "@/lib/log";
import type { Resume } from "@/lib/resume/schema";
import { refreshPortfolioPages } from "./cache";
import { followResume } from "./records";

// Server-only. Called after every cloud backup of a resume (PUT /api/resumes/:id): a portfolio
// that keeps in sync with it takes the new version. Resumes are edited in the browser and backed
// up as the person types, so this is how a page follows edits made in the studio.

/** Never throws: a page that misses one version must not fail the backup itself. */
export async function syncPortfolioWith(userId: string, resume: Resume): Promise<void> {
  try {
    const slug = await followResume(userId, resume);
    if (slug) refreshPortfolioPages([slug]);
  } catch (error) {
    log.warn("portfolio.sync_failed", {}, error);
  }
}
