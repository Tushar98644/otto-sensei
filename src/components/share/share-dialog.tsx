"use client";

import { Link2 } from "lucide-react";
import { useId, useRef, useState, type RefObject } from "react";
import { unlockProTool } from "@/components/account/pro-tools";
import { useMe } from "@/components/account/use-me";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api, isApiError } from "@/lib/api/client";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import type { SharedLink } from "@/lib/share/types";
import { cn } from "@/lib/utils";
import { absolute, copyWhenReady, turnOffWithUndo } from "./share-actions";
import { isBehind, viewFacts } from "./share-facts";
import { DEFAULT_SHARE_OPTIONS, ShareOptions, type ShareOptionValues } from "./share-options";
import { dropShare, putShare, useShares } from "./share-store";
import { CopyLinkButton, OpenShareLink, useShareLinksWords, useShareUrl } from "./copy-link";

type ShareDialogProps = {
  resume: Resume;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Busy = "save" | "options" | null;

function messageOf(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

function focusSoon(ref: RefObject<HTMLElement | null>) {
  requestAnimationFrame(() => ref.current?.focus());
}

export function ShareDialog({ resume, open, onOpenChange }: ShareDialogProps) {
  const { user } = useMe();
  const words = useShareLinksWords();
  const t = words.dialog;
  const share = useMessages("share");
  const shares = useShares(open);
  const { status, error: loadError } = shares;
  const link = shares.links.find((item) => item.resumeId === resume.id) ?? null;
  const [draft, setDraft] = useState<ShareOptionValues>(DEFAULT_SHARE_OPTIONS);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const linkInput = useRef<HTMLInputElement>(null);
  const makeButton = useRef<HTMLButtonElement>(null);
  const title = resumeTitle(resume);
  const userId = user?.id ?? null;

  // "No link yet" may be wrong until links load, and making one would replace a shared version.
  const checking = link === null && userId !== null && (status === "idle" || status === "loading");
  const options = link
    ? { showContact: link.showContact, allowIndexing: link.allowIndexing }
    : draft;

  function close() {
    onOpenChange(false);
    setError(null);
    setNotice("");
  }

  async function save() {
    if (!(await unlockProTool("share"))) {
      close();
      return;
    }
    setBusy("save");
    setError(null);
    setNotice("");
    try {
      const request = api.share({ resume, ...options });
      const copied = await copyWhenReady(request.then(({ link: made }) => absolute(made)));
      const { link: saved, created } = await request;
      putShare(saved);
      setNotice(created ? (copied ? t.madeCopied : t.made) : t.updated);
      focusSoon(linkInput);
    } catch (failure) {
      setError(messageOf(failure, words.actions.fallback));
    } finally {
      setBusy(null);
    }
  }

  async function changeOptions(patch: Partial<ShareOptionValues>) {
    if (!link) {
      setDraft((current) => ({ ...current, ...patch }));
      return;
    }
    setBusy("options");
    setError(null);
    setNotice("");
    putShare({ ...link, ...patch });
    try {
      putShare((await api.updateShare(link.id, patch)).link);
    } catch (failure) {
      if (isApiError(failure, "not_found")) dropShare(link.id);
      else putShare(link);
      setError(messageOf(failure, words.actions.fallback));
    } finally {
      setBusy(null);
    }
  }

  function turnOff(target: SharedLink) {
    close();
    setDraft(DEFAULT_SHARE_OPTIONS);
    turnOffWithUndo(target, words.actions);
  }

  function retryLoad() {
    shares.retry();
  }

  const onDialogChange = (next: boolean) => (next ? onOpenChange(true) : close());

  return (
    <Dialog
      open={open}
      onOpenChange={onDialogChange}
      title={t.title}
      description={fmt(t.description, { title })}
      footer={
        link ? (
          <>
            <Button variant="ghost" onClick={() => turnOff(link)} disabled={busy !== null}>
              {t.turnOff}
            </Button>
            <OpenShareLink slug={link.slug} />
            <CopyLinkButton slug={link.slug} />
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              {t.cancel}
            </Button>
            <Button
              ref={makeButton}
              onClick={save}
              loading={busy === "save"}
              disabled={checking || status === "error"}
            >
              <Link2 aria-hidden />
              {t.make}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-5">
        {link ? (
          <LinkDetails
            link={link}
            resume={resume}
            busy={busy}
            onUpdate={save}
            inputRef={linkInput}
          />
        ) : checking ? (
          <p className="flex items-center gap-2 text-sm/6 text-muted">
            <Spinner />
            {t.checking}
          </p>
        ) : status === "error" ? (
          <Alert
            variant="error"
            title={t.checkFailed}
            action={
              <Button size="sm" variant="secondary" onClick={retryLoad}>
                {t.tryAgain}
              </Button>
            }
          >
            {loadError ?? t.checkConnection}
          </Alert>
        ) : null}
        <ShareOptions
          copy={share.options}
          value={options}
          onChange={changeOptions}
          disabled={busy !== null || checking}
        />
        {error ? <Alert variant="error">{error}</Alert> : null}
        {/* Stays mounted while empty, so screen readers announce the notice. */}
        <p aria-live="polite" className={cn("text-sm/6 text-muted", !notice && "sr-only")}>
          {notice}
        </p>
      </div>
    </Dialog>
  );
}

type LinkDetailsProps = {
  link: SharedLink;
  resume: Resume;
  busy: Busy;
  onUpdate: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
};

function LinkDetails({ link, resume, busy, onUpdate, inputRef }: LinkDetailsProps) {
  const t = useShareLinksWords().dialog;
  const { facts } = useMessages("share");
  const format = useFormat();
  const inputId = useId();
  const factsId = useId();
  const url = useShareUrl(link.slug);
  const now = useNow();
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>{t.link}</Label>
        <Input
          ref={inputRef}
          id={inputId}
          readOnly
          value={url}
          aria-describedby={factsId}
          onFocus={(event) => event.currentTarget.select()}
          className="font-mono"
        />
        <p id={factsId} className="text-sm/5 text-subtle">
          {now > 0 ? viewFacts(link, now, facts, format) : null}
        </p>
      </div>
      {isBehind(link, resume) ? (
        <Alert
          title={t.behindTitle}
          action={
            <Button size="sm" variant="secondary" loading={busy === "save"} onClick={onUpdate}>
              {t.update}
            </Button>
          }
        >
          {t.behind}
        </Alert>
      ) : null}
    </>
  );
}
