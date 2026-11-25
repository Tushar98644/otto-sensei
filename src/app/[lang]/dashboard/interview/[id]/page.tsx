import { InterviewPrepPage } from "@/components/dashboard/applications/prep/interview-prep-page";
import { PREP_START_PARAM } from "@/components/dashboard/interview/view";
import { ROUTES } from "@/components/site/routes";
import { getMessages, MessagesFor } from "@/i18n/server";
import { PAGE_NAMESPACES } from "../../namespaces";
import { pageTitle } from "../../page-title";

export const generateMetadata = () => pageTitle("interview");

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, query, { meta }] = await Promise.all([
    params,
    searchParams,
    getMessages("dashboard"),
  ]);
  const autoStart = query[PREP_START_PARAM] === "1";
  return (
    <MessagesFor namespaces={PAGE_NAMESPACES.interview}>
      <InterviewPrepPage
        applicationId={id}
        back={{ href: ROUTES.dashboardInterview, label: meta.interview }}
        autoStart={autoStart}
      />
    </MessagesFor>
  );
}
