"use client";

import { ArrowRight, Braces, FileText, Link2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { errorMessage } from "@/components/account/errors";
import { useProTools } from "@/components/account/pro-tools";
import { upgradeLink } from "@/components/account/upgrade-interval";
import { refreshMe, useMe } from "@/components/account/use-me";
import { StoryArt } from "@/components/dashboard/interview/interview-art";
import { forgetPrepPacks } from "@/components/dashboard/interview/use-prep-packs";
import { PREP_START_PARAM } from "@/components/dashboard/interview/view";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { ROUTES } from "@/components/site/routes";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Field } from "@/components/ui/field";
import { FolderCard } from "@/components/ui/folder-card";
import { Select } from "@/components/ui/select";
import { VoiceTextarea } from "@/components/ui/voice-field";
import { nextPlan, PLANS, TEXT_LIMITS } from "@/config/plans";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api, isApiError } from "@/lib/api/client";
import type { InterviewPrep, PrepTarget } from "@/lib/insights/prep";
import {
  AUTO_FOCUS,
  PREP_LEVELS,
  previewFocus,
  ROLE_FOCUSES,
  type FocusChoice,
} from "@/lib/insights/prep-focus";
import { prepJobSource, prepResume } from "@/lib/insights/prep-view";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import type { PrepMessages } from "../../i18n";
import { prepAllowance, startsByItself, titleOnlyPost } from "./prep-start";

const MIN_POST_CHARS = 80;
const QUIET_LINK =
  "font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink";
const TAB_HEADING = "font-sans text-xs/4 font-medium";

export type PrepMade = { prep: InterviewPrep; saved: boolean; fromTitle: boolean };

type PrepFormProps = {
  target: PrepTarget;
  resumes: readonly Resume[];
  onDone: (made: PrepMade) => void;
  onCancel?: () => void;
  // The link carried ?start=1; without it the form waits, filled in, for one click.
  autoStart?: boolean;
  // Opened from "Paste the post" after a pack made from the job title alone.
  startPasting?: boolean;
};

type Run = { id: number; phase: "reading" | "writing" };
type JobText = { text: string; fromTitle: boolean };

// Leaving mid-run and coming back mounts a new form while the first run may still count, so each job starts by itself once.
const startedByItself = new Set<string>();

function dropStartParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PREP_START_PARAM)) return;
  url.searchParams.delete(PREP_START_PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function pickedLabel(guess: string | null, { form }: PrepMessages): string {
  return guess ? fmt(form.picked, { guess }) : form.pickedPlain;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 pt-px">
        <p className="text-xs/4 font-medium text-subtle">{label}</p>
        <div className="mt-0.5 text-sm/6 text-pretty text-ink">{children}</div>
      </div>
    </li>
  );
}

