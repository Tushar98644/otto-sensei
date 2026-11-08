import { CircleExclamationPoint } from "lucide-react";
import { cloneElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

type ControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
};

export type FieldProps = {
  label: ReactNode;
  // Exactly one control: <Input>, <Textarea>, <Select> or a native input. Field clones it to add
  // id, aria-describedby and aria-invalid, keeping any id or description it already has:
  //   <Field label="Email" hint="We'll send a 6-digit code." error={error}>
  //     <Input type="email" value={email} onChange={...} />
  //   </Field>
  children: ReactElement<ControlProps>;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  // Keeps the label for screen readers when the design shows none.
  hideLabel?: boolean;
  className?: string;
};

export function Field({
  label,
  children,
  hint,
  error,
  optional,
  hideLabel = false,
  className,
}: FieldProps) {
  const id = useId();
  const own = children.props;
  const controlId = own.id ?? `${id}-control`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [own["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={controlId} optional={optional} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      {cloneElement(children, {
        id: controlId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : own["aria-invalid"],
      })}
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-fail-ink">
          <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
