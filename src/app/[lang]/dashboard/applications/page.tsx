import { ApplicationsPage } from "@/components/dashboard/applications/applications-page";
import { pageTitle } from "../page-title";

export const generateMetadata = () => pageTitle("applications");

export default function Page() {
  return <ApplicationsPage />;
}
