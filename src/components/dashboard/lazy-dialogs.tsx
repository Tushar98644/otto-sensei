"use client";

import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import type { ApplicationDialogProps } from "./applications/application-dialog";
import type { PrepareDialogProps } from "./interview/prepare-dialog";
import type { OutreachDialogProps } from "./jobs/outreach-dialog";
import type { WriteDialogProps } from "./letters/write-dialog";

const applicationDialog = lazyComponent(() =>
  import("./applications/application-dialog").then((m) => m.ApplicationDialog),
);
const prepareDialog = lazyComponent(() =>
  import("./interview/prepare-dialog").then((m) => m.PrepareDialog),
);
const writeDialog = lazyComponent(() =>
  import("./letters/write-dialog").then((m) => m.WriteDialog),
);

const outreachDialog = lazyComponent(() =>
  import("./jobs/outreach-dialog").then((m) => m.OutreachDialog),
);

// Render these closed before the first opening too: that is what starts the idle load.

export function LazyApplicationDialog(props: ApplicationDialogProps) {
  return (
    <Lazy loader={applicationDialog} wanted={useOpenedOnce(props.target !== null)} props={props} />
  );
}

export function LazyPrepareDialog(props: PrepareDialogProps) {
  return <Lazy loader={prepareDialog} wanted={useOpenedOnce(props.open)} props={props} />;
}

export function LazyWriteDialog(props: WriteDialogProps) {
  return <Lazy loader={writeDialog} wanted={useOpenedOnce(props.open)} props={props} />;
}

export function LazyOutreachDialog(props: OutreachDialogProps) {
  return <Lazy loader={outreachDialog} wanted={useOpenedOnce(props.job !== null)} props={props} />;
}
