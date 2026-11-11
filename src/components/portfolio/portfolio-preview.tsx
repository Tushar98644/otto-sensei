"use client";

import { Maximize2, Monitor, Smartphone } from "lucide-react";
import { useCallback, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import type { PortfolioContentView } from "@/lib/portfolio/content";
import { portfolioPath, type PortfolioTemplateId } from "@/lib/portfolio/types";
import type { PortfolioView } from "@/lib/portfolio/view";
import { cn } from "@/lib/utils";
import { previewFit, type PreviewWidth } from "./preview-frame";
import { templateFontClasses } from "./templates/fonts";
import { PORTFOLIO_TEMPLATES } from "./templates/registry";

type PortfolioPreviewProps = {
  view: PortfolioView;
  content: PortfolioContentView;
  template: PortfolioTemplateId;
  slug: string;
  onExpand: () => void;
};

// Below this, a 1280px page zoomed to fit is too small to read.
const NARROW_PANE = 560;

const WIDTHS: readonly { value: PreviewWidth; label: string; Icon: typeof Monitor }[] = [
  { value: "desktop", label: "Desktop", Icon: Monitor },
  { value: "phone", label: "Phone", Icon: Smartphone },
];

function useBoxSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;
    observer.current = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.current.observe(node);
  }, []);
  return [ref, size] as const;
}

// Same template component as /p/<slug>, at a real screen width zoomed to fit. Only the page is
// inert, not the scroll box: an inert box takes no pointer events, so the wheel fell through to
// the editor. The box is a containing block for position: fixed (contain: layout), so a fixed
// header stays inside the frame.
export function PortfolioPreview({
  view,
  content,
  template,
  slug,
  onExpand,
}: PortfolioPreviewProps) {
  // Until the owner picks one: a pane too narrow for a readable desktop page starts on Phone.
  const [picked, setPicked] = useState<PreviewWidth | null>(null);
  const [paneRef, pane] = useBoxSize();
  const [scrollerRef, box] = useBoxSize();
  const width: PreviewWidth =
    picked ?? (pane.width > 0 && pane.width < NARROW_PANE ? "phone" : "desktop");
  const { Component, name } = PORTFOLIO_TEMPLATES[template];
  const { page, zoom } = previewFit(width, box.width);
  const screen = zoom > 0 ? box.height / zoom : 0;
  const phone = width === "phone";

  return (
    <section
      ref={paneRef}
      aria-label="Preview"
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          role="group"
          aria-label="Preview width"
          className="flex gap-1 rounded-xl bg-surface-strong p-1"
        >
          {WIDTHS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={width === value}
              onClick={() => setPicked(value)}
              className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted -outline-offset-2 hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-control motion-safe:transition-colors"
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </button>
          ))}
        </div>
        <p className="min-w-0 flex-1 truncate text-sm/5 text-subtle">{name} · as visitors see it</p>
        <Button variant="ghost" size="sm" onClick={onExpand}>
          <Maximize2 aria-hidden />
          <span className="max-xl:sr-only">Full screen</span>
        </Button>
      </div>

      <div className={cn("flex min-h-0 flex-1 justify-center", phone && "pb-1")}>
        <div
          className={cn(
            "flex min-h-0 flex-col overflow-hidden bg-surface",
            phone
              ? "w-full max-w-97.5 rounded-4xl shadow-card ring-1 ring-ink/10"
              : "w-full rounded-2xl shadow-card",
          )}
        >
          {phone ? null : (
            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-4">
              <span aria-hidden className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-surface-strong" />
                <span className="size-2.5 rounded-full bg-surface-strong" />
                <span className="size-2.5 rounded-full bg-surface-strong" />
              </span>
              <span className="ml-1 min-w-0 truncate text-xs text-subtle">
                {portfolioPath(slug)}
              </span>
            </div>
          )}
          <div className="relative min-h-0 flex-1 contain-layout">
            <div
              // Remounted per design and width, so each one opens at its top.
              key={`${template}-${width}`}
              ref={scrollerRef}
              tabIndex={0}
              role="region"
              aria-label={`Preview of your page in ${name}. Scroll to see all of it.`}
              className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain -outline-offset-2"
            >
              {zoom > 0 ? (
                <div
                  inert
                  className={cn("flex flex-col", templateFontClasses(template))}
                  style={
                    {
                      zoom,
                      width: page,
                      minHeight: screen,
                      "--pf-screen": `${screen}px`,
                    } as CSSProperties
                  }
                >
                  <Component view={view} content={content} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
