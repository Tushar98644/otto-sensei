import { PortfolioPage } from "@/components/portfolio/portfolio-page";
import { pageTitle } from "../page-title";

export const generateMetadata = () => pageTitle("portfolio");

// ?resume= is read in the browser, so the page needs no server trip of its own to open.
export default function DashboardPortfolioPage() {
  return <PortfolioPage />;
}
