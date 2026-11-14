"use client";

import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import type { FeedbackDialogProps } from "./feedback-dialog";

const feedbackDialog = lazyComponent(() =>
  import("./feedback-dialog").then((m) => m.FeedbackDialog),
);

export function LazyFeedbackDialog(props: FeedbackDialogProps) {
  return <Lazy loader={feedbackDialog} wanted={useOpenedOnce(props.open)} props={props} />;
}
