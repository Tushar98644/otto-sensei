import type { Metadata } from "next";
import { ShareUnavailable } from "@/components/share/share-unavailable";

export const metadata: Metadata = { title: { absolute: "Page not found" } };

export default function PortfolioNotFound() {
  return <ShareUnavailable reason="missing" />;
}
