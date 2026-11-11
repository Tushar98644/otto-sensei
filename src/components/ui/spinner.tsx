import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SpinnerProps = {
  className?: string;
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
