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
import { buttonClasses, type ButtonSize } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import type { StudioActions } from "./use-studio-actions";

export type NewResumeMenuProps = {
  actions: StudioActions;
  size?: ButtonSize;
  align?: "start" | "end";
  className?: string;
};

// One primary button, so a page never shows six competing ones.
export function NewResumeMenu({ actions, size = "md", align = "start", className }: NewResumeMenuProps) {
  return (
    <Menu
      label="New resume"
      align={align}
      triggerClassName={buttonClasses({ size, className: cn("pr-3", className) })}
      trigger={
        <>
          <Plus aria-hidden />
          <span className="flex-1 text-left">New resume</span>
          <ChevronDown aria-hidden className="text-white/70" />
        </>
      }
      className="w-80"
      items={[
        {
          label: "Upload a file",
          description: "PDF or Word. See what hiring software reads.",
          icon: FileUp,
          onSelect: actions.upload,
        },
        {
          label: "Build with Otto",
          description: "No resume yet? Answer a few questions for a first draft.",
          icon: WandSparkles,
          onSelect: actions.guided,
        },
        {
          label: "Import from LinkedIn",
          description: "The ZIP from LinkedIn's data export. Stays on your device.",
          icon: FileArchive,
          onSelect: actions.linkedin,
        },
        {
          label: "Import a JSON Resume",
          description: "A resume.json from jsonresume.org or another tool.",
          icon: FileBraces,
          onSelect: actions.jsonResume,
        },
        "separator",
        {
          label: "Start from scratch",
          description: "A blank page with the usual sections.",
          icon: FilePlus2,
          onSelect: actions.scratch,
        },
        {
          label: "Try a sample",
          description: "A filled-in resume to see how Otto works.",
          icon: FileText,
          onSelect: actions.sample,
        },
      ]}
    />
  );
}
