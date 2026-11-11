"use client";

import Image from "next/image";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import type { PortfolioTemplateId } from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";
import { LIVE_WIDTH } from "./live-size";
import type { TemplateSample } from "./live-template";

const LiveTemplate = lazy(() =>
  import("./live-template").then((module) => ({ default: module.LiveTemplate })),
);

// A static picture until the person points at or tabs to the card, then the real template scaled
// down: eight live pages at once were too slow. It unmounts when the card scrolls far away.
export function TemplatePreview({
  id,
  sample,
  sizes,
  className,
}: {
  id: PortfolioTemplateId;
  // null draws Jordan's sample; the static picture holds its place until the live page mounts.
  sample: TemplateSample | null;
  sizes: string;
  className?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const card = frame.current?.closest("label, button, a, li") ?? frame.current;
    if (!card || wanted) return;
    const want = () => setWanted(true);
    card.addEventListener("pointerenter", want);
    card.addEventListener("focusin", want);
    return () => {
      card.removeEventListener("pointerenter", want);
      card.removeEventListener("focusin", want);
    };
  }, [wanted]);

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
      {sample === null || !wanted ? (
        <Image src={info.thumbnail} alt="" fill sizes={sizes} className="object-cover object-top" />
      ) : null}
      {wanted && near && scale > 0 ? (
        <Suspense fallback={null}>
          <LiveTemplate id={id} sample={sample} scale={scale} />
        </Suspense>
      ) : null}
    </div>
  );
}
