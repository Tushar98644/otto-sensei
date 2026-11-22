import type { Metadata } from "next";
import { ApplicationHub } from "@/components/dashboard/applications/hub/application-hub";
import { WRITE_PARAM, WRITE_THANK_YOU } from "@/lib/notifications/links";

export const metadata: Metadata = { title: "Application" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <ApplicationHub applicationId={id} thankYou={query[WRITE_PARAM] === WRITE_THANK_YOU} />;
}
