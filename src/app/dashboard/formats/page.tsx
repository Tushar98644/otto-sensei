import type { Metadata } from "next";
import { FormatsGallery } from "@/components/formats/formats-gallery";

export const metadata: Metadata = { title: "Formats" };

export default function FormatsPage() {
  return <FormatsGallery />;
}
