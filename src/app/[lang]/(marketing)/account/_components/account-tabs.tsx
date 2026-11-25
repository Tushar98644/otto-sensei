"use client";

import type { ReactNode } from "react";
import type { Me } from "@/components/account/use-me";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { useMessages } from "@/i18n/client";
import type { SessionUser } from "@/lib/auth/types";
import { ACCOUNT_TABS, isAccountTab } from "./account-tab-state";
import { PlanTab } from "./plan-tab";
import { PreferencesTab } from "./preferences-tab";
import { ProfileTab } from "./profile-tab";
import { useAccountTab } from "./use-account-tab";

export function AccountTabs({
  me,
  user,
  notice,
}: {
  me: Me;
  user: SessionUser;
  notice?: ReactNode;
}) {
  const words = useMessages("account").tabs;
  const [tab, select] = useAccountTab();
  return (
    <Tabs
      value={tab}
      onValueChange={(next) => {
        if (isAccountTab(next)) select(next);
      }}
      className="max-w-4xl gap-6"
    >
      <TabList
        aria-label={words.label}
        className="w-full self-stretch bg-surface-strong sm:w-auto sm:self-start"
      >
        {ACCOUNT_TABS.map((item) => (
          <Tab key={item.id} value={item.id} className="flex-1 px-3 sm:flex-none sm:px-4">
            {words[item.id]}
          </Tab>
        ))}
      </TabList>
      {notice}
      <TabPanel value="plan">
        <PlanTab me={me} user={user} />
      </TabPanel>
      <TabPanel value="preferences">
        <PreferencesTab />
      </TabPanel>
      <TabPanel value="profile">
        <ProfileTab me={me} user={user} />
      </TabPanel>
    </Tabs>
  );
}
