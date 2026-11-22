import Link from "next/link";
import { CAREER_LOG_ROUTE } from "@/lib/career-log/links";

// Beside Cancel plan: a reminder, never a step in the way.
export function KeepLogLine() {
  return (
    <p className="max-w-prose text-sm/6 text-pretty text-muted">
      Thinking of cancelling?{" "}
      <Link href={CAREER_LOG_ROUTE} className="font-medium text-ink underline">
        Keep your career log free
      </Link>
      : it stays on every plan, monthly check-ins included.
    </p>
  );
}
