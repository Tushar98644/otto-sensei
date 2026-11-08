import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SpinnerProps = {
  className?: string;
  // Screen-reader text for a spinner that stands alone. Leave it out when visible text or a busy
  // button already says what's happening, or it gets announced twice.
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
