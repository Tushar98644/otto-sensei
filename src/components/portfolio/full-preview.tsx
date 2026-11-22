"use client";

import { ChevronLeft, ChevronRight, Monitor, Smartphone, X } from "lucide-react";
import {
  Suspense,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { jordanPage } from "@/lib/portfolio/fixtures/jordan";
import { PORTFOLIO_TEMPLATE_INFO, templateOrder } from "@/lib/portfolio/templates";
import { PORTFOLIO_TEMPLATE_IDS, type PortfolioTemplateId } from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";
import type { TemplateSample } from "./live-template";
import { PreviewSourceNote, PreviewSourceSwitch, usePreviewSource } from "./preview-source";
import { templateFontClasses } from "./templates/fonts";
import { LazyTemplate, preloadTemplate } from "./templates/lazy";

type Width = "desktop" | "phone";

// contain: layout makes the scroll box the containing block for templates' fixed navs.
export function FullPortfolioPreview({
  id,
  own,
  action,
  note = "Preview only: not live yet.",
  resumeHref = null,
  commandMenu = true,
  onChange,
  onClose,
}: {
  id: PortfolioTemplateId;
  own: TemplateSample | null;
  action: { label: string; onSelect: () => void } | null;
  note?: string;
  resumeHref?: string | null;
  commandMenu?: boolean;
  onChange: (id: PortfolioTemplateId) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [width, setWidth] = useState<Width>("desktop");
  const choice = usePreviewSource(own);
  const data = useMemo(() => choice.sample ?? jordanPage(), [choice.sample]);
  const { name, description, colors } = PORTFOLIO_TEMPLATE_INFO[id];
  const order = templateOrder(PORTFOLIO_TEMPLATE_IDS);
  const at = order.indexOf(id);
  const count = order.length;
  const before = order[(at - 1 + count) % count];
  const after = order[(at + 1) % count];

  // The designs the arrows lead to are fetched now, so stepping shows no empty page.
  useEffect(() => {
    if (before) preloadTemplate(before);
    if (after) preloadTemplate(after);
  }, [before, after]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  function step(by: number) {
    const next = order[(at + by + count) % count];
    if (next) onChange(next);
  }

  function onCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onClose();
  }

  // The browser may close it itself (Escape twice); skip if it was shown again since (dev remount).
  function onDialogClose(event: SyntheticEvent<HTMLDialogElement>) {
    if (!event.currentTarget.open) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={onCancel}
      onClose={onDialogClose}
      className="m-0 size-full max-h-none max-w-none overflow-hidden bg-background p-0 text-ink"
    >
      <div className="flex h-full flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-3 sm:gap-3 sm:px-6">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => step(-1)} aria-label="Previous design">
              <ChevronLeft aria-hidden />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => step(1)} aria-label="Next design">
              <ChevronRight aria-hidden />
            </Button>
          </div>
          <div className="min-w-0 flex-1">
            <p id={titleId} className="truncate text-sm/5 font-medium text-ink">
              {name}
              <span className="font-normal text-subtle">
                {" "}
                · {at + 1} of {count}
              </span>
            </p>
            <p className="hidden truncate text-xs/4 text-subtle sm:block">
              {description} {note}
            </p>
          </div>
          <div
            role="group"
            aria-label="Page width"
            className="hidden items-center rounded-full bg-surface-muted p-1 md:flex"
          >
            {(["desktop", "phone"] as const).map((option) => {
              const Icon = option === "desktop" ? Monitor : Smartphone;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={width === option}
                  onClick={() => setWidth(option)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm/5 text-muted transition-colors",
                    width === option && "bg-surface text-ink shadow-xs",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {option === "desktop" ? "Desktop" : "Phone"}
                </button>
              );
            })}
          </div>
          {action ? (
            <Button size="sm" onClick={action.onSelect}>
              {action.label}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close preview">
            <X aria-hidden />
          </Button>
        </header>

        <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3 sm:px-6">
          <PreviewSourceNote source={choice.source} short className="min-w-0 truncate sm:hidden" />
          <PreviewSourceNote source={choice.source} className="min-w-0 truncate max-sm:hidden" />
          {choice.canSwitch ? <PreviewSourceSwitch source={choice.source} /> : null}
        </div>

        <div className={cn("min-h-0 flex-1", width === "phone" && "bg-surface-muted md:p-6")}>
          <div
            className={cn(
              "relative h-full contain-layout",
              width === "phone" &&
                "mx-auto max-w-sm overflow-hidden ring-1 ring-border md:rounded-3xl",
            )}
          >
            <Suspense
              fallback={
                <div
                  aria-hidden
                  className="h-full"
                  style={{ backgroundColor: colors.background }}
                />
              }
            >
              <div
                key={`${id}-${width}-${choice.source}`}
                className={cn(
                  // One screen is the window less the header (4rem) and the page bar (2.5rem).
                  "flex h-full flex-col overflow-y-auto [--pf-screen:calc(100dvh-6.5rem)]",
                  width === "phone" && "md:[--pf-screen:calc(100dvh-9.5rem)]",
                  templateFontClasses(id),
                )}
              >
                <LazyTemplate
                  id={id}
                  view={data.view}
                  content={data.content}
                  resumeHref={choice.source === "own" ? resumeHref : null}
                  commandMenu={commandMenu}
                />
              </div>
            </Suspense>
          </div>
        </div>
      </div>
    </dialog>
  );
}
