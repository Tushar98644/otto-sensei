import { planIncludes } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { aiEnabled } from "@/lib/env";
import { log } from "@/lib/log";
import { consumeUsage, refundUsage } from "@/lib/usage";

// Server-only. Whether an upload is read by the AI or by the rule-based reader. Uploads are never
// turned away for this: signed out, on Free, or once the plan's AI reads are used up, the file is
// still read, by rules, which costs nothing.

export type AiRead = {
  useAI: boolean;
  // True when the plan or its allowance, not the setup, sent this file to the rule-based reader.
  limited: boolean;
  // Gives the read back when the AI wasn't used after all (a scan, a failed call).
  giveBack: () => Promise<void>;
};

const nothingToGiveBack = async () => {};

export async function claimAiRead(
  user: SessionUser | null,
  now = Date.now(),
): Promise<AiRead> {
  if (!aiEnabled()) return { useAI: false, limited: false, giveBack: nothingToGiveBack };
  // AI reads are Pro and Max (and the trial); everyone else gets the rule-based reader.
  if (!user || !planIncludes(user.plan, "import")) {
    return { useAI: false, limited: true, giveBack: nothingToGiveBack };
  }
  try {
    const { allowed } = await consumeUsage(user, "import", now);
    return allowed
      ? { useAI: true, limited: false, giveBack: () => refundUsage(user, "import", now) }
      : { useAI: false, limited: true, giveBack: nothingToGiveBack };
  } catch (error) {
    // Can't count: the rules read it, so an outage never runs up AI calls nobody counted.
    log.warn("import.ai_reads_unavailable", {}, error);
    return { useAI: false, limited: false, giveBack: nothingToGiveBack };
  }
}
