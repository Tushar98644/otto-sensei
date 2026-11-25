import { InterviewPrepPage } from "@/components/dashboard/applications/prep/interview-prep-page";
import { PREP_START_PARAM } from "@/components/dashboard/interview/view";
import { applicationHref } from "@/lib/applications/thread";
import { getMessages } from "@/i18n/server";
import { pageTitle } from "../../../page-title";

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
    <InterviewPrepPage
      applicationId={id}
      back={{ href: applicationHref(id), label: meta.application }}
      autoStart={autoStart}
    />
  );
}
