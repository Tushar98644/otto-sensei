"use client";

import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import type { AddCreditDialogProps } from "./add-credit-dialog";
import type { SignInDialogProps } from "./sign-in-dialog";
import type { UpgradeDialogProps } from "./upgrade-dialog";

const upgradeDialog = lazyComponent(() => import("./upgrade-dialog").then((m) => m.UpgradeDialog));
const signInDialog = lazyComponent(() => import("./sign-in-dialog").then((m) => m.SignInDialog));
const addCreditDialog = lazyComponent(() =>
  import("./add-credit-dialog").then((m) => m.AddCreditDialog),
);

export function LazyUpgradeDialog(props: UpgradeDialogProps) {
  return <Lazy loader={upgradeDialog} wanted={useOpenedOnce(props.open)} props={props} />;
}

export function LazySignInDialog(props: SignInDialogProps) {
  return <Lazy loader={signInDialog} wanted={useOpenedOnce(props.open)} props={props} />;
}

export function LazyAddCreditDialog(props: AddCreditDialogProps) {
  return <Lazy loader={addCreditDialog} wanted={useOpenedOnce(props.open)} props={props} />;
}
