import { ROUTES } from "@/components/site/routes";

// The Account page's setting sections, by the id each card carries, so every setup link lands on
// its exact setting. #reminders is also in the reminder emails' footer.
export const ACCOUNT_SECTIONS = {
  work: "work-profile",
  lookingFor: "looking-for",
  reminders: "reminders",
} as const;

export type AccountSection = keyof typeof ACCOUNT_SECTIONS;

export function accountSectionHref(section: AccountSection): string {
  return `${ROUTES.dashboardAccount}#${ACCOUNT_SECTIONS[section]}`;
}
