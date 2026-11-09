import type { Metadata } from "next";
import { ShareUnavailable } from "@/components/share/share-unavailable";

// Next adds noindex to 404 responses on its own. An unpublished page, a changed address past its
// redirect and a mistyped one all look the same.
export const metadata: Metadata = { title: { absolute: "Page not found" } };

export default function PortfolioNotFound() {
  return <ShareUnavailable reason="missing" />;
}
