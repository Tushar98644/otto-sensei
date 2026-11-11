import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlClasses } from "./input";

export type SelectProps = ComponentProps<"select"> & {
  invalid?: boolean;
};

export function Select({
  className,
  invalid,
  children,
  "aria-invalid": ariaInvalid,
  ...props
}: SelectProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        {...props}
        aria-invalid={invalid || ariaInvalid || undefined}
        className={cn(controlClasses, "h-11 cursor-pointer appearance-none pr-10 pl-3.5")}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}
