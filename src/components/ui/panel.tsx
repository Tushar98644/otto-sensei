import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Stone, behind product moments, plans and account cards. White cards go on a panel, never
// straight on the paper background, where white is nearly invisible.
export function Panel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("rounded-3xl bg-surface-muted p-3 sm:p-6 lg:p-10", className)} />
  );
}

export type WindowProps = Omit<ComponentProps<"div">, "title"> & {
  // The file name in the bar, e.g. "maya-chen.pdf".
  title: ReactNode;
  // Facts on the right of the bar, e.g. "PDF · 1 page · 97 words".
  meta?: ReactNode;
  bodyClassName?: string;
};

// A product view with a window bar: the white card plus three quiet dots and a file name.
export function Window({ title, meta, className, bodyClassName, children, ...props }: WindowProps) {
  return (
    <div
      {...props}
      className={cn("overflow-hidden rounded-2xl bg-surface text-ink shadow-card", className)}
    >
      <div className="flex h-10 items-center gap-2 border-b border-border px-4">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-surface-strong" />
          <span className="size-2.5 rounded-full bg-surface-strong" />
          <span className="size-2.5 rounded-full bg-surface-strong" />
        </span>
        <span className="ml-1 min-w-0 truncate text-xs text-subtle">{title}</span>
        {meta ? (
          <span className="ml-auto shrink-0 text-xs text-subtle max-sm:hidden">{meta}</span>
        ) : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
