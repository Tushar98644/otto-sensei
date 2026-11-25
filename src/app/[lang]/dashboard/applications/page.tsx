import { ApplicationsPage } from "@/components/dashboard/applications/applications-page";
import { MessagesFor } from "@/i18n/server";
import { PAGE_NAMESPACES } from "../namespaces";
import { pageTitle } from "../page-title";

export const generateMetadata = () => pageTitle("applications");

export default function Page() {
  return (
    <MessagesFor namespaces={PAGE_NAMESPACES.applications}>
      <ApplicationsPage />
    </MessagesFor>
  );
}
