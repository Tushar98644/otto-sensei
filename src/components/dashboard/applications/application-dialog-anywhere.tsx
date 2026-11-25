"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { MessagesProvider, useLocale, useProvidedMessages } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { ApplicationDialog, type ApplicationDialogProps } from "./application-dialog";

type Words = Messages["applications"];

const LOAD: Record<Locale, () => Promise<{ default: unknown }>> = {
  en: () => import("@/i18n/messages/en/applications"),
  es: () => import("@/i18n/messages/es/applications"),
  "pt-BR": () => import("@/i18n/messages/pt-BR/applications"),
  fr: () => import("@/i18n/messages/fr/applications"),
  de: () => import("@/i18n/messages/de/applications"),
};

export async function applicationsWords(locale: Locale): Promise<Words> {
  return (await LOAD[locale]()).default as Words;
}

// Pages that don't send the applications namespace (the studio) get it with the dialog, only when it opens.
export function ApplicationDialogAnywhere(props: ApplicationDialogProps) {
  const provided = useProvidedMessages("applications");
  const locale = useLocale();
  const [words, setWords] = useState<Words | null>(null);

  useEffect(() => {
    if (provided) return;
    let live = true;
    void applicationsWords(locale).then((loaded) => {
      if (live) setWords(loaded);
    });
    return () => {
      live = false;
    };
  }, [provided, locale]);

  if (provided) return <ApplicationDialog {...props} />;
  if (!words) return null;
  return (
    <MessagesProvider locale={locale} messages={{ applications: words }}>
      <ApplicationDialog {...props} />
    </MessagesProvider>
  );
}
