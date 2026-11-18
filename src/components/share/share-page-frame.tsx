import type { ReactNode } from "react";
import { OttoMark } from "@/components/site/otto-mark";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";

// The footer is a plain <a>: only a full page load lets the root layout's invite tracker read ?ref.
export function SharePageFrame({
  children,
  homeHref = ROUTES.home,
}: {
  children: ReactNode;
  homeHref?: string;
}) {
  return (
    <main id="main" className="min-h-dvh bg-surface-muted px-4 pt-4 pb-10 sm:px-6 sm:pt-8 sm:pb-16">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:gap-6">
        {children}
        <footer className="flex justify-center">
          <a
            href={homeHref}
            className="group inline-flex items-center gap-2 text-sm/5 text-subtle hover:text-ink"
          >
            <OttoMark className="size-6" />
            <span>
              Made with{" "}
              <span className="font-medium text-ink underline decoration-border-strong underline-offset-4 group-hover:decoration-ink">
                {BRAND.name}
              </span>
            </span>
          </a>
        </footer>
      </div>
    </main>
  );
}
