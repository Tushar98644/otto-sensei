import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SpinnerProps = {
  className?: string;
  // For a spinner on its own. Leave it out when nearby text already says it, or it's read twice.
  label?: string;
};

export function Spinner({ className, label }: SpinnerProps) {
  const icon = <LoaderCircle className={cn("size-4 shrink-0 animate-spin", className)} />;
  if (!label) return icon;
  return (
    <span role="status" className="inline-flex">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}
