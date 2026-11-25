"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { StudioStep } from "@/lib/store/resume-store";
import { cn } from "@/lib/utils";
import {
  adjacentStep,
  stepDone,
  stepStatus,
  visibleSteps,
  type StepContext,
  type StepStatus,
} from "./step-state";

export type StudioStepperProps = {
  step: StudioStep;
  context: StepContext;
  onSelect: (step: StudioStep) => void;
};

export function StudioStepper({ step, context, onSelect }: StudioStepperProps) {
  const steps = visibleSteps(context);
  const position = steps.indexOf(step) + 1;
  const previous = adjacentStep(step, -1, context);
  const next = adjacentStep(step, 1, context);
  const t = useMessages("studio");
  const labels = t.steps;

  return (
    <nav aria-label={t.stepper.nav}>
      <div className="flex items-center justify-between gap-3 md:hidden">
        <Button
          variant="secondary"
          size="icon"
          disabled={!previous}
          aria-label={
            previous ? fmt(t.stepper.previousTo, { step: labels[previous] }) : t.stepper.previous
          }
          onClick={() => previous && onSelect(previous)}
        >
          <ChevronLeft />
        </Button>
        <p className="min-w-0 truncate text-center text-sm text-muted">
          {fmt(t.stepper.position, { position, total: steps.length })}
          <span aria-hidden> · </span>
          <span className="sr-only">: </span>
          <span className="font-medium text-ink">{labels[step]}</span>
        </p>
        <Button
          variant="secondary"
          size="icon"
          disabled={!next}
          aria-label={next ? fmt(t.stepper.nextTo, { step: labels[next] }) : t.stepper.next}
          onClick={() => next && onSelect(next)}
        >
          <ChevronRight />
        </Button>
      </div>

      <ol className="hidden items-center gap-2 md:flex">
        {steps.map((item, index) => (
          <li key={item} className="flex flex-1 items-center gap-2 last:flex-none">
            <StepButton
              step={item}
              label={labels[item]}
              number={index + 1}
              status={stepStatus(item, context)}
              current={item === step}
              done={stepDone(item, step, context)}
              onSelect={onSelect}
            />
            {index < steps.length - 1 ? (
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
  label: string;
  number: number;
  status: StepStatus;
  current: boolean;
  done: boolean;
  onSelect: (step: StudioStep) => void;
};

function StepButton({ step, label, number, status, current, done, onSelect }: StepButtonProps) {
  const upcoming = !current && !done;
  return (
    <button
      type="button"
      disabled={status !== "available"}
      aria-current={current ? "step" : undefined}
      data-step={step}
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
        )}
      >
        {done ? <Check className="size-3.5" /> : number}
      </span>
      <span className={cn("text-sm font-medium", current ? "text-ink" : "text-muted")}>
        {label}
      </span>
    </button>
  );
}
