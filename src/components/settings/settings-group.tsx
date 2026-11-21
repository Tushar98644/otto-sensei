import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SECTION_SCROLL } from "./sections";

export function SettingsGroup({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const titleId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cn("flex flex-col gap-3 outline-none", SECTION_SCROLL)}
    >
      <header className="flex flex-col gap-1 px-1">
        <h2 id={titleId} className="font-display text-2xl/8 font-normal tracking-tight text-ink">
          {title}
        </h2>
        {description ? <p className="max-w-prose text-sm/6 text-muted">{description}</p> : null}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