export function PrepForm({
  target,
  resumes,
  onDone,
  onCancel,
  autoStart = false,
  startPasting = false,
}: PrepFormProps) {
  const words = useMessages("prep");
  const t = words.form;
  const app = useMessages("app");
  const format = useFormat();
  const fallback = useMemo(() => prepResume(target, resumes), [target, resumes]);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const resume = resumes.find((item) => item.id === resumeId) ?? fallback;
  const source = useMemo(() => prepJobSource(target, resume), [target, resume]);
  const [pasting, setPasting] = useState(startPasting);
  const [picking, setPicking] = useState(false);
  const { me, user } = useMe();
  const pro = useProTools();
  const upgradeTo = nextPlan(user?.plan ?? "free");
  const [pasted, setPasted] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const [tried, setTried] = useState(false);
  const [stoppedLate, setStoppedLate] = useState(false);
  const [error, setError] = useState<{ message: string; upgrade: boolean } | null>(null);
  const [linkNote, setLinkNote] = useState("");
  const [focus, setFocus] = useState<FocusChoice>(AUTO_FOCUS);
  const [tuning, setTuning] = useState(false);
  const runs = useRef(0);

  const busy = run !== null;
  const needsPaste = pasting || source.kind === "paste";
  const titlePost = titleOnlyPost(target);
  // With nothing pasted yet, the job title is enough to start; a paste makes the questions sharper.
  const fromTitle = needsPaste && pasted.trim() === "" && titlePost !== null;
  const pastedTooShort = needsPaste && !fromTitle && pasted.trim().length < MIN_POST_CHARS;
  const usage = me?.usage?.letter;
  const allowance = prepAllowance(usage, me?.period, app, format);
  const facts = {
    asked: autoStart,
    usage,
    resumes: resumes.length,
    jobKnown: !needsPaste,
  };
  const firstVisit = !tried && !onCancel && !startedByItself.has(target.id);
  const auto = firstVisit && startsByItself({ ...facts, pro });
  // While the plan loads, prep that would start by itself waits here instead of flashing the form.
  const deciding = firstVisit && pro === null && startsByItself({ ...facts, pro: true });

  // A link that won't open falls back to the job title, so one click still ends in a pack.
  async function jobText(live: () => boolean): Promise<JobText | null> {
    if (needsPaste)
      return fromTitle && titlePost
        ? { text: titlePost, fromTitle: true }
        : { text: pasted.trim(), fromTitle: false };
    if (source.kind === "saved") return { text: source.text, fromTitle: false };
    try {
      return { text: (await api.readJob({ url: source.url })).posting.text, fromTitle: false };
    } catch (caught) {
      if (titlePost) return { text: titlePost, fromTitle: true };
      if (live()) {
        setPasting(true);
        setLinkNote(fmt(t.linkFailed, { error: errorMessage(caught) }));
      }
      return null;
    }
  }

  async function make() {
    if (!resume || run || pastedTooShort) return;
    runs.current += 1;
    const id = runs.current;
    const live = () => runs.current === id;
    let sent = false;
    setTried(true);
    setStoppedLate(false);
    setError(null);
    setRun({ id, phase: needsPaste || source.kind === "saved" ? "writing" : "reading" });
    try {
      const job = await jobText(live);
      if (job === null || !live()) return;
      setRun({ id, phase: "writing" });
      sent = true;
      const { result } = await api.interview({
        applicationId: target.id,
        resume,
        job: { text: job.text, title: target.role, company: target.company },
        focus,
      });
      forgetPrepPacks(target.id, result.saved);
      if (live()) onDone({ prep: result.prep, saved: result.saved, fromTitle: job.fromTitle });
    } catch (caught) {
      if (!live()) return;
      setError({
        message: errorMessage(caught),
        upgrade: isApiError(caught, "limit_reached") || isApiError(caught, "upgrade_required"),
      });
    } finally {
      if (sent) void refreshMe();
      if (live()) setRun(null);
    }
  }

  // Changing the resume or the job mid-run stops waiting for it; the server may still count it.
  function change(next: "resume" | "paste") {
    setTried(true);
    if (run) {
      if (run.phase === "writing") setStoppedLate(true);
      runs.current += 1;
      setRun(null);
    }
    if (next === "resume") setPicking(true);
    else setPasting(true);
  }

  const startByItself = useEffectEvent(() => {
    dropStartParam();
    startedByItself.add(target.id);
    void make();
  });
  useEffect(() => {
    if (!auto) return;
    const timer = window.setTimeout(startByItself, 0);
    return () => window.clearTimeout(timer);
  }, [auto]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void make();
  }

  if (!resume) {
    return (
      <OttoNote message={t.needResume}>
        <Link href={ROUTES.studio} className="text-sm font-medium text-ink underline">
          {t.addResume}
        </Link>
      </OttoNote>
    );
  }

  const resumeFact = (
    <Fact icon={FileText} label={t.storiesFrom}>
      <span className="font-medium">{resumeTitle(resume)}</span>
      {resume.id === target.resumeId ? <span className="text-muted">{t.versionSent}</span> : null}
      {resumes.length > 1 && !picking ? (
        <>
          {" · "}
          <button type="button" className={QUIET_LINK} onClick={() => change("resume")}>
            {t.anotherResume}
          </button>
        </>
      ) : null}
    </Fact>
  );

  const knownPost =
    source.kind === "saved" ? source.text : needsPaste && !fromTitle ? pasted : null;
  const preview = previewFocus(target.role, knownPost);
  const shownFocus =
    focus.role === "auto" ? preview.focus : focus.role === "none" ? null : focus.role;
  const shownLevel = focus.level === "auto" ? preview.level : focus.level;
  const focusFact = (
    <Fact icon={Braces} label={t.technical}>
      {shownFocus === "post" ? (
        t.fromPost
      ) : shownFocus ? (
        <>
          <span className="font-medium">{words.focus[shownFocus].label}</span>
          {shownLevel === "post" ? (
            <span className="text-muted">{t.levelFromPost}</span>
          ) : (
            <span className="text-muted"> · {words.levels[shownLevel]}</span>
          )}
        </>
      ) : (
        <span className="text-muted">{t.noneForRole}</span>
      )}
      {!tuning ? (
        <>
          {" · "}
          <button type="button" className={QUIET_LINK} onClick={() => setTuning(true)}>
            {shownFocus === null ? t.addOne : t.change}
          </button>
        </>
      ) : null}
    </Fact>
  );

  const host = source.kind === "link" ? hostOf(source.url) : "";
  const jobFact = needsPaste ? null : (
    <Fact icon={Link2} label={t.jobPost}>
      {source.kind === "saved" ? (
        t.savedWithCopy
      ) : (
        <>
          {t.readFromLink}
          {host ? <span className="text-muted">{fmt(t.onHost, { host })}</span> : null}
          {titlePost ? <span className="text-muted">{t.orTitle}</span> : null}
        </>
      )}
      {" · "}
      <button type="button" className={QUIET_LINK} onClick={() => change("paste")}>
        {t.pasteInstead}
      </button>
    </Fact>
  );

  if (auto || deciding || busy) {
    return (
      <FolderCard
        tab={<h2 className={TAB_HEADING}>{t.working}</h2>}
        tone="lavender"
        bodyClassName="flex flex-col gap-6 p-5 sm:p-8"
      >
        <OttoWorking
          task={run?.phase === "reading" ? "job" : "interview"}
          delayMs={deciding ? undefined : 0}
        />
        <ul className="flex flex-col gap-3 border-t border-border pt-5">
          {resumeFact}
          {jobFact}
          {focusFact}
        </ul>
        {allowance ? <p className="text-xs/5 text-subtle">{allowance}</p> : null}
      </FolderCard>
    );
  }

  return (
    <form onSubmit={submit}>
      <FolderCard
        tab={<h2 className={TAB_HEADING}>{t.ready}</h2>}
        tone="lavender"
        bodyClassName="p-2"
      >
        <div className="group/art group/otto grid gap-2 motion-safe:animate-fade-in sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:grid-cols-[17rem_minmax(0,1fr)]">
          <StoryArt className="h-40 sm:h-full sm:min-h-64" />
          <div className="flex min-w-0 flex-col gap-5 px-2 pt-3 pb-2 sm:px-4 sm:py-5 lg:px-6">
            <div className="flex flex-col gap-2">
              <Eyebrow>{t.eyebrow}</Eyebrow>
              <p className="font-display text-2xl/8 font-normal tracking-tight text-pretty text-ink sm:text-3xl/9">
                {t.pitch}
              </p>
            </div>
            {stoppedLate ? <Alert role="note">{t.stoppedLate}</Alert> : null}
            <ul className="flex flex-col gap-3">
              {picking && resumes.length > 1 ? (
                <li>
                  <Field
                    label={t.resumeLabel}
                    hint={resume.id === target.resumeId ? t.resumeHint : undefined}
                  >
                    <Select value={resume.id} onChange={(event) => setResumeId(event.target.value)}>
                      {resumes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {resumeTitle(item)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </li>
              ) : (
                resumeFact
              )}
              {jobFact}
              {tuning ? (
                <li className="grid gap-3 sm:grid-cols-2">
                  <Field label={t.technical} hint={t.technicalHint}>
                    <Select
                      value={focus.role}
                      onChange={(event) =>
                        setFocus((current) => ({
                          ...current,
                          role: event.target.value as FocusChoice["role"],
                        }))
                      }
                    >
                      <option value="auto">
                        {pickedLabel(
                          preview.focus === "post" || preview.focus === null
                            ? null
                            : words.focus[preview.focus].label,
                          words,
                        )}
                      </option>
                      {ROLE_FOCUSES.map((role) => (
                        <option key={role} value={role}>
                          {words.focus[role].label}
                        </option>
                      ))}
                      <option value="none">{t.noTechnical}</option>
                    </Select>
                  </Field>
                  {focus.role !== "none" ? (
                    <Field label={t.level} hint={t.levelHint}>
                      <Select
                        value={focus.level}
                        onChange={(event) =>
                          setFocus((current) => ({
                            ...current,
                            level: event.target.value as FocusChoice["level"],
                          }))
                        }
                      >
                        <option value="auto">
                          {pickedLabel(
                            preview.level === "post" ? null : words.levels[preview.level],
                            words,
                          )}
                        </option>
                        {PREP_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {words.levels[level]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ) : null}
                </li>
              ) : (
                focusFact
              )}
            </ul>

            {needsPaste ? (
              <Field
                label={t.post}
                hint={linkNote || (titlePost ? t.postHintTitle : t.postHint)}
                error={pasted.trim() !== "" && pastedTooShort ? t.tooShort : undefined}
              >
                <VoiceTextarea
                  value={pasted}
                  onChange={(event) => setPasted(event.target.value)}
                  onDictate={setPasted}
                  rows={6}
                  maxLength={TEXT_LIMITS.jobPostChars}
                  placeholder={t.postPlaceholder}
                />
              </Field>
            ) : null}

            {error ? (
              <Alert variant="error">
                {error.message}{" "}
                {error.upgrade && upgradeTo ? (
                  <Link href={upgradeLink(me, upgradeTo)} className="font-medium underline">
                    {fmt(t.upgrade, { plan: PLANS[upgradeTo].name })}
                  </Link>
                ) : null}
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={pastedTooShort} className="max-sm:flex-1">
                  {fromTitle ? t.fromTitle : t.make}
                  <ArrowRight aria-hidden />
                </Button>
                {onCancel ? (
                  <Button type="button" variant="ghost" onClick={onCancel}>
                    {t.keepCurrent}
                  </Button>
                ) : null}
              </div>
              {allowance ? <p className="text-xs/5 text-subtle">{allowance}</p> : null}
            </div>
          </div>
        </div>
      </FolderCard>
    </form>
  );
}
