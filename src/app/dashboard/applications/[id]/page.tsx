import type { Metadata } from "next";
import { ApplicationHub } from "@/components/dashboard/applications/hub/application-hub";

export const metadata: Metadata = { title: "Application" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplicationHub applicationId={id} />;
}
