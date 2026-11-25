import type { Metadata } from "next";
import { InterviewPrepPage } from "@/components/dashboard/applications/prep/interview-prep-page";
import { PREP_START_PARAM } from "@/components/dashboard/interview/view";
import { ROUTES } from "@/components/site/routes";

export const metadata: Metadata = { title: "Interview prep" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const autoStart = query[PREP_START_PARAM] === "1";
  return (
    <InterviewPrepPage
      applicationId={id}
      back={{ href: ROUTES.dashboardInterview, label: "Interview prep" }}
      autoStart={autoStart}
    />
  );
}
