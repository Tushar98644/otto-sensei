"use client";

import { ArrowUp } from "lucide-react";
import type { ReorderPlan } from "./apply";

export type ReorderPreviewProps = {
  plans: ReorderPlan[];
  reorder: Record<string, boolean>;
  onToggle: (experienceId: string, on: boolean) => void;
};

// Shows at most this many moved lines per job; the rest move too.
const SHOWN_LINES = 3;

export function ReorderPreview({ plans, reorder, onToggle }: ReorderPreviewProps) {
  return (
    <ul className="flex flex-col gap-4">
      {plans.map((plan) => {
        const on = reorder[plan.experienceId] !== false;
        const hidden = plan.movedUp.length - SHOWN_LINES;
        return (
          <li
            key={plan.experienceId}
            className="flex flex-col gap-3 rounded-2xl bg-surface-muted p-4"
          >
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={on}
                onChange={(event) => onToggle(plan.experienceId, event.target.checked)}
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-ink"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-ink">{plan.label}</span>
                <span className="text-sm text-muted">We&apos;ll move these lines up:</span>
              </span>
            </label>
            <ol className="flex flex-col gap-2 pl-8">
              {plan.movedUp.slice(0, SHOWN_LINES).map((bullet) => (
                <li key={bullet.id} className="flex items-start gap-2 text-sm text-ink">
                  <ArrowUp className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                  <span className="line-clamp-2">{bullet.text}</span>
                </li>
              ))}
              {hidden > 0 ? <li className="text-sm text-muted">And {hidden} more.</li> : null}
            </ol>
          </li>
        );
      })}
    </ul>
  );
}
