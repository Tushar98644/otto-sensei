import type { Metadata } from "next";
import { ShareUnavailable } from "@/components/share/share-unavailable";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getMessages("share");
  return { title: { absolute: meta.notFound } };
}

export default function ShareNotFound() {
  return <ShareUnavailable reason="missing" />;
}
