import { InterviewHome } from "@/components/dashboard/interview/interview-home";
import { pageTitle } from "../page-title";

export const generateMetadata = () => pageTitle("interview");

export default function Page() {
  return <InterviewHome />;
}
