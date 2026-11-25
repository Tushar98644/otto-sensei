import type { Metadata } from "next";
import { RootDocument, ROOT_VIEWPORT, rootMetadata } from "@/components/site/root-document";
import { fullTitle } from "@/components/site/page-metadata";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";
import NotFound from "./[lang]/not-found";
import "./globals.css";

export const viewport = ROOT_VIEWPORT;

export const metadata: Metadata = {
  ...rootMetadata(DEFAULT_LOCALE),
  title: { absolute: fullTitle({ title: "Page not found" }) },
};

// Any URL no route matches; a [lang] root layout can't hold it, so it brings its own document (English until 404s are translated).
export default async function GlobalNotFound() {
  const common = await loadMessages(DEFAULT_LOCALE, "common");
  return (
    <RootDocument lang={DEFAULT_LOCALE} skipLabel={common.skipToContent}>
      <NotFound />
    </RootDocument>
  );
}
