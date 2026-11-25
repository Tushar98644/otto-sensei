import type { Metadata } from "next";
import { TrashPage } from "@/components/dashboard/trash/trash-page";

export const metadata: Metadata = { title: "Recently deleted" };

export default function Page() {
  return <TrashPage />;
}
