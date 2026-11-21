"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { postLine, type WriteTarget } from "./write-targets";

export const ANOTHER_JOB = "another";

export function TargetPicker({
  targets,
  target,
  disabled,
  onPick,
}: {
  targets: readonly WriteTarget[];
  target: WriteTarget | null;
  disabled: boolean;
  onPick: (value: string) => void;
}) {
  return (
    <Field label="For" hint={target ? postLine(target.post) : undefined}>
      <Select
        value={target?.value ?? ANOTHER_JOB}
        disabled={disabled}
        onChange={(event) => onPick(event.target.value)}
      >
        {targets.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
        <option value={ANOTHER_JOB}>Another job: paste its link</option>
      </Select>
    </Field>
  );
}

export function WriteRow({
  action,
  busy,
  note,
  onWrite,
}: {
  action: { label: string; icon: LucideIcon };
  busy: boolean;
  note: string | null;
  onWrite: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button size="lg" loading={busy} onClick={onWrite} className="w-full sm:w-auto" data-autofocus>
        <action.icon aria-hidden />
        {action.label}
      </Button>
      {note ? <p className="text-sm text-muted">{note}</p> : null}
    </div>
  );
}
