import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  illustration?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  titleAs?: "h2" | "h3";
  className?: string;
};

export function EmptyState({
  illustration,
  title,
  description,
  action,
  titleAs: Heading = "h3",
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-12 text-center", className)}>
      {illustration ? <div className="mb-6">{illustration}</div> : null}
      <Heading className="font-sans text-lg/7 font-medium text-ink">{title}</Heading>
      {description ? <p className="mt-2 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>
      ) : null}
    </div>
  );
}
