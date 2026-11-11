"use client";

import { useEffect } from "react";
import { useMe } from "@/components/account/use-me";
import { readJsonItem, writeJsonItem } from "@/lib/browser-storage";
import { useStudioStore } from "@/lib/store/resume-store";

const STORAGE_KEY = "otto-email-filled-v1";
const MAX_REMEMBERED = 200;

function remembered(): string[] {
  const list = readJsonItem(STORAGE_KEY);
  return Array.isArray(list) ? list.filter((id): id is string => typeof id === "string") : [];
}

function remember(id: string) {
  const list = [...remembered().filter((item) => item !== id), id].slice(-MAX_REMEMBERED);
  writeJsonItem(STORAGE_KEY, list);
}

export function useAccountEmailPrefill(): void {
  const { user } = useMe();
  const email = user?.email ?? "";
  const activeId = useStudioStore((s) => s.activeId);
  const needsEmail = useStudioStore((s) => {
    const resume = s.activeId ? s.resumes[s.activeId] : undefined;
    return resume !== undefined && resume.source !== "sample" && resume.basics.email.trim() === "";
  });

  useEffect(() => {
    if (!email || !activeId || !needsEmail || remembered().includes(activeId)) return;
    remember(activeId);
    useStudioStore
      .getState()
      .updateResume(
        activeId,
        (resume) => ({ ...resume, basics: { ...resume.basics, email } }),
        { label: "Added your account email" },
      );
  }, [email, activeId, needsEmail]);
}
