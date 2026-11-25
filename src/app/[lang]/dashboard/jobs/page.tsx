import { JobsPage } from "@/components/dashboard/jobs/jobs-page";
import { pageTitle } from "../page-title";

export const generateMetadata = () => pageTitle("jobs");

export default function Page() {
  return <JobsPage />;
}
