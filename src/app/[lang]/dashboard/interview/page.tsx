import { InterviewHome } from "@/components/dashboard/interview/interview-home";
import { MessagesFor } from "@/i18n/server";
import { PAGE_NAMESPACES } from "../namespaces";
import { pageTitle } from "../page-title";

export const generateMetadata = () => pageTitle("interview");

export default function Page() {
  return (
    <MessagesFor namespaces={PAGE_NAMESPACES.interview}>
      <InterviewHome />
    </MessagesFor>
  );
}
