import { Badge } from "@/components/ui/badge";
import { PLANS, type PlanId } from "@/config/plans";

export function PlanBadge({ plan, className }: { plan: PlanId; className?: string }) {
  return (
    <Badge variant={plan === "free" ? "neutral" : "ink"} className={className}>
      {PLANS[plan].name} plan
    </Badge>
  );
}
