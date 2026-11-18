import type { Metadata } from "next";
import { LettersPage } from "@/components/dashboard/letters/letters-page";

export const metadata: Metadata = { title: "Letters and messages" };

export default function Page() {
  return <LettersPage />;
}
