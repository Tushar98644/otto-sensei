"use client";

import { CareerLogSettingsCard } from "@/components/career-log/career-log-settings-card";
import { WorkProfileCard } from "@/components/eligibility/work-profile-card";
import { ReminderSettingsCard } from "@/components/notifications/reminder-settings-card";
import { SettingsGroup } from "@/components/settings/settings-group";
import { WritingStyleCard } from "@/components/settings/writing-style-card";
import { LookingForSettingsCard } from "@/components/setup/looking-for-settings-card";
import { ACCOUNT_SECTIONS } from "@/components/setup/links";
import { useMessages } from "@/i18n/client";

export function PreferencesTab() {
  const words = useMessages("account").preferences;
  return (
    <div className="flex flex-col gap-10">
      <SettingsGroup
        id={ACCOUNT_SECTIONS.writingStyle}
        title={words.writingStyle}
        description={words.writingStyleIntro}
      >
        <WritingStyleCard />
      </SettingsGroup>
      <SettingsGroup id="job-search" title={words.jobSearch} description={words.jobSearchIntro}>
        <WorkProfileCard />
        <LookingForSettingsCard />
      </SettingsGroup>
      <SettingsGroup id="notifications" title={words.reminders} description={words.remindersIntro}>
        <ReminderSettingsCard />
        <CareerLogSettingsCard />
      </SettingsGroup>
    </div>
  );
}
