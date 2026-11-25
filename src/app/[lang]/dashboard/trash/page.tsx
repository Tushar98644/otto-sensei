import { TrashPage } from "@/components/dashboard/trash/trash-page";
import { pageTitle } from "../page-title";

export const generateMetadata = () => pageTitle("trash");

export default function Page() {
  return <TrashPage />;
}
