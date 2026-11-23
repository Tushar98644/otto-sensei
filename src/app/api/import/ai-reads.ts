import { planIncludes } from "@/config/plans";
import { checkAiBudget, spendAiTokens } from "@/lib/ai-budget";
import type { CreditNote } from "@/lib/api/types";
import type { SessionUser } from "@/lib/auth/types";
import { aiEnabled } from "@/lib/env";
import { log } from "@/lib/log";
import { consumeUsage, refundUsage } from "@/lib/usage";
import { takeUnitOrCredit } from "@/lib/usage-credit";

export type AiRead = {
  useAI: boolean;
  limited: boolean;
  giveBack: () => Promise<void>;
  spend: <T>(work: () => Promise<T>) => Promise<T>;
  credit: CreditNote | null;
};

export const NO_AI_READ: AiRead = {
  useAI: false,
  limited: false,
  giveBack: async () => {},
  spend: (work) => work(),
  credit: null,
};
const LIMITED: AiRead = { ...NO_AI_READ, limited: true };

// Credit pays only for a read the person asked for, never for the automatic one after a weak read.
export async function claimAiRead(
  user: SessionUser | null,
  now = Date.now(),
  { credit = false }: { credit?: boolean } = {},
): Promise<AiRead> {
  if (!aiEnabled()) return NO_AI_READ;
  if (!user || !planIncludes(user.plan, "import")) return LIMITED;
  try {
    const budget = await checkAiBudget(user, now);
    if (credit) {
      const taken = await takeUnitOrCredit(user, "import", now, { budgetAllowed: budget.allowed });
      if (!taken.allowed) {
        if (taken.budget)
          log.warn("ai_budget.reached", { plan: user.plan, period: taken.period.kind });
        return LIMITED;
      }
      return {
        useAI: true,
        limited: false,
        giveBack: taken.giveBack,
        spend: (work) => spendAiTokens(user, now, work),
        credit: taken.credit,
      };
    }
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
      credit: null,
    };
  } catch (error) {
    log.warn("import.ai_reads_unavailable", {}, error);
    return NO_AI_READ;
  }
}
