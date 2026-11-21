import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { APP_NAV } from "@/components/dashboard/nav";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { ROUTES } from "@/components/site/routes";
import { Badge } from "@/components/ui/badge";
import { Panel, Window } from "@/components/ui/panel";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { FEATURE_PREVIEWS, PreloadPortfolioPreview } from "./features-previews";
import { Section, SectionHeader } from "./section";

type Feature = { text: string; section?: string };

const FEATURES: Record<string, Feature> = {
  [ROUTES.dashboardResumes]: {
    text: "Every resume and tailored copy in one place, in six clean formats hiring software reads. Check, fix and download each one.",
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
};

const SHOWN = APP_NAV.filter((item) => FEATURES[item.href]);

export function FeaturesOverview() {
  return (
    <Section id="features" labelledBy="features-title">
      <SectionHeader
        id="features-title"
        eyebrow="What's inside"
        title="Your whole job hunt, in one place"
      />
      <Tabs defaultValue={SHOWN[0]!.href} className="mt-12 sm:mt-16">
        <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-6">
          <TabList
            aria-label="Sections of the app"
            className="lg:w-full lg:flex-col lg:items-stretch lg:self-start lg:bg-transparent lg:p-0"
          >
            {SHOWN.map((item) => (
              <Tab key={item.href} value={item.href} className="lg:h-11 lg:justify-start lg:px-3">
                <item.icon aria-hidden />
                {item.label}
                {item.pro ? (
                  <Badge variant="ink" className="h-5 px-1.5">
                    Pro
                  </Badge>
                ) : null}
              </Tab>
            ))}
          </TabList>
          {SHOWN.map((item) => {
            const { text, section } = FEATURES[item.href]!;
            const Preview = FEATURE_PREVIEWS[item.href]!;
            return (
              <TabPanel key={item.href} value={item.href}>
                <Panel className="flex flex-col gap-5 lg:p-8">
                  <Window title={item.label} bodyClassName="bg-surface-muted/40 p-3 sm:p-5">
                    <Preview />
                  </Window>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <p className="max-w-prose text-base/7 text-pretty text-ink">{text}</p>
                    {section ? (
                      <Link
                        href={section}
                        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
                      >
                        See how
                        <ArrowRight className="size-3.5" aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                </Panel>
              </TabPanel>
            );
          })}
        </div>
      </Tabs>
      <PreloadPortfolioPreview />
    </Section>
  );
}
