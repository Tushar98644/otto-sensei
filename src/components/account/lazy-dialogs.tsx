"use client";

import type { ComponentType } from "react";
import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import { MessagesProvider, useProvidedMessages } from "@/i18n/client";
import type { AddCreditDialogProps } from "./add-credit-dialog";
import type { SignInDialogProps } from "./sign-in-dialog";
import type { UpgradeDialogProps } from "./upgrade-dialog";

// Pages without a provider (marketing) open the dialogs in English, their words downloading with them.
function inEnglish<P extends object>(importer: () => Promise<ComponentType<P>>) {
  return lazyComponent(async () => {
    const [Dialog, { ENGLISH_CHROME }] = await Promise.all([
      importer(),
      import("./english-chrome"),
    ]);
    return function InEnglish(props: P) {
      return (
        <MessagesProvider locale="en" messages={ENGLISH_CHROME}>
          <Dialog {...props} />
        </MessagesProvider>
      );
    };
  });
}

const upgradeImporter = () => import("./upgrade-dialog").then((m) => m.UpgradeDialog);
const signInImporter = () => import("./sign-in-dialog").then((m) => m.SignInDialog);
const addCreditImporter = () => import("./add-credit-dialog").then((m) => m.AddCreditDialog);

const upgradeDialog = {
  provided: lazyComponent(upgradeImporter),
  english: inEnglish(upgradeImporter),
};
const signInDialog = {
  provided: lazyComponent(signInImporter),
  english: inEnglish(signInImporter),
};
const addCreditDialog = {
  provided: lazyComponent(addCreditImporter),
  english: inEnglish(addCreditImporter),
};

function useLoader<T>(loaders: { provided: T; english: T }): T {
  return useProvidedMessages("upgrade") ? loaders.provided : loaders.english;
}

export function LazyUpgradeDialog(props: UpgradeDialogProps) {
  return (
    <Lazy loader={useLoader(upgradeDialog)} wanted={useOpenedOnce(props.open)} props={props} />
  );
}

export function LazySignInDialog(props: SignInDialogProps) {
  return <Lazy loader={useLoader(signInDialog)} wanted={useOpenedOnce(props.open)} props={props} />;
}

export function LazyAddCreditDialog(props: AddCreditDialogProps) {
  return (
    <Lazy loader={useLoader(addCreditDialog)} wanted={useOpenedOnce(props.open)} props={props} />
  );
}
