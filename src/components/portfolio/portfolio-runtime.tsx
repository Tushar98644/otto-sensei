"use client";

import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";
import { SiteFontVariables } from "@/components/site/site-font-variables";
import type { PortfolioTemplateId } from "@/lib/portfolio/types";

// One chunk per design (fonts, islands), linked only for the design drawn.
const RUNTIMES: Record<PortfolioTemplateId, ComponentType> = {
  navy: dynamic(() => import("./templates/navy/runtime")),
  dock: dynamic(() => import("./templates/dock/runtime")),
  reel: dynamic(() => import("./templates/reel/runtime")),
  bento: dynamic(() => import("./templates/bento/runtime")),
  cv: dynamic(() => import("./templates/cv/runtime")),
  prose: dynamic(() => import("./templates/prose/runtime")),
  folio: dynamic(() => import("./templates/folio/runtime")),
  paper: dynamic(() => import("./templates/paper/runtime")),
  gazette: dynamic(() => import("./templates/gazette/runtime")),
  terminal: dynamic(() => import("./templates/terminal/runtime")),
  brutal: dynamic(() => import("./templates/brutal/runtime")),
  card: dynamic(() => import("./templates/card/runtime")),
  retro: dynamic(() => import("./templates/retro/runtime")),
  starring: dynamic(() => import("./templates/starring/runtime")),
  bubble: dynamic(() => import("./templates/bubble/runtime")),
};

// Ahead of the template, so its islands are in when it hydrates; it shares the JSON-LD's slot, so the template keeps its place in the tree and its useId values.
export function PortfolioRuntime({
  template,
  children,
}: {
  template: PortfolioTemplateId;
  children?: ReactNode;
}) {
  const Runtime = RUNTIMES[template];
  return (
    <>
      {children}
      {/* The app's two faces aren't loaded here: the skip link draws in the system's. */}
      <SiteFontVariables sans="ui-sans-serif, system-ui, sans-serif" display="ui-serif, serif" />
      <Runtime />
    </>
  );
}
