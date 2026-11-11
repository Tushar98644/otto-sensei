import { planIncludes } from "@/config/plans";
import { checkAiBudget, spendAiTokens } from "@/lib/ai-budget";
import type { SessionUser } from "@/lib/auth/types";
import { aiEnabled } from "@/lib/env";
import { log } from "@/lib/log";
import { consumeUsage, refundUsage } from "@/lib/usage";

export type AiRead = {
  useAI: boolean;
  limited: boolean;
  giveBack: () => Promise<void>;
  spend: <T>(work: () => Promise<T>) => Promise<T>;
};

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
    log.warn("import.ai_reads_unavailable", {}, error);
    return NO_AI_READ;
  }
}
