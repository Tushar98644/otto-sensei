import type { ReactNode } from "react";
import { SiteFonts } from "@/components/site/site-fonts";
import { MessagesFor } from "@/i18n/server";
import { SHARE_NAMESPACES } from "./namespaces";

export default function ShareLayout({ children }: { children: ReactNode }) {
  return (
    <MessagesFor namespaces={SHARE_NAMESPACES}>
      <SiteFonts />
      {children}
    </MessagesFor>
  );
}
