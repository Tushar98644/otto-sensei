"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { errorMessage } from "@/components/account/errors";
import { roomForApplication } from "@/components/account/pro-tools";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api, isApiError } from "@/lib/api/client";
import { APPLICATION_LIMITS, normalizeJobUrl, type Application } from "@/lib/applications/schema";
import { copyJobId } from "@/lib/applications/thread";
import type { PrepSummary } from "@/lib/insights/prep";
import { savedJobUrl } from "@/lib/insights/saved-job";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { addApplication } from "../applications/use-applications";
import { findByLink, interviewHref, prepPickerChoices, waitingForPrep } from "./view";

export type PrepareDialogProps = {
  open: boolean;
  applications: readonly Application[];
  resumes: readonly Resume[];
  packs: readonly PrepSummary[];
  onClose: () => void;
};

type Manual = { company: string; role: string; note: string };

export function PrepareDialog({ open, applications, resumes, packs, onClose }: PrepareDialogProps) {
  const { dialog: t } = useMessages("prep");
  const { statuses } = useMessages("applications");
  const app = useMessages("app");
  const router = useRouter();
  const now = useNow();
  const choices = useMemo(
    () => prepPickerChoices(applications, resumes, { dialog: t }, { statuses }),
    [applications, resumes, t, statuses],
  );
  const [picked, setPicked] = useState(() => {
    const waiting = waitingForPrep(applications, packs, now)[0];
    return waiting ? `application:${waiting.id}` : (choices[0]?.value ?? "");
  });
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [manual, setManual] = useState<Manual | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const chosen = choices.find((choice) => choice.value === picked) ?? choices[0];

  function go(applicationId: string) {
    router.push(interviewHref(applicationId, { start: true }));
    onClose();
  }

  async function readJob(
    url: string,
  ): Promise<{ company: string; role: string; url: string } | Manual> {
    setReading(true);
    try {
      const { posting } = await api.readJob({ url });
      const company = posting.company.trim();
      const role = posting.title.trim();
      if (company) return { company, role, url: normalizeJobUrl(posting.url) || url };
      return { company: "", role, note: t.noCompany };
    } catch (error) {
      const why = isApiError(error, "network_error") ? app.errors.offline : t.cantRead;
      return { company: "", role: "", note: fmt(t.typeCompany, { why }) };
    } finally {
      setReading(false);
    }
  }

  async function fromLink(raw: string) {
    if (busy) return;
    const value = raw.trim();
    const url = normalizeJobUrl(value);
    if (!url) {
      setLinkError(value ? t.notLink : t.noLink);
      linkRef.current?.focus();
      return;
    }
    const known = findByLink(applications, url);
    if (known) {
      go(known.id);
      return;
    }
    if (!(await roomForApplication(applications.length))) return;
    setBusy(true);
    setFailure(null);
    try {
      let job: { company: string; role: string; url: string };
      if (manual) {
        if (!manual.company.trim()) {
          setCompanyError(t.companyName);
          companyRef.current?.focus();
          return;
        }
        job = { company: manual.company.trim(), role: manual.role.trim(), url };
      } else {
        const read = await readJob(url);
        if ("note" in read) {
          setManual(read);
          return;
        }
        job = read;
      }
      const application = await addApplication({
        company: job.company,
        role: job.role,
        jobUrl: job.url,
        appliedAt: Date.now(),
        status: "interview",
      });
      go(application.id);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function submitLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void fromLink(link);
  }

  async function submitChoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosen || busy) return;
    if (chosen.kind === "application") {
      go(chosen.application.id);
      return;
    }
    if (!(await roomForApplication(applications.length))) return;
    const { copy } = chosen;
    setBusy(true);
    setFailure(null);
    try {
      const application = await addApplication({
        resumeId: copy.id,
        resumeTitle: resumeTitle(copy).slice(0, 200),
        jobId: copyJobId(copy),
        company: copy.tailor?.company.trim().slice(0, 200) ?? "",
        role: copy.tailor?.jobTitle.trim().slice(0, 200) ?? "",
        jobUrl: normalizeJobUrl(savedJobUrl(copy)) ?? "",
        appliedAt: Date.now(),
        status: "interview",
      });
      go(application.id);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t.title}
      illustration={<OttoNote size="sm" live={false} message={t.pick} />}
    >
      <div className="flex flex-col gap-6">
        {chosen ? (
          <form onSubmit={(event) => void submitChoice(event)} className="flex flex-col gap-3">
            <Field label={t.from} hint={chosen.kind === "copy" ? t.joins : undefined}>
              <Select value={chosen.value} onChange={(event) => setPicked(event.target.value)}>
                {choices.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              type="submit"
              className="self-start"
              loading={busy && chosen.kind === "copy"}
              data-autofocus
            >
              {t.prepare}
              <ArrowRight aria-hidden />
            </Button>
          </form>
        ) : null}

        <form
          onSubmit={submitLink}
          noValidate
          className={
            chosen ? "flex flex-col gap-3 border-t border-border pt-6" : "flex flex-col gap-3"
          }
        >
          <Field
            label={chosen ? t.orLink : t.link}
            error={linkError}
            hint={linkError ? null : t.linkHint}
          >
            <Input
              ref={linkRef}
              type="url"
              inputMode="url"
              value={link}
              autoComplete="off"
              spellCheck={false}
              placeholder="https://"
              enterKeyHint="go"
              maxLength={APPLICATION_LIMITS.jobUrl}
              onChange={(event) => {
                setLink(event.target.value);
                setLinkError(null);
              }}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData("text").trim();
                if (!pasted || busy || event.currentTarget.value.trim() !== "" || manual) return;
                event.preventDefault();
                setLink(pasted);
                setLinkError(null);
                void fromLink(pasted);
              }}
            />
          </Field>
          {reading ? <OttoWorking task="job" size="sm" /> : null}
          {manual ? (
            <>
              <Alert role="note">{manual.note}</Alert>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.company} error={companyError}>
                  <Input
                    ref={companyRef}
                    value={manual.company}
                    maxLength={APPLICATION_LIMITS.company}
                    autoComplete="off"
                    placeholder={t.companyPlaceholder}
                    onChange={(event) => {
                      setManual({ ...manual, company: event.target.value });
                      setCompanyError(null);
                    }}
                  />
                </Field>
                <Field label={t.role} optional>
                  <Input
                    value={manual.role}
                    maxLength={APPLICATION_LIMITS.role}
                    autoComplete="off"
                    placeholder={t.rolePlaceholder}
                    onChange={(event) => setManual({ ...manual, role: event.target.value })}
                  />
                </Field>
              </div>
            </>
          ) : null}
          {failure ? <Alert variant="error">{failure}</Alert> : null}
          <Button
            type="submit"
            variant={chosen ? "secondary" : "primary"}
            loading={busy}
            className="self-start"
          >
            {t.prepareJob}
            <ArrowRight aria-hidden />
          </Button>
        </form>
      </div>
    </Dialog>
  );
}
