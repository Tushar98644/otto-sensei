import { ANON_LIMITS, IP_LIMITS } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { aiEnabled } from "@/lib/env";
import { clientIp, getDeviceId } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";
import { consumeUsage, refundUsage } from "@/lib/usage";
import { ipBucket } from "./upload-limits";

// Server-only. Whether an upload is read by the AI or by the rule-based reader. Uploads are never
// turned away for this: once the plan's AI reads are used up (per account per month, or for
// signed-out visitors per device and per network over 30 days), the file is still read, by rules,
// which costs nothing.

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;

export type AiRead = {
  useAI: boolean;
  // True when the allowance, not the setup, sent this file to the rule-based reader.
  limited: boolean;
  // Gives the read back when the AI wasn't used after all (a scan, a failed call).
  giveBack: () => Promise<void>;
};

const nothingToGiveBack = async () => {};

export async function claimAiRead(
  req: Request,
  user: SessionUser | null,
  now = Date.now(),
): Promise<AiRead> {
  if (!aiEnabled()) return { useAI: false, limited: false, giveBack: nothingToGiveBack };
  try {
    if (user) {
      const { allowed } = await consumeUsage(user, "import", now);
      return allowed
        ? { useAI: true, limited: false, giveBack: () => refundUsage(user, "import", now) }
        : { useAI: false, limited: true, giveBack: nothingToGiveBack };
    }
    const network = await rateLimit(
      `import-ai:ip:${ipBucket(clientIp(req))}`,
      IP_LIMITS.aiReadsPer30Days,
      DAYS_30_MS,
      now,
    );
    const device = network.allowed
      ? await rateLimit(`import-ai:device:${await getDeviceId()}`, ANON_LIMITS.aiReadsPer30Days, DAYS_30_MS, now)
      : network;
    const allowed = network.allowed && device.allowed;
    return { useAI: allowed, limited: !allowed, giveBack: nothingToGiveBack };
  } catch (error) {
    // Can't count: the rules read it, so an outage never runs up AI calls nobody counted.
    log.warn("import.ai_reads_unavailable", {}, error);
    return { useAI: false, limited: false, giveBack: nothingToGiveBack };
  }
}
