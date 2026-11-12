import { log } from "@/lib/log";
import type { Resume } from "@/lib/resume/schema";
import { shareSnapshot } from "@/lib/share/snapshot";
import { refreshPortfolioPages } from "./cache";
import { followerOf, followResume } from "./records";
import { pageAllowed } from "./screen";

// Never throws: a missed page update must not fail the backup itself.
export async function syncPortfolioWith(userId: string, resume: Resume): Promise<void> {
  try {
    const follower = await followerOf(userId, resume.id);
    if (!follower) return;
    if (follower.published) {
      const allowed = await pageAllowed({ snapshot: shareSnapshot(resume) }, "portfolio.sync");
      if (!allowed) return;
    }
    const slug = await followResume(userId, resume, Date.now(), follower.updatedAt);
    if (slug) refreshPortfolioPages([slug]);
  } catch (error) {
    log.warn("portfolio.sync_failed", {}, error);
  }
}
