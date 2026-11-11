import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#eef3ef" };

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
