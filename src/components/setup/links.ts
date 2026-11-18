import { ROUTES } from "@/components/site/routes";

// #reminders is also linked from the reminder emails' footer.
export const ACCOUNT_SECTIONS = {
  writingStyle: "writing-style",
  work: "work-profile",
  lookingFor: "looking-for",
  reminders: "reminders",
} as const;

export type AccountSection = keyof typeof ACCOUNT_SECTIONS;

export function accountSectionHref(section: AccountSection): string {
  return `${ROUTES.dashboardAccount}#${ACCOUNT_SECTIONS[section]}`;
}
