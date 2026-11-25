import { ResumesPage } from "@/components/dashboard/resumes-page";
import { pageTitle } from "../page-title";

export const generateMetadata = () => pageTitle("resumes");

export default function Page() {
  return <ResumesPage />;
}
