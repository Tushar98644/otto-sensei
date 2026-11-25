import type { Metadata } from "next";
import { ShareUnavailable } from "@/components/share/share-unavailable";

export const metadata: Metadata = { title: { absolute: "Link not found" } };

export default function ShareNotFound() {
  return <ShareUnavailable reason="missing" />;
}
