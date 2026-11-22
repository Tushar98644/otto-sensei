import type { Metadata } from "next";
import { CareerLogPage } from "@/components/career-log/career-log-page";

export const metadata: Metadata = { title: "Career log" };

export default function Page() {
  return <CareerLogPage />;
}
