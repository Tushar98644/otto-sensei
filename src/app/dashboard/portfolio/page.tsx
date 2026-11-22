import type { Metadata } from "next";
import { PortfolioPage } from "@/components/portfolio/portfolio-page";

export const metadata: Metadata = { title: "Portfolio" };

// ?resume= is read in the browser, so the page needs no server trip of its own to open.
export default function DashboardPortfolioPage() {
  return <PortfolioPage />;
}
