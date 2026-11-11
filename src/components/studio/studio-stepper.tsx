"use client";

import { Check, ChevronLeft, ChevronRight, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STEP_LABELS, STUDIO_STEPS, type StudioStep } from "@/lib/store/resume-store";
import { cn } from "@/lib/utils";
import { adjacentStep, stepStatus, type StepContext, type StepStatus } from "./step-state";

export type StudioStepperProps = {
  step: StudioStep;
  context: StepContext;
  onSelect: (step: StudioStep) => void;
};

export function StudioStepper({ step, context, onSelect }: StudioStepperProps) {
  const position = STUDIO_STEPS.indexOf(step) + 1;
  const previous = adjacentStep(step, -1, context);
  const next = adjacentStep(step, 1, context);

  return (
    <nav aria-label="Studio steps">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <Button
          variant="secondary"
          size="icon"
          disabled={!previous}
          aria-label={previous ? `Previous step: ${STEP_LABELS[previous]}` : "Previous step"}
          onClick={() => previous && onSelect(previous)}
        >
          <ChevronLeft />
        </Button>
        <p className="min-w-0 truncate text-center text-sm text-muted">
          Step {position} of {STUDIO_STEPS.length}
          <span aria-hidden> · </span>
          <span className="sr-only">: </span>
          <span className="font-medium text-ink">{STEP_LABELS[step]}</span>
        </p>
        <Button
          variant="secondary"
          size="icon"
          disabled={!next}
          aria-label={next ? `Next step: ${STEP_LABELS[next]}` : "Next step"}
          onClick={() => next && onSelect(next)}
        >
          <ChevronRight />
        </Button>
      </div>

      <ol className="hidden items-center gap-2 md:flex">
        {STUDIO_STEPS.map((item, index) => (
          <li key={item} className="flex flex-1 items-center gap-2 last:flex-none">
            <StepButton
              step={item}
              number={index + 1}
              status={stepStatus(item, context)}
              current={item === step}
              done={index < position - 1 && stepStatus(item, context) === "available"}
              onSelect={onSelect}
            />
            {index < STUDIO_STEPS.length - 1 ? (
              <span aria-hidden className="h-px min-w-4 flex-1 bg-border" />
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

type StepButtonProps = {
  step: StudioStep;
  number: number;
  status: StepStatus;
  current: boolean;
  // Before the current step in the flow. Shown with a check; the number stays for screen readers.
  done: boolean;
  onSelect: (step: StudioStep) => void;
};

// Steps you can't open yet stay at full strength in muted text instead of fading out: "Skipped"
// is information, and a faded label drops below readable contrast on stone.
function StepButton({ step, number, status, current, done, onSelect }: StepButtonProps) {
  const skipped = status === "skipped";
  const upcoming = !current && !done && !skipped;
  return (
    <button
      type="button"
      disabled={status !== "available"}
      aria-current={current ? "step" : undefined}
      onClick={() => onSelect(step)}
      className="group flex shrink-0 items-center gap-2 rounded-lg py-2 pr-3 pl-2 text-left transition-colors hover:bg-ink/5 disabled:pointer-events-none aria-[current=step]:hover:bg-transparent"
    >
      <span
        aria-hidden
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
          current && "bg-primary text-white",
          done && "bg-surface text-ink",
          upcoming && "text-muted inset-ring inset-ring-border-strong",
          skipped && "text-muted inset-ring inset-ring-border-strong",
        )}
      >
        {skipped ? <Minus className="size-3.5" /> : done ? <Check className="size-3.5" /> : number}
      </span>
      <span className="flex flex-col leading-tight">
        <span className={cn("text-sm font-medium", current ? "text-ink" : "text-muted")}>
          {STEP_LABELS[step]}
        </span>
        {skipped ? (
          <span className="text-xs text-subtle">
            Skipped<span className="sr-only">, only for uploaded files</span>
          </span>
        ) : null}
      </span>
    </button>
  );
}
