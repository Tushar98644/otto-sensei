import type { ReactNode } from "react";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { ResumeThumbnail } from "../resume-thumbnail";

// Shared with the Add a resume stage, so titles line up across a row.
export const WELL_HEIGHT = "h-52 sm:h-56";

const SHEET = "absolute inset-x-[15%] top-6 block transition duration-300 ease-out";

export function PaperWell({
  resume,
  onOpen,
  children,
}: {
  resume: Resume;
  onOpen: () => void;
  children?: ReactNode;
}) {
  return (
    // Keep the fixed height: content-visibility sizes off-screen cards by it.
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      onClick={onOpen}
      className={cn(
        "relative block w-full overflow-hidden rounded-xl bg-surface-muted [content-visibility:auto]",
        WELL_HEIGHT,
      )}
    >
      <span
        className={cn(
          SHEET,
          "aspect-17/22 translate-x-1.5 rotate-3 rounded-xs bg-surface shadow-page group-hover/card:translate-x-2.5 group-hover/card:rotate-5",
        )}
      />
      <span className={cn(SHEET, "group-hover/card:-translate-y-2")}>
        <ResumeThumbnail
          resume={resume}
          className="rounded-xs shadow-page transition-shadow duration-300 ease-out group-hover/card:shadow-page-lift"
        />
      </span>
      {children}
    </button>
  );
}
