import type { ComponentProps, ReactNode } from "react";
import { OttoMark } from "@/components/site/otto-mark";
import { cn } from "@/lib/utils";

export type SignInScreenProps = Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  message: ReactNode;
  footer?: ReactNode;
};

// /login and the signed-out /account share it: Otto's head, the title and his one line, centred over the form.
export function SignInScreen({
  title,
  message,
  footer,
  children,
  className,
  ...props
}: SignInScreenProps) {
  return (
    <div {...props} className={cn("mx-auto flex w-full max-w-sm flex-col gap-8", className)}>
      <header className="flex flex-col items-center gap-4 text-center">
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-full bg-surface ring-1 ring-border"
        >
          <OttoMark className="size-10" />
        </span>
        <h1 className="font-display text-4xl/10 font-normal tracking-tight text-balance text-ink sm:text-5xl/13">
          {title}
        </h1>
        <p className="text-base/7 text-balance text-muted">{message}</p>
      </header>
      {children}
      {footer ? <p className="text-center text-sm/6 text-balance text-muted">{footer}</p> : null}
    </div>
  );
}
