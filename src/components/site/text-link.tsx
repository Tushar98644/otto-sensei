import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(
        "rounded-sm font-medium text-ink underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-ink",
        className,
      )}
    />
  );
}
