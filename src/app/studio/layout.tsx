import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

// The studio is a private workspace; search engines should index the landing page instead.
export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

// Same value as --color-surface-muted: the studio is a stone canvas with white sheets on it.
export const viewport: Viewport = { themeColor: "#eef3ef" };

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
