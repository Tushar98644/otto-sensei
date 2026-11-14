import { ArrowRight } from "lucide-react";
import { IntentLink } from "@/components/site/intent-link";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrimaryCta({ className }: { className?: string }) {
  return (
    <IntentLink
      href={ROUTES.studio}
      className={buttonClasses({ size: "lg", className: cn("w-full sm:w-auto", className) })}
    >
      Check my resume
      <ArrowRight />
    </IntentLink>
  );
}
