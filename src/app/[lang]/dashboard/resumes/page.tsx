import type { Metadata } from "next";
import { ResumesPage } from "@/components/dashboard/resumes-page";

export const metadata: Metadata = { title: "Resumes" };

export default function Page() {
  return <ResumesPage />;
}
