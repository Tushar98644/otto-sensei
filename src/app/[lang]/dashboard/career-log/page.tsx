import { CareerLogPage } from "@/components/career-log/career-log-page";
import { pageTitle } from "../page-title";

export const generateMetadata = () => pageTitle("careerLog");

export default function Page() {
  return <CareerLogPage />;
}
