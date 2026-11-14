import { isDeepStrictEqual } from "node:util";
import { after } from "next/server";
import { log } from "@/lib/log";
import type { Resume } from "@/lib/resume/schema";
import { shareSnapshot } from "@/lib/share/snapshot";
import { refreshPortfolioPages } from "./cache";
import { followerOf, followResume, markFollowed } from "./records";
import { syncAllowed } from "./screen";

const TRIES = 3;

function versionOf(snapshot: unknown): number {
  const at = Number((snapshot as { updatedAt?: unknown } | null)?.updatedAt);
  return Number.isFinite(at) ? at : 0;
}

function publicPart(snapshot: unknown): unknown {
  return snapshot && typeof snapshot === "object" ? { ...snapshot, updatedAt: 0 } : snapshot;
}

async function follow(userId: string, resume: Resume): Promise<void> {
  try {
    const next = shareSnapshot(resume);
    const wanted = publicPart(JSON.parse(JSON.stringify(next)));
    for (let attempt = 1; attempt <= TRIES; attempt++) {
      const follower = await followerOf(userId, resume.id);
      if (!follower || versionOf(follower.snapshot) >= resume.updatedAt) return;
      // A renamed resume or a tailoring note changes nothing on the page: no check, no purge.
      if (isDeepStrictEqual(publicPart(follower.snapshot), wanted)) {
        if (await markFollowed(userId, resume, follower.updatedAt)) return;
        continue;
      }
      if (follower.published && !(await syncAllowed(follower.snapshot, next, "portfolio.sync"))) {
        return;
      }
      const slug = await followResume(userId, resume, Date.now(), follower.updatedAt);
      if (slug) {
        if (follower.published) refreshPortfolioPages([slug]);
        return;
      }
    }
  } catch (error) {
    log.warn("portfolio.sync_failed", {}, error);
  }
}

// Never throws, and never holds up the backup: it runs once the answer has gone (at once outside a request).
export async function syncPortfolioWith(userId: string, resume: Resume): Promise<void> {
  try {
    after(() => follow(userId, resume));
  } catch {
    await follow(userId, resume);
  }
}
