import {
  CircleCheck,
  CircleExclamationPoint,
  Info,
  TriangleExclamationPoint,
  type LucideIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warn" | "error";

const STYLES: Record<AlertVariant, { box: string; icon: string; Icon: LucideIcon }> = {
  info: { box: "bg-surface-muted text-ink", icon: "text-muted", Icon: Info },
  success: {
    box: "bg-pass-soft text-pass-ink",
    icon: "text-pass",
    Icon: CircleCheck,
  },
  warn: {
    box: "bg-warn-soft text-warn-ink",
    icon: "text-warn",
    Icon: TriangleExclamationPoint,
  },
  error: {
    box: "bg-fail-soft text-fail-ink",
    icon: "text-fail",
    Icon: CircleExclamationPoint,
  },
};

export type AlertProps = Omit<ComponentProps<"div">, "title"> & {
  variant?: AlertVariant;
  title?: ReactNode;
  action?: ReactNode;
};

export function Alert({
  variant = "info",
  title,
  action,
  role,
  className,
  children,
  ...props
}: AlertProps) {
  const { box, icon, Icon } = STYLES[variant];
  return (
    <div
      {...props}
      role={role ?? (variant === "error" ? "alert" : "status")}
      className={cn("flex items-start gap-3 rounded-2xl p-4 text-sm", box, className)}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", icon)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
        {action ? <div className="mt-2 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
