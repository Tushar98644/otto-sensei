"use client";

import Image from "next/image";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import type { PortfolioTemplateId } from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";
import type { TemplateSample } from "./live-template";

const LiveTemplate = lazy(() =>
  import("./live-template").then((module) => ({ default: module.LiveTemplate })),
);
// LIVE_WIDTH of ./live-template.tsx, written out: importing it would load that chunk up front.
const LIVE_WIDTH = 1280;

// A card showing the top of one template, drawn by the real template component and scaled down.
// It mounts only while the card is near the screen and unmounts once it scrolls far away, so a
// phone going past eight designs holds one or two live pages at a time. Until then (and with
// Jordan's sample) the card shows the template's static picture.
export function TemplatePreview({
  id,
  sample,
  sizes,
  className,
}: {
  id: PortfolioTemplateId;
  // Whose page to draw; null draws Jordan's sample, with the static picture holding its place
  // until the live page mounts.
  sample: TemplateSample | null;
  // The card's width on screen, for the static picture (next/image sizes).
  sizes: string;
  className?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const box = frame.current;
    if (!box) return;
    const resize = new ResizeObserver(([entry]) =>
      setScale((entry?.contentRect.width ?? 0) / LIVE_WIDTH),
    );
    resize.observe(box);
    const seen = new IntersectionObserver(([entry]) => setNear(entry?.isIntersecting ?? false), {
      rootMargin: "400px 0px",
    });
    seen.observe(box);
    return () => {
      resize.disconnect();
      seen.disconnect();
    };
  }, []);

  const info = PORTFOLIO_TEMPLATE_INFO[id];
  return (
    <div
      ref={frame}
      className={cn(
        "relative aspect-16/10 overflow-hidden rounded-xl ring-1 ring-border",
        className,
      )}
      style={{ backgroundColor: info.colors.background }}
    >
      {sample === null ? (
        <Image src={info.thumbnail} alt="" fill sizes={sizes} className="object-cover object-top" />
      ) : null}
      {near && scale > 0 ? (
        <Suspense fallback={null}>
          <LiveTemplate id={id} sample={sample} scale={scale} />
        </Suspense>
      ) : null}
    </div>
  );
}
