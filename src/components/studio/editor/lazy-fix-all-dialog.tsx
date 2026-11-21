"use client";

import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import type { FixAllDialogProps } from "./fix-all-dialog";

// Most visits never fix every line at once, so the review list loads when idle or on first use.
const loader = lazyComponent(() => import("./fix-all-dialog").then((m) => m.FixAllDialog));

export function LazyFixAllDialog(props: FixAllDialogProps) {
  return <Lazy loader={loader} wanted={useOpenedOnce(props.all.state.open)} props={props} />;
}
