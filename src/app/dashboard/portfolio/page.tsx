import type { Metadata } from "next";
import { PortfolioPage } from "@/components/portfolio/portfolio-page";

export const metadata: Metadata = { title: "Portfolio" };

type Props = { searchParams: Promise<{ resume?: string | string[] }> };

export default async function DashboardPortfolioPage({ searchParams }: Props) {
  const { resume } = await searchParams;
  const fromResumeId = typeof resume === "string" && resume.length <= 64 ? resume : null;
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
          Portfolio
        </h1>
        <p className="mt-3 max-w-prose text-base/7 text-pretty text-muted">
          Your resume as a personal web page, with your projects up front. Six templates, all free
          on every plan.
        </p>
      </header>
      <PortfolioPage fromResumeId={fromResumeId} />
    </div>
  );
}
