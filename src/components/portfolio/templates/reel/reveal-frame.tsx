"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useInViewport } from "./motion";
import { useReel } from "./root";

// Ported from HamishMW/portfolio components/image (MIT, see ./LICENSE.txt).
export function RevealFrame({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { mode } = useReel();
  const inViewport = useInViewport(ref, true);
  const visible = inViewport || mode === "still";
  return (
    <div
      className={["image", className].filter(Boolean).join(" ")}
      data-visible={visible}
      data-reveal
      style={{ "--delay": `${delay}ms` } as CSSProperties}
      ref={ref}
    >
      <div
        className="image-wrapper"
        data-reveal
        data-visible={visible}
        style={{ "--delay": `${delay + 1000}ms` } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
