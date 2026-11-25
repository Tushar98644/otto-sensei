import { ACCOUNT_SECTIONS } from "@/components/setup/links";

export const ACCOUNT_TABS = [{ id: "plan" }, { id: "preferences" }, { id: "profile" }] as const;

export type AccountTab = (typeof ACCOUNT_TABS)[number]["id"];

export const DEFAULT_TAB: AccountTab = "plan";

// Every anchor the page has had, so old links, emails and bookmarks still open the right tab.
export const TAB_ANCHORS: Record<AccountTab, readonly string[]> = {
  plan: ["plan", "usage", "payment-method", "billing-history"],
  preferences: [
    ACCOUNT_SECTIONS.writingStyle,
    "job-search",
    ACCOUNT_SECTIONS.work,
    ACCOUNT_SECTIONS.lookingFor,
    "notifications",
    ACCOUNT_SECTIONS.reminders,
    ACCOUNT_SECTIONS.careerLog,
  ],
  profile: ["profile", "invite", "your-data", "delete-account"],
};

export function isAccountTab(value: unknown): value is AccountTab {
  return ACCOUNT_TABS.some((tab) => tab.id === value);
}

export function anchorOf(hash: string): string {
  try {
    return decodeURIComponent(hash.replace(/^#/, ""));
  } catch {
    return "";
  }
}

export function tabForAnchor(anchor: string): AccountTab | null {
  if (!anchor) return null;
  return ACCOUNT_TABS.find((tab) => TAB_ANCHORS[tab.id].includes(anchor))?.id ?? null;
}

// An anchor names a spot inside one tab, so it wins over ?tab=.
export function tabFromLocation(search: string, hash: string): AccountTab {
  const fromAnchor = tabForAnchor(anchorOf(hash));
  if (fromAnchor) return fromAnchor;
  const asked = new URLSearchParams(search).get("tab");
  return isAccountTab(asked) ? asked : DEFAULT_TAB;
}

// The default tab keeps the plain address; the anchor goes, since it belonged to the tab left behind.
export function tabUrl(href: string, tab: AccountTab): string {
  const url = new URL(href);
  if (tab === DEFAULT_TAB) url.searchParams.delete("tab");
  else url.searchParams.set("tab", tab);
  return `${url.pathname}${url.search}`;
}
