import type { Metadata } from "next";
import { ShareUnavailable } from "@/components/share/share-unavailable";

// Next adds noindex to 404 responses on its own.
export const metadata: Metadata = { title: { absolute: "Link not found" } };

export default function ShareNotFound() {
  return <ShareUnavailable reason="missing" />;
}
