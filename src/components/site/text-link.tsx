import { cn } from "@/lib/utils";
import { IntentLink, type IntentLinkProps } from "./intent-link";

export function TextLink({ className, ...props }: IntentLinkProps) {
  return (
    <IntentLink
      {...props}
      className={cn(
        "rounded-sm font-medium text-ink underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-ink",
        className,
      )}
    />
  );
}
