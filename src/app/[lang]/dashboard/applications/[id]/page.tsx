import { ApplicationHub } from "@/components/dashboard/applications/hub/application-hub";
import { WRITE_PARAM, WRITE_THANK_YOU } from "@/lib/notifications/links";
import { pageTitle } from "../../page-title";

export const generateMetadata = () => pageTitle("application");

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <ApplicationHub applicationId={id} thankYou={query[WRITE_PARAM] === WRITE_THANK_YOU} />;
}
