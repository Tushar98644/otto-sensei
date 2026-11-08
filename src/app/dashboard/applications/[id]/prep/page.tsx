import type { Metadata } from "next";
import { InterviewPrepPage } from "@/components/dashboard/applications/prep/interview-prep-page";

export const metadata: Metadata = { title: "Interview prep" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InterviewPrepPage applicationId={id} />;
}
