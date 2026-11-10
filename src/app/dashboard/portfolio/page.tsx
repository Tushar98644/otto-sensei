import type { Metadata } from "next";
import { PortfolioPage } from "@/components/portfolio/portfolio-page";

export const metadata: Metadata = { title: "Portfolio" };

type Props = { searchParams: Promise<{ resume?: string | string[] }> };

export default async function DashboardPortfolioPage({ searchParams }: Props) {
  const { resume } = await searchParams;
  const fromResumeId = typeof resume === "string" && resume.length <= 64 ? resume : null;
  // The title comes from PortfolioPage: the editor puts it in its own top bar.
  return <PortfolioPage fromResumeId={fromResumeId} />;
}
