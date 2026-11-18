"use client";

import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import type { ApplicationDialogProps } from "./application-dialog";

// Its own module, so a page counts only the dialogs it opens. Render it closed too: that starts the idle load.
const loader = lazyComponent(() => import("./application-dialog").then((m) => m.ApplicationDialog));

export function LazyApplicationDialog(props: ApplicationDialogProps) {
  return <Lazy loader={loader} wanted={useOpenedOnce(props.target !== null)} props={props} />;
}
