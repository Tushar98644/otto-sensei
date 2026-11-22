"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { errorMessage } from "@/components/account/errors";
import { refreshMe } from "@/components/account/use-me";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { ROUTES } from "@/components/site/routes";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { holdLines } from "@/lib/career-log/handoff";
import { STUDIO_LOG_PARAM } from "@/lib/career-log/links";
import { monthLabel } from "@/lib/career-log/month";
import { defaultRange, jobChoices } from "@/lib/career-log/resume-lines";
import { CAREER_LOG_LIMITS, type CareerLogEntry, type Month } from "@/lib/career-log/types";
import { resumeTitle } from "@/lib/resume/ops";
import { useResumeList } from "@/lib/store/resume-store";
import { cn } from "@/lib/utils";

export type LinesDialogProps = {
  open: boolean;
  onClose: () => void;
  // Only months with words in them.
  entries: readonly CareerLogEntry[];
};

type Status =
  | { kind: "picking" }
  | { kind: "writing" }
  | { kind: "empty" }
  | { kind: "failed"; message: string };

export function LinesDialog({ open, onClose, entries }: LinesDialogProps) {
  const router = useRouter();
  const gate = useAccountGate();
  const ids = useId();
  const resumes = useResumeList().filter((resume) => resume.source !== "sample");
  const [resumeId, setResumeId] = useState<string | null>(null);
  const resume = resumes.find((item) => item.id === resumeId) ?? resumes[0] ?? null;
  const jobs = resume ? jobChoices(resume) : [];
  const [jobId, setJobId] = useState<string | null>(null);
  const job = jobs.find((item) => item.id === jobId) ?? jobs[0] ?? null;
  const months = entries.map((entry) => entry.month).sort();
  const start = resume?.experience.find((item) => item.id === job?.id)?.startDate ?? "";
  const fallback = defaultRange(months, start);
  const [range, setRange] = useState<{ from: Month | null; to: Month | null }>({
    from: null,
    to: null,
  });
  const from = range.from ?? fallback?.from ?? null;
  const to = range.to ?? fallback?.to ?? null;
  const inRange = from && to ? months.filter((month) => month >= from && month <= to) : [];
  const [status, setStatus] = useState<Status>({ kind: "picking" });
  const writing = status.kind === "writing";

  function close() {
    if (writing) return;
    setStatus({ kind: "picking" });
    onClose();
  }

  async function write() {
    if (!resume || !from || !to) return;
    const existing = (resume.experience.find((item) => item.id === job?.id)?.bullets ?? [])
      .map((bullet) => bullet.text.trim())
      .filter(Boolean)
      .slice(0, CAREER_LOG_LIMITS.existingLines);
    setStatus({ kind: "writing" });
    try {
      const res = await api.careerLogLines(
        { role: { title: job?.title ?? "", company: job?.company ?? "" }, from, to, existing },
        { id: crypto.randomUUID() },
      );
      void refreshMe();
      if (res.result.lines.length === 0) {
        setStatus({ kind: "empty" });
        return;
      }
      holdLines({
        resumeId: resume.id,
        experienceId: job?.id ?? null,
        role: job?.label ?? "",
        lines: res.result.lines,
      });
      router.push(`${ROUTES.studio}?${STUDIO_LOG_PARAM}=lines`);
    } catch (error) {
      if (gate.handleApiError(error, "draft")) setStatus({ kind: "picking" });
      else setStatus({ kind: "failed", message: errorMessage(error) });
    }
  }

  const message =
    status.kind === "empty"
      ? "I didn't find anything new in those months that your resume doesn't already say."
      : status.kind === "failed"
        ? status.message
        : "Pick the job and the months. I'll only use what you wrote, and leave a blank for any number you didn't give me.";

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? undefined : close())}
        title="Turn my log into resume lines"
        description="Otto writes them; you accept each one in the studio before it goes on your resume."
        size="md"
        footer={
          resume && job ? (
            <>
              <Button variant="ghost" onClick={close} disabled={writing}>
                Cancel
              </Button>
              <Button
                onClick={() => void write()}
                loading={writing}
                disabled={inRange.length === 0}
              >
                Write my lines
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={close}>
              Close
            </Button>
          )
        }
      >
        {writing ? (
          <OttoWorking
            task="draft"
            size="sm"
            message={`Reading ${inRange.length} ${inRange.length === 1 ? "month" : "months"} of your notes.`}
          />
        ) : !resume ? (
          <OttoNote
            live={false}
            message="Lines go into a resume, so make one first. Then come back here."
          >
            <Link
              href={ROUTES.studio}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Make a resume
            </Link>
          </OttoNote>
        ) : (
          <div className="flex flex-col gap-5">
            <OttoNote live size="sm" message={message} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`${ids}-resume`} label="Resume" wide>
                <Select
                  id={`${ids}-resume`}
                  value={resume.id}
                  onChange={(event) => {
                    setResumeId(event.target.value);
                    setJobId(null);
                    setRange({ from: null, to: null });
                  }}
                >
                  {resumes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {resumeTitle(item)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field id={`${ids}-job`} label="Job" wide>
                {job ? (
                  <Select
                    id={`${ids}-job`}
                    value={job.id}
                    onChange={(event) => {
                      setJobId(event.target.value);
                      setRange({ from: null, to: null });
                    }}
                  >
                    {jobs.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <p className="text-sm/6 text-muted">
                    This resume has no jobs yet. Add the job in the studio first.
                  </p>
                )}
              </Field>
              <Field id={`${ids}-from`} label="From">
                <Select
                  id={`${ids}-from`}
                  value={from ?? ""}
                  onChange={(event) => setRange({ from: event.target.value, to })}
                >
                  {months.map((month) => (
                    <option key={month} value={month} disabled={to !== null && month > to}>
                      {monthLabel(month)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field id={`${ids}-to`} label="To">
                <Select
                  id={`${ids}-to`}
                  value={to ?? ""}
                  onChange={(event) => setRange({ from, to: event.target.value })}
                >
                  {months.map((month) => (
                    <option key={month} value={month} disabled={from !== null && month < from}>
                      {monthLabel(month)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <p className="text-sm/6 text-muted">
              {inRange.length} {inRange.length === 1 ? "month" : "months"} of notes in this range.
              Uses 1 Build with Otto draft.
            </p>
          </div>
        )}
      </Dialog>
      {gate.dialogs}
    </>
  );
}

function Field({
  id,
  label,
  wide = false,
  children,
}: {
  id: string;
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", wide && "sm:col-span-2")}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}
