import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FolderTone = "plain" | "lavender" | "forest";

export type FolderCardProps = ComponentProps<"div"> & {
  tab: ReactNode;
  tone?: FolderTone;
  tabEnd?: ReactNode;
  bodyClassName?: string;
};

const TABS: Record<FolderTone, string> = {
  plain: "bg-surface text-subtle",
  lavender: "bg-lavender text-ink",
  forest: "bg-primary text-white",
};

// The body's top-left corner stays square so tab and body read as one shape.
export function FolderCard({
  tab,
  tone = "plain",
  tabEnd,
  className,
  bodyClassName,
  children,
  ...props
}: FolderCardProps) {
  return (
    <div {...props} className={cn("flex flex-col", className)}>
      <div className="flex items-end justify-between gap-3">
        <div
          className={cn(
            "flex h-8 max-w-full min-w-0 items-center rounded-t-xl px-3.5 text-xs/4 font-medium tracking-widest uppercase",
            TABS[tone],
          )}
        >
          <span className="truncate">{tab}</span>
        </div>
        {tabEnd ? <div className="flex shrink-0 items-center pb-1.5">{tabEnd}</div> : null}
      </div>
      <div className={cn("flex-1 rounded-2xl rounded-tl-none bg-surface p-5", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
