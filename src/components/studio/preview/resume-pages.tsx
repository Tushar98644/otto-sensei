"use client";

import {
  memo,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { PageContent, ownPage, pdfStyleToCss } from "@/components/dashboard/resume-thumbnail";
import type { TemplateTheme } from "@/components/pdf/theme";
import { themeFor } from "@/components/pdf/themes";
import type { PdfEntry, PdfModel } from "@/lib/pdf/model";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { pageWindows, samePages, type PageBreak, type PageWindow } from "./paginate";
import { usePdfFonts } from "./pdf-fonts";

// Points, as react-pdf lays the page out; the preview draws 1px per point and scales the page.
export const PAGE_POINTS: Record<PdfPageSize, { width: number; height: number }> = {
  LETTER: { width: 612, height: 792 },
  A4: { width: 595.28, height: 841.89 },
};

const numberOf = (value: unknown) => (typeof value === "number" ? value : 0);

function flowHeight(page: CSSProperties, size: PdfPageSize): number {
  return PAGE_POINTS[size].height - numberOf(page.paddingTop) - numberOf(page.paddingBottom);
}

function addBreak(breaks: PageBreak[], element: Element | undefined) {
  if (!(element instanceof HTMLElement)) return;
  const margin = Number.parseFloat(element.style.marginTop) || 0;
  breaks.push({ cut: element.offsetTop - margin, next: element.offsetTop });
}

const titlePartsOf = (theme: TemplateTheme) =>
  theme.headingRule === "below" || theme.headingRule === "above" ? 2 : 1;

function entryLists(model: PdfModel): (readonly PdfEntry[] | null)[] {
  return [
    ...model.sections.map((section) => ("entries" in section ? section.entries : null)),
    ...(model.extras ?? []).map((section) => (section.list === null ? section.entries : null)),
  ];
}

// Where the PDF may break: before a section, a later entry, line or paragraph, or an entry's second bullet on.
function collectBreaks(flow: HTMLElement, model: PdfModel, theme: TemplateTheme): PageBreak[] {
  const titleParts = titlePartsOf(theme);
  const bodies = entryLists(model);
  const breaks: PageBreak[] = [];
  const blocks = Array.from(flow.children);
  blocks.slice(1).forEach((block, index) => {
    addBreak(breaks, block);
    const entries = bodies[index] ?? null;
    Array.from(block.children)
      .slice(titleParts)
      .forEach((child, at) => {
        if (at > 0) addBreak(breaks, child);
        const bullets = entries?.[at]?.bullets.length ?? 0;
        const parts = Array.from(child.children);
        for (let line = parts.length - bullets + 1; line < parts.length; line++) {
          addBreak(breaks, parts[line]);
        }
      });
  });
  return breaks;
}

// The part of the resume a click on the page landed on.
export type PagePick = { section: string; entry?: string; bullet?: string };

function childOf(parent: Element, target: Element): Element | null {
  let node: Element | null = target;
  while (node && node.parentElement !== parent) node = node.parentElement;
  return node;
}

function pickAt(target: Element, model: PdfModel, theme: TemplateTheme): PagePick | null {
  const flow = target.closest("[data-flow]");
  const block = flow ? childOf(flow, target) : null;
  if (!flow || !block) return null;
  const index = Array.from(flow.children).indexOf(block);
  if (index === 0) return { section: "basics" };
  const shown = model.sections[index - 1];
  const extra = model.extras?.[index - 1 - model.sections.length];
  const section = shown ? shown.key : extra?.id;
  if (!section) return null;
  const child = childOf(block, target);
  const at = child ? Array.from(block.children).indexOf(child) - titlePartsOf(theme) : -1;
  const entry = child && at >= 0 ? entryLists(model)[index - 1]?.[at] : undefined;
  if (!child || !entry) return { section };
  const part = childOf(child, target);
  const parts = Array.from(child.children);
  const line = part ? parts.indexOf(part) - (parts.length - entry.bullets.length) : -1;
  return { section, entry: entry.id, bullet: entry.bullets[line]?.id };
}

export type ResumePagesProps = {
  resume: Resume;
  pageSize: PdfPageSize;
  onPages?: (count: number) => void;
  onPick?: (pick: PagePick) => void;
  className?: string;
};

// Every page of the PDF, drawn by the card renderer and paged the way react-pdf pages it.
export const ResumePages = memo(function ResumePages({
  resume,
  pageSize,
  onPages,
  onPick,
  className,
}: ResumePagesProps) {
  const { template, design } = resume;
  const theme = useMemo(() => themeFor({ template, design }), [template, design]);
  const { model, blank } = useMemo(() => ownPage(resume), [resume]);
  const fonts = usePdfFonts(theme);
  const pageCss = useMemo(() => pdfStyleToCss(theme.styles.page), [theme]);
  const height = flowHeight(pageCss, pageSize);
  const [pages, setPages] = useState<PageWindow[]>(() => [{ start: 0, end: height }]);
  const flowRef = useRef<HTMLDivElement>(null);
  const { width: pageWidth, height: pageHeight } = PAGE_POINTS[pageSize];

  useLayoutEffect(() => {
    const flow = flowRef.current;
    const next = flow
      ? pageWindows(collectBreaks(flow, model, theme), flow.offsetHeight, height)
      : [{ start: 0, end: height }];
    setPages((current) => (samePages(current, next) ? current : next));
  }, [model, theme, height, fonts]);

  useLayoutEffect(() => {
    onPages?.(pages.length);
  }, [pages.length, onPages]);

  const shown = blank ? pages.slice(0, 1) : pages;

  function pick(event: MouseEvent<HTMLDivElement>) {
    const found = event.target instanceof Element ? pickAt(event.target, model, theme) : null;
    if (found) onPick?.(found);
  }

  return (
    <div
      aria-hidden
      onClick={onPick ? pick : undefined}
      className={cn(
        "flex flex-col gap-4 text-left select-none",
        onPick &&
          "cursor-pointer [&_[data-flow]>*]:transition-colors [&_[data-flow]>*]:duration-150 [&_[data-flow]>*:hover]:bg-ink/4",
        className,
      )}
    >
      {shown.map((page, index) => (
        <div
          key={index}
          className="@container relative w-full overflow-hidden rounded-xs bg-surface shadow-page"
          style={{ aspectRatio: `${pageWidth} / ${pageHeight}` }}
        >
          <div
            className="absolute top-0 left-0 origin-top-left overflow-hidden"
            style={{
              ...pageCss,
              width: pageWidth,
              height: pageHeight,
              scale: `tan(atan2(100cqw, ${pageWidth}px))`,
              overflowWrap: "break-word",
            }}
          >
            <div className="overflow-hidden" style={{ height: page.end - page.start }}>
              <div
                ref={index === 0 ? flowRef : undefined}
                data-flow
                className="relative flow-root"
                style={page.start > 0 ? { translate: `0 -${page.start}px` } : undefined}
              >
                {blank ? null : <PageContent model={model} theme={theme} />}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
