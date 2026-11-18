"use client";

import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import type { PrepareDialogProps } from "./prepare-dialog";

// Its own module, so a page counts only the dialogs it opens. Render it closed too: that starts the idle load.
const loader = lazyComponent(() => import("./prepare-dialog").then((m) => m.PrepareDialog));

export function LazyPrepareDialog(props: PrepareDialogProps) {
  return <Lazy loader={loader} wanted={useOpenedOnce(props.open)} props={props} />;
}
