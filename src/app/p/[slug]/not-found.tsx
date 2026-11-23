import type { Metadata } from "next";
import { ShareUnavailable } from "@/components/share/share-unavailable";
import { NotFoundFonts } from "@/components/site/not-found-fonts";

export const metadata: Metadata = { title: { absolute: "Page not found" } };

export default function PortfolioNotFound() {
  return (
    <>
      <NotFoundFonts />
      <ShareUnavailable reason="missing" />
    </>
  );
}
