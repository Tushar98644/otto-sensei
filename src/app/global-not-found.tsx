import type { Metadata } from "next";
import { NotFoundFonts } from "@/components/site/not-found-fonts";
import { NotFoundPage } from "@/components/site/not-found-page";
import { RootDocument, ROOT_VIEWPORT, rootMetadata } from "@/components/site/root-document";
import { fullTitle } from "@/components/site/page-metadata";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";
import "./globals.css";

export const viewport = ROOT_VIEWPORT;

export const metadata: Metadata = {
  ...rootMetadata(DEFAULT_LOCALE),
  title: { absolute: fullTitle({ title: "Page not found" }) },
};

// Any URL no route matches; a [lang] root layout can't hold it, so it brings its own static document, in English: it can't know the URL's language without turning dynamic.
export default async function GlobalNotFound() {
  const common = await loadMessages(DEFAULT_LOCALE, "common");
  return (
    <RootDocument lang={DEFAULT_LOCALE} skipLabel={common.skipToContent}>
      {await NotFoundPage({ locale: DEFAULT_LOCALE, fonts: <NotFoundFonts /> })}
    </RootDocument>
  );
}
