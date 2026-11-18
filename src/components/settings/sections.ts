import { ACCOUNT_SECTIONS } from "@/components/setup/links";

export type AccountGroup =
  "profile" | "writingStyle" | "jobSearch" | "notifications" | "plan" | "invite" | "danger";

export type SettingsSection = {
  key: AccountGroup;
  id: string;
  label: string;
  description: string;
};

// The side nav needs room beside the dashboard's sidebar, so there it waits for xl and the section row stays until then.
export const SETTINGS_LAYOUT =
  "flex flex-col gap-4 lg:not-in-data-dashboard:flex-row lg:not-in-data-dashboard:items-start lg:not-in-data-dashboard:gap-8 xl:flex-row xl:items-start xl:gap-8";
export const SETTINGS_CONTENT = "flex min-w-0 flex-1 flex-col gap-12 lg:max-w-3xl";
export const SETTINGS_NAV_WIDTH = "w-52 shrink-0";
export const SIDE_NAV_SHOWN = "lg:not-in-data-dashboard:block xl:block";
export const SECTION_ROW_HIDDEN = "lg:not-in-data-dashboard:hidden xl:hidden";

// Clears the sticky header and the section row: the dashboard's phone bar is taller than the site's, and gone from lg.
export const SECTION_SCROLL =
  "scroll-mt-36 in-data-dashboard:scroll-mt-48 lg:scroll-mt-24 in-data-dashboard:lg:scroll-mt-20 in-data-dashboard:xl:scroll-mt-10";

export function accountSections({ paid }: { paid: boolean }): SettingsSection[] {
  return [
    {
      key: "profile",
      id: "profile",
      label: "Profile",
      description: "The email you sign in with, and your plan.",
    },
    {
      key: "writingStyle",
      id: ACCOUNT_SECTIONS.writingStyle,
      label: "Writing style",
      description: "Tone, length, spelling and sign-off for everything Otto writes for you.",
    },
    {
      key: "jobSearch",
      id: "job-search",
      label: "Job search",
      description:
        "Where you can work and what you're looking for, so Jobs shows the right posts first.",
    },
    {
      key: "notifications",
      id: "notifications",
      label: "Notifications",
      description: "Reminders to follow up on the jobs you apply to.",
    },
    paid
      ? {
          key: "plan",
          id: "plan",
          label: "Plan and billing",
          description: "What you've used so far, and your subscription.",
        }
      : {
          key: "plan",
          id: "plan",
          label: "Plan",
          description: "What you've used this month, and what a paid plan adds.",
        },
    {
      key: "invite",
      id: "invite",
      label: "Invite friends",
      description: "Share Otto with friends who are job hunting, and you both get extra help.",
    },
    {
      key: "danger",
      id: "delete-account",
      label: "Delete account",
      description: "Deletes your account and everything saved with it. You can't undo it.",
    },
  ];
}

// The section being read: the first at the top of the page, the last once it can't scroll further, else the first crossing the reading band.
export function pickActive(
  ids: readonly string[],
  inBand: ReadonlySet<string>,
  edge: { atTop: boolean; atEnd: boolean },
): string | null {
  if (ids.length === 0) return null;
  if (edge.atTop) return ids[0] ?? null;
  if (edge.atEnd) return ids[ids.length - 1] ?? null;
  return ids.find((id) => inBand.has(id)) ?? null;
}
