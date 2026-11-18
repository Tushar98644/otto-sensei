"use client";

import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import type { WriteDialogProps } from "./write-dialog";

// Its own module, so a page counts only the dialogs it opens. Render it closed too: that starts the idle load.
const loader = lazyComponent(() => import("./write-dialog").then((m) => m.WriteDialog));

export function LazyWriteDialog(props: WriteDialogProps) {
  return <Lazy loader={loader} wanted={useOpenedOnce(props.open)} props={props} />;
}
