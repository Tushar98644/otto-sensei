import type { Metadata } from "next";
import { ApplicationHub } from "@/components/dashboard/applications/hub/application-hub";

export const metadata: Metadata = { title: "Application" };

// One application with everything linked to it. Other screens link here: the board and the list,
// the Jobs tab, resume cards, the studio, Cover letters and Interview prep.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplicationHub applicationId={id} />;
}
