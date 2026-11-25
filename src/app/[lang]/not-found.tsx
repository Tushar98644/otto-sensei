import type { Metadata } from "next";
import { NotFoundFonts } from "@/components/site/not-found-fonts";
import { NotFoundPage } from "@/components/site/not-found-page";
import { loadMessages } from "@/i18n/messages";
import { getLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { notFound } = await loadMessages(await getLocale(), "site");
  return { title: notFound.title };
}

export default async function NotFound() {
  return NotFoundPage({ locale: await getLocale(), fonts: <NotFoundFonts /> });
}
