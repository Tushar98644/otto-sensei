"use client";

import {
  ChevronDown,
  FileArchive,
  FileBraces,
  FilePlus2,
  FileText,
  FileUp,
  Plus,
  WandSparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { buttonClasses, type ButtonSize } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { useMessages } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { StudioActions } from "./use-studio-actions";

export type NewResumeMenuProps = {
  actions: StudioActions;
  size?: ButtonSize;
  align?: "start" | "end";
  className?: string;
  trigger?: ReactNode;
  triggerClassName?: string;
};

export function NewResumeMenu({
  actions,
  size = "md",
  align = "start",
  className,
  trigger,
  triggerClassName,
}: NewResumeMenuProps) {
  const { newResume: t } = useMessages("dashboard");
  const draftsNeedPro = useProTools() === false;
  return (
    <Menu
      label={t.label}
      align={align}
      triggerClassName={
        triggerClassName ?? buttonClasses({ size, className: cn("pr-3", className) })
      }
      trigger={
        trigger ?? (
          <>
            <Plus aria-hidden />
            <span className="flex-1 text-left">{t.label}</span>
            <ChevronDown aria-hidden className="text-white/70" />
          </>
        )
      }
      className="w-80"
      items={[
        {
          label: t.uploadLabel,
          description: t.uploadDetail,
          icon: FileUp,
          onSelect: actions.upload,
        },
        {
          label: t.guidedLabel,
          description: t.guidedDetail,
          icon: WandSparkles,
          pro: draftsNeedPro,
          onSelect: actions.guided,
        },
        {
          label: t.linkedinLabel,
          description: t.linkedinDetail,
          icon: FileArchive,
          onSelect: actions.linkedin,
        },
        {
          label: t.jsonLabel,
          description: t.jsonDetail,
          icon: FileBraces,
          onSelect: actions.jsonResume,
        },
        "separator",
        {
          label: t.scratchLabel,
          description: t.scratchDetail,
          icon: FilePlus2,
          onSelect: actions.scratch,
        },
        {
          label: t.sampleLabel,
          description: t.sampleDetail,
          icon: FileText,
          onSelect: actions.sample,
        },
      ]}
    />
  );
}
