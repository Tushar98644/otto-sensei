import { planIncludes } from "@/config/plans";
import { checkAiBudget, spendAiTokens } from "@/lib/ai-budget";
import type { SessionUser } from "@/lib/auth/types";
import { aiEnabled } from "@/lib/env";
import { log } from "@/lib/log";
import { consumeUsage, refundUsage } from "@/lib/usage";

// Uploads are never turned away for this: signed out, on Free or out of AI reads, the file is
// still read by rules, which costs nothing.

export type AiRead = {
  useAI: boolean;
  // True when the plan or its allowance, not the setup, sent this file to the rule-based reader.
  limited: boolean;
  // Gives the read back when the AI wasn't used after all (a scan, a failed call).
  giveBack: () => Promise<void>;
  // Runs the AI read and charges its tokens to the account's AI budget.
  spend: <T>(work: () => Promise<T>) => Promise<T>;
};

// The rule-based reader, picked by the setup (no AI key) or before any AI read was asked for.
export const NO_AI_READ: AiRead = {
  useAI: false,
  limited: false,
  giveBack: async () => {},
  spend: (work) => work(),
};
const LIMITED: AiRead = { ...NO_AI_READ, limited: true };

export async function claimAiRead(
  user: SessionUser | null,
  now = Date.now(),
): Promise<AiRead> {
  if (!aiEnabled()) return NO_AI_READ;
  if (!user || !planIncludes(user.plan, "import")) return LIMITED;
  try {
    const budget = await checkAiBudget(user, now);
    if (!budget.allowed) {
      log.warn("ai_budget.reached", { plan: user.plan, period: budget.period.kind });
      return LIMITED;
    }
    const { allowed } = await consumeUsage(user, "import", now);
    if (!allowed) return LIMITED;
    return {
      useAI: true,
      limited: false,
      giveBack: () => refundUsage(user, "import", now),
      spend: (work) => spendAiTokens(user, now, work),
    };
  } catch (error) {
    // Can't count: the rules read it, so an outage never runs up AI calls nobody counted.
    log.warn("import.ai_reads_unavailable", {}, error);
    return NO_AI_READ;
  }
}
