"use client";

import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import type { OutreachDialogProps } from "./outreach-dialog";

// Its own module, so a page counts only the dialogs it opens. Render it closed too: that starts the idle load.
const loader = lazyComponent(() => import("./outreach-dialog").then((m) => m.OutreachDialog));

export function LazyOutreachDialog(props: OutreachDialogProps) {
  return <Lazy loader={loader} wanted={useOpenedOnce(props.job !== null)} props={props} />;
}
