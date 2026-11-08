import { CircleCheck, CircleX, TriangleExclamationPoint, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { CheckStatus } from "@/lib/checks/types";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";

// Status is never color alone: each one has its own icon shape and a word.
export const STATUS_LABELS: Record<CheckStatus, string> = {
  pass: "Passed",
  warn: "Warning",
  fail: "Problem",
};

const ICONS: Record<CheckStatus, LucideIcon> = {
  pass: CircleCheck,
  warn: TriangleExclamationPoint,
  fail: CircleX,
};

const ICON_COLORS: Record<CheckStatus, string> = {
  pass: "text-pass",
  warn: "text-warn",
  fail: "text-fail",
};

export type StatusIconProps = {
  status: CheckStatus;
  // Screen-reader text, STATUS_LABELS by default. Pass "" only when visible text right next to
  // the icon already names the status.
  label?: string;
  className?: string;
};

export function StatusIcon({ status, label = STATUS_LABELS[status], className }: StatusIconProps) {
  const Icon = ICONS[status];
  return (
    <span className="inline-flex shrink-0">
      <Icon className={cn("size-5", ICON_COLORS[status], className)} />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

export type StatusPillProps = {
  status: CheckStatus;
  // Visible text, STATUS_LABELS by default.
  children?: ReactNode;
  className?: string;
};

export function StatusPill({ status, children, className }: StatusPillProps) {
  const Icon = ICONS[status];
  return (
    <Badge variant={status} className={className}>
      <Icon className={cn("size-3.5", ICON_COLORS[status])} />
      {children ?? STATUS_LABELS[status]}
    </Badge>
  );
}
