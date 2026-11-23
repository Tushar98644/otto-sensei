import {
  applicationLimit,
  nextPlan,
  PLANS,
  resumeLimit,
  type PaidPlanId,
  type PlanId,
  type ProTool,
} from "@/config/plans";

export type KeptTool = Extract<ProTool, "resumes" | "tracker">;

const count = new Intl.NumberFormat("en-US");

export function isKeptTool(tool: ProTool): tool is KeptTool {
  return tool === "resumes" || tool === "tracker";
}

function limitOf(tool: KeptTool, plan: PlanId): number {
  return tool === "resumes" ? resumeLimit(plan) : applicationLimit(plan);
}

// `held` is how many the account has: one kept from a bigger plan can be well past the number.
export function planFullText(
  tool: KeptTool,
  plan: PaidPlanId,
  held?: number,
  offerNext = true,
): string {
  const limit = limitOf(tool, plan);
  const over = held !== undefined && held > limit ? held - limit + 1 : null;
  const name = PLANS[plan].name;
  const up = offerNext ? nextPlan(plan) : null;
  const upsell = up ? `, or move to ${PLANS[up].name} for ${count.format(limitOf(tool, up))}` : "";
  const have = over === null ? "" : `; you have ${count.format(held ?? 0)}`;
  if (tool === "resumes") {
    const remove = over === null ? "one" : count.format(over);
    return `${name} keeps ${count.format(limit)} resumes${have}. Delete ${remove} to save another${upsell}.`;
  }
  const remove =
    over === null ? "some old ones to add more" : `${count.format(over)} to add another`;
  return `${name} tracks ${count.format(limit)} applications${have}. Delete ${remove}${upsell}.`;
}
