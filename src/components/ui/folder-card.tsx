import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FolderTone = "plain" | "lavender" | "forest";

export type FolderCardProps = ComponentProps<"div"> & {
  // A short label on the folder's tab, e.g. "Uploaded file" or "Classic". Shown in small caps.
  tab: ReactNode;
  tone?: FolderTone;
  // Sits at the far end of the tab row, outside the tab: a badge or a quiet action.
  tabEnd?: ReactNode;
  bodyClassName?: string;
};

const TABS: Record<FolderTone, string> = {
  plain: "bg-surface text-subtle",
  lavender: "bg-lavender text-ink",
  forest: "bg-primary text-white",
};

// Otto's signature surface: everything here is a document, so cards are folders with a labelled
// tab. The tab and the body share the white of the sheet (or the tab takes a tone), and the body's
// top-left corner stays square so the two read as one shape. Use on the mist canvas or a panel,
// like any card.
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
