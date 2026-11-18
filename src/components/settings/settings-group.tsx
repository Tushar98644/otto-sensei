import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SECTION_SCROLL, type SettingsSection } from "./sections";

export function SettingsGroup({
  section,
  children,
}: {
  section: SettingsSection;
  children: ReactNode;
}) {
  const danger = section.key === "danger";
  const titleId = `${section.id}-title`;
  return (
    <section
      id={section.id}
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cn(
        "flex flex-col gap-4 outline-none",
        SECTION_SCROLL,
        danger && "border-t border-border pt-10",
      )}
    >
      <header className="flex flex-col gap-1 px-1">
        <h2
          id={titleId}
          className={cn(
            "font-display text-2xl/8 font-normal tracking-tight",
            danger ? "text-fail-ink" : "text-ink",
          )}
        >
          {section.label}
        </h2>
        <p className="max-w-prose text-sm/6 text-muted">{section.description}</p>
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
