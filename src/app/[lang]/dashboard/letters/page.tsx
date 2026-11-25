import { LettersPage } from "@/components/dashboard/letters/letters-page";
import { pageTitle } from "../page-title";

export const generateMetadata = () => pageTitle("letters");

export default function Page() {
  return <LettersPage />;
}
