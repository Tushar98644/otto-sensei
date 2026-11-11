import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { APP_NAV } from "@/components/dashboard/nav";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { ROUTES } from "@/components/site/routes";
import { Badge } from "@/components/ui/badge";
import { Section, SectionHeader } from "./section";

type Feature = { text: string; section?: string };

// One line per section of the app, in the sidebar's order, so the landing page lists exactly what
// a signed-in person sees. Each line must stay true of its page; a section further down this page
// gets a link to it.
const FEATURES: Record<string, Feature> = {
  [ROUTES.dashboardResumes]: {
    text: "Every resume and tailored copy in one place. Check, fix and download each one.",
    section: "#how",
  },
  [ROUTES.dashboardLetters]: {
    text: "Cover letters and answers to application questions, written only from your resume and the job post.",
  },
  [ROUTES.dashboardJobs]: {
    text: "Open jobs from company boards, ranked by how closely each one matches your resume.",
    section: "#jobs",
  },
  [ROUTES.dashboardApplications]: {
    text: "Every job you apply to on one board, with the resume you sent and reminders to follow up.",
  },
  [ROUTES.dashboardInterview]: {
    text: "For each interview: likely questions, stories from your own resume lines, and questions to ask.",
  },
  [PORTFOLIO_ROUTE]: {
    text: "A portfolio site made from your resume, hosted for you at your own link.",
    section: "#portfolio",
  },
  [ROUTES.dashboardFormats]: {
    text: "Six clean formats that hiring software reads. Classic and Compact are free.",
    section: "#how-download",
  },
};

const SHOWN = APP_NAV.filter((item) => FEATURES[item.href]);

export function FeaturesOverview() {
  return (
    <Section id="features" labelledBy="features-title">
      <SectionHeader
        id="features-title"
        eyebrow="What's inside"
        title="Your whole job hunt, in one place"
      >
        One account for your resume, the jobs, and every application after it.
      </SectionHeader>
      <ul role="list" className="mt-12 grid gap-3 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
        {SHOWN.map((item) => {
          const { text, section } = FEATURES[item.href]!;
          return (
            <li key={item.href} className="flex flex-col gap-2 rounded-2xl bg-surface-muted p-5">
              <div className="flex items-center gap-2">
                <item.icon className="size-4 text-muted" aria-hidden />
                <h3 className="text-base/6 font-medium text-ink">{item.label}</h3>
                {item.pro ? (
                  <Badge variant="ink" className="h-5 px-1.5">
                    Pro
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm/6 text-pretty text-muted">{text}</p>
              {section ? (
                <Link
                  href={section}
                  className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
                >
                  See how
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
