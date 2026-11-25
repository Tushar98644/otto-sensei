import { CheckinPage } from "@/components/career-log/checkin-page";
import { MONTH_PARAM } from "@/lib/career-log/links";
import { isMonth } from "@/lib/career-log/month";
import { pageTitle } from "../../page-title";

export const generateMetadata = () => pageTitle("checkIn");

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: Props) {
  const month = (await searchParams)[MONTH_PARAM];
  return <CheckinPage month={isMonth(month) ? month : null} />;
}
