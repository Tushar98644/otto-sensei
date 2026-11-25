"use client";

import Link from "next/link";
import { useMessages } from "@/i18n/client";
import { rich } from "@/i18n/rich";
import { CAREER_LOG_ROUTE } from "@/lib/career-log/links";

// Beside Cancel plan: a reminder, never a step in the way.
export function KeepLogLine() {
  const t = useMessages("account").careerLog;
  return (
    <p className="max-w-prose text-sm/6 text-pretty text-muted">
      {rich(t.keep, {
        link: (chunk) => (
          <Link href={CAREER_LOG_ROUTE} className="font-medium text-ink underline">
            {chunk}
          </Link>
        ),
      })}
    </p>
  );
}
