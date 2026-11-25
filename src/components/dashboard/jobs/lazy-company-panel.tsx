"use client";

import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import type { CompanyPanelProps } from "./company-panel";

// Its own module, like the outreach dialog: loaded when idle, or at once when a company is opened.
const loader = lazyComponent(() => import("./company-panel").then((m) => m.CompanyPanel));

export function LazyCompanyPanel(props: CompanyPanelProps) {
  return <Lazy loader={loader} wanted={useOpenedOnce(props.name !== null)} props={props} />;
}
