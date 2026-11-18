import type { TailorRequirement } from "@/lib/ai/types";

export function lineQuestion(requirement: TailorRequirement): string {
  return `${requirement.ask} Where, and what did you do?`;
}
