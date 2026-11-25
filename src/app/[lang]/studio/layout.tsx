import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteFonts } from "@/components/site/site-fonts";
import { getMessages, MessagesFor } from "@/i18n/server";
import { STUDIO_NAMESPACES } from "./namespaces";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages("studio");
  return { title: t.meta.title, robots: { index: false, follow: false } };
}

export const viewport: Viewport = { themeColor: "#eef3ef" };

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteFonts />
      <MessagesFor namespaces={STUDIO_NAMESPACES}>{children}</MessagesFor>
    </>
  );
}
