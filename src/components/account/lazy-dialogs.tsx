"use client";

import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import type { SignInDialogProps } from "./sign-in-dialog";
import type { UpgradeDialogProps } from "./upgrade-dialog";

// The upgrade and sign-in dialogs, out of every page's first load: most visits open neither.
// Once opened they stay mounted, so they can animate closed and hand focus back.

const upgradeDialog = lazyComponent(() => import("./upgrade-dialog").then((m) => m.UpgradeDialog));
const signInDialog = lazyComponent(() => import("./sign-in-dialog").then((m) => m.SignInDialog));

export function LazyUpgradeDialog(props: UpgradeDialogProps) {
  return <Lazy loader={upgradeDialog} wanted={useOpenedOnce(props.open)} props={props} />;
}

export function LazySignInDialog(props: SignInDialogProps) {
  return <Lazy loader={signInDialog} wanted={useOpenedOnce(props.open)} props={props} />;
}
