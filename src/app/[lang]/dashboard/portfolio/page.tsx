import { PortfolioPage } from "@/components/portfolio/portfolio-page";
import { MessagesFor } from "@/i18n/server";
import { pageTitle } from "../page-title";
import { PORTFOLIO_NAMESPACES } from "./namespaces";

export const generateMetadata = () => pageTitle("portfolio");

// ?resume= is read in the browser, so the page needs no server trip of its own to open.
export default function DashboardPortfolioPage() {
  return (
    <MessagesFor namespaces={PORTFOLIO_NAMESPACES}>
      <PortfolioPage />
    </MessagesFor>
  );
}
