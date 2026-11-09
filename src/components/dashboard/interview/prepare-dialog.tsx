"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { errorMessage } from "@/components/account/errors";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api, isApiError } from "@/lib/api/client";
import { APPLICATION_LIMITS, normalizeJobUrl, type Application } from "@/lib/applications/schema";
import { STATUS_NAMES } from "@/lib/applications/status";
import type { PrepSummary } from "@/lib/insights/prep";
import { addApplication } from "../applications/use-applications";
import { findByLink, interviewHref, prepChoices, waitingForPrep } from "./view";

export type PrepareDialogProps = {
  open: boolean;
  applications: readonly Application[];
  packs: readonly PrepSummary[];
  onClose: () => void;
};

// Shown when the job link can't name the company, which an application needs.
type Manual = { company: string; role: string; note: string };

function choiceLabel(application: Application): string {
  const job = [application.company, application.role].filter(Boolean).join(", ");
  return `${job} (${STATUS_NAMES[application.status]})`;
}

// Starts prep for a job: one already in Applications, or a job link, which joins Applications
// marked as an interview. The prep itself is made on that job's own page, with the same form and
// API as from Applications. Mounted per opening, so each one starts blank.
export function PrepareDialog({ open, applications, packs, onClose }: PrepareDialogProps) {
  const router = useRouter();
  const choices = useMemo(() => prepChoices(applications), [applications]);
  // An interview that has no prep yet is almost always the one wanted.
  const [picked, setPicked] = useState(
    () => waitingForPrep(applications, packs)[0]?.id ?? choices[0]?.id ?? "",
  );
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [manual, setManual] = useState<Manual | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const chosen = choices.find((application) => application.id === picked) ?? choices[0];

  function go(applicationId: string) {
    router.push(interviewHref(applicationId));
    onClose();
  }

  // The company and title from the post, or null with the reason when the person has to type them.
  async function readJob(url: string): Promise<{ company: string; role: string; url: string } | Manual> {
    setReading(true);
    try {
      const { posting } = await api.readJob({ url });
      const company = posting.company.trim();
      const role = posting.title.trim();
      if (company) return { company, role, url: normalizeJobUrl(posting.url) || url };
      return { company: "", role, note: "The post doesn't name the company. Type it in to go on." };
    } catch (error) {
      const why = isApiError(error, "network_error")
        ? OTTO.errors.offline
        : "Otto couldn't read that link just now.";
      // The prep page asks for the post as a paste if the link still can't be read there.
      return { company: "", role: "", note: `${why} Type the company to go on.` };
    } finally {
      setReading(false);
    }
  }

  async function fromLink(raw: string) {
    if (busy) return;
    const value = raw.trim();
    const url = normalizeJobUrl(value);
    if (!url) {
      setLinkError(
        value
          ? "That doesn't look like a link. Copy it from your browser's address bar."
          : "Paste the link to the job post first.",
      );
      linkRef.current?.focus();
      return;
    }
    const known = findByLink(applications, url);
    if (known) {
      go(known.id);
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      let job: { company: string; role: string; url: string };
      if (manual) {
        if (!manual.company.trim()) {
          setCompanyError("Type the company's name.");
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

  function submitChoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (chosen) go(chosen.id);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Prepare for an interview"
      illustration={<OttoNote size="sm" live={false} message={OTTO.interview.pick} />}
    >
      <div className="flex flex-col gap-6">
        {chosen ? (
          <form onSubmit={submitChoice} className="flex flex-col gap-3">
            <Field label="From your applications">
              <Select value={chosen.id} onChange={(event) => setPicked(event.target.value)}>
                {choices.map((application) => (
                  <option key={application.id} value={application.id}>
                    {choiceLabel(application)}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" className="self-start" data-autofocus>
              Prepare
              <ArrowRight aria-hidden />
            </Button>
          </form>
        ) : null}

        <form
          onSubmit={submitLink}
          noValidate
          className={chosen ? "flex flex-col gap-3 border-t border-border pt-6" : "flex flex-col gap-3"}
        >
          <Field
            label={chosen ? "Or paste a job link" : "Job link"}
            error={linkError}
            hint={linkError ? null : "Most job sites work, but not LinkedIn or Indeed."}
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
                // A whole link starts at once; a fragment pasted into a half-typed one is left to
                // the browser.
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
                <Field label="Company" error={companyError}>
                  <Input
                    ref={companyRef}
                    value={manual.company}
                    maxLength={APPLICATION_LIMITS.company}
                    autoComplete="off"
                    placeholder="e.g. Shopify"
                    onChange={(event) => {
                      setManual({ ...manual, company: event.target.value });
                      setCompanyError(null);
                    }}
                  />
                </Field>
                <Field label="Job title" optional>
                  <Input
                    value={manual.role}
                    maxLength={APPLICATION_LIMITS.role}
                    autoComplete="off"
                    placeholder="e.g. Product Designer"
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
            Prepare for this job
            <ArrowRight aria-hidden />
          </Button>
        </form>
      </div>
    </Dialog>
  );
}
