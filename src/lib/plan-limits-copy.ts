import {
  applicationLimit,
  nextPlan,
  PLANS,
  resumeLimit,
  type PaidPlanId,
  type PlanId,
  type ProTool,
} from "@/config/plans";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";

export type KeptTool = Extract<ProTool, "resumes" | "tracker">;

export function isKeptTool(tool: ProTool): tool is KeptTool {
  return tool === "resumes" || tool === "tracker";
}

function limitOf(tool: KeptTool, plan: PlanId): number {
  return tool === "resumes" ? resumeLimit(plan) : applicationLimit(plan);
}

export type PlanFullWords = Messages["otto"]["full"];

// `held` is how many the account has: one kept from a bigger plan can be well past the number.
export function planFullCopy(words: PlanFullWords, format: Format) {
  return (tool: KeptTool, plan: PaidPlanId, held?: number, offerNext = true): string => {
    const limit = limitOf(tool, plan);
    const over = held !== undefined && held > limit ? held - limit + 1 : null;
    const up = offerNext ? nextPlan(plan) : null;
    const upsell = up
      ? fmt(words.upsell, { plan: PLANS[up].name, limit: format.number(limitOf(tool, up)) })
      : "";
    const values = { plan: PLANS[plan].name, limit: format.number(limit), upsell };
    if (over === null) return fmt(tool === "resumes" ? words.resumes : words.tracker, values);
    return fmt(tool === "resumes" ? words.resumesOver : words.trackerOver, {
      ...values,
      held: format.number(held ?? 0),
      over: format.number(over),
    });
  };
}
