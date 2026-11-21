import { BriefcaseBusiness, Check, Plus } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Otto, PLAY_TWICE } from "@/components/mascot/otto";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { ResumeThumbnail } from "./resume-thumbnail";

function Stage({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="relative h-40 overflow-hidden rounded-xl bg-surface-muted"
      style={{ "--otto-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}

const PAGE = "rounded-xs shadow-page";
const MOVE = "transition duration-300 ease-out";

export function CheckArt({ resume }: { resume: Resume }) {
  return (
    <Stage delay={-1}>
      <div
        className={cn(
          "absolute top-6 left-1/6 w-28 -rotate-3 group-hover/action:-translate-y-1 group-hover/action:-rotate-2",
          MOVE,
        )}
      >
        <div className="relative">
          <ResumeThumbnail resume={resume} standIn className={PAGE} />
          <div
            className={cn(
              "absolute inset-x-0 top-1 h-4 bg-highlight opacity-0 mix-blend-multiply motion-safe:animate-scene-scan",
              PLAY_TWICE,
            )}
          />
        </div>
      </div>
      <Otto pose="read" size={100} lively settle className="absolute right-1/8 -bottom-1" />
    </Stage>
  );
}

function KeywordChip({ have, className }: { have: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 items-center gap-0.5 rounded-full px-1.5",
        have ? "bg-surface-muted" : "border border-dashed border-border-strong",
        className,
      )}
    >
      {have ? (
        <Check className="size-2.5 text-ink" strokeWidth={2.5} />
      ) : (
        <Plus className="size-2.5 text-ink" strokeWidth={2.5} />
      )}
      <span className={cn("h-1 rounded-full bg-border-strong/60", have ? "w-6" : "w-4")} />
    </span>
  );
}

export function TailorArt() {
  return (
    <Stage delay={-3.4}>
      <Otto pose="point" size={100} lively settle className="absolute -bottom-1 left-2" />
      <div
        className={cn(
          "absolute top-9 right-5 w-40 rounded-lg bg-surface p-3 shadow-page group-hover/action:-translate-y-1",
          MOVE,
        )}
      >
        <div className="flex items-center gap-1.5">
          <BriefcaseBusiness className="size-3 text-muted" />
          <span className="h-1.5 w-16 rounded-full bg-border-strong/50" />
        </div>
        <span className="mt-2.5 block h-1 w-full rounded-full bg-surface-strong" />
        <span className="mt-1 block h-1 w-4/5 rounded-full bg-surface-strong" />
        <span className="mt-1 block h-1 w-11/12 rounded-full bg-surface-strong" />
        <div className="mt-2.5 flex flex-wrap gap-1">
          <KeywordChip have />
          <KeywordChip have />
          <span className="grid">
            <KeywordChip
              have={false}
              className={cn(
                "col-start-1 row-start-1 motion-safe:animate-scene-keyword-out",
                PLAY_TWICE,
              )}
            />
            <KeywordChip
              have
              className={cn(
                "col-start-1 row-start-1 opacity-0 motion-safe:animate-scene-keyword-in",
                PLAY_TWICE,
              )}
            />
          </span>
        </div>
      </div>
    </Stage>
  );
}

const FAN: readonly { template: TemplateId; className: string; float: number }[] = [
  {
    template: "classic",
    className: "top-9 left-5 -rotate-6 group-hover/action:-translate-x-1 group-hover/action:-rotate-9",
    float: 0,
  },
  {
    template: "modern",
    className: "top-6 left-14 z-10 group-hover/action:-translate-y-1",
    float: -2,
  },
  {
    template: "executive",
    className: "top-9 left-23 rotate-6 group-hover/action:translate-x-1 group-hover/action:rotate-9",
    float: -4,
  },
];

export function FormatsArt({ resume }: { resume: Resume }) {
  return (
    <Stage delay={-5.8}>
      {FAN.map((page) => (
        <div key={page.template} className={cn("absolute w-20", MOVE, page.className)}>
          <div
            className={cn("motion-safe:animate-scene-float", PLAY_TWICE)}
            style={{ "--scene-delay": `${page.float}s` } as CSSProperties}
          >
            <ResumeThumbnail resume={resume} template={page.template} standIn className={PAGE} />
          </div>
        </div>
      ))}
      <Otto pose="think" size={100} lively settle className="absolute right-3 -bottom-1" />
    </Stage>
  );
}
