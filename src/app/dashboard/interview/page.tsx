import type { Metadata } from "next";
import { InterviewHome } from "@/components/dashboard/interview/interview-home";

export const metadata: Metadata = { title: "Interview prep" };

export default function Page() {
  return <InterviewHome />;
}
