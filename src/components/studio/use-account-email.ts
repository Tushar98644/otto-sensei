"use client";

import { useEffect } from "react";
import { useMe } from "@/components/account/use-me";
import { useStudioStore } from "@/lib/store/resume-store";

// A person's own resume with no email gets their sign-in email, as an undoable edit. Once per
// resume and browser, so an email deleted on purpose never comes back. Samples are left alone.

const STORAGE_KEY = "otto-email-filled-v1";
const MAX_REMEMBERED = 200;

function remembered(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function remember(id: string) {
  try {
    const list = [...remembered().filter((item) => item !== id), id].slice(-MAX_REMEMBERED);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage blocked: at worst the email is offered again on another visit.
  }
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
