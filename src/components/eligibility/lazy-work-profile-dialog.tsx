"use client";

import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import type { WorkProfileDialogProps } from "./work-profile-dialog";

const workProfileDialog = lazyComponent(() =>
  import("./work-profile-dialog").then((m) => m.WorkProfileDialog),
);

export function LazyWorkProfileDialog(props: WorkProfileDialogProps) {
  return <Lazy loader={workProfileDialog} wanted={useOpenedOnce(props.open)} props={props} />;
}
