import type { Metadata } from "next";
import { InterviewPrepPage } from "@/components/dashboard/applications/prep/interview-prep-page";
import { applicationHref } from "@/lib/applications/thread";

export const metadata: Metadata = { title: "Interview prep" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InterviewPrepPage applicationId={id} back={{ href: applicationHref(id), label: "Application" }} />;
}
