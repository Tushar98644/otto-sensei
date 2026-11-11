import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export type LivePillProps = Omit<ComponentProps<"span">, "children" | "role"> & {
  // At most 4 words naming what changed: "Line updated", "Copied", "0 problems now".
  children: ReactNode;
  busy?: boolean;
  // Off when a live region around the pill already announces it, so it isn't read twice.
  announce?: boolean;
};

// Shown where the change happened (toasts own screen corners). Never for errors: use an Alert.
export function LivePill({
  children,
  busy = false,
  announce = true,
  className,
  ...props
}: LivePillProps) {
  return (
    <span
      {...props}
      role={announce ? "status" : undefined}
      className={cn(
        "inline-flex h-8 w-fit shrink-0 animate-pop items-center gap-2 rounded-full bg-lavender px-3.5 text-sm font-medium whitespace-nowrap text-ink",
        className,
      )}
    >
      {busy ? (
        <Spinner className="size-3.5 text-ink" />
      ) : (
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
      )}
      {children}
    </span>
  );
}
