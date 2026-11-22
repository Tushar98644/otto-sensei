import { hasProTools, type PlanId } from "@/config/plans";

// The one plan rule for tracking from email: Pro, Max and the Pro trial. Free's single tracked application would leave nothing to update.
export function canTrackFromEmail(plan: PlanId): boolean {
  return hasProTools(plan);
}
