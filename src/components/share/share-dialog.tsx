"use client";

import { Link2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { unlockProTool } from "@/components/account/pro-tools";
import { useMe } from "@/components/account/use-me";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, isApiError } from "@/lib/api/client";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import type { SharedLink } from "@/lib/share/types";
import { cn } from "@/lib/utils";
import { absolute, copyWhenReady, turnOffWithUndo } from "./share-actions";
import { isBehind, viewFacts } from "./share-facts";
import { DEFAULT_SHARE_OPTIONS, ShareOptions, type ShareOptionValues } from "./share-options";
import { useShareStore } from "./share-store";
import { CopyLinkButton, OpenShareLink, useShareUrl } from "./copy-link";

type ShareDialogProps = {
  resume: Resume;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Busy = "save" | "options" | null;

function messageOf(error: unknown): string {
  return isApiError(error) ? error.message : "Something went wrong. Please try again.";
}

// The control that had focus can vanish when the view changes (the link appears), which would drop
// focus to the page. Moves it on once React has drawn the new view.
function focusSoon(ref: RefObject<HTMLElement | null>) {
  requestAnimationFrame(() => ref.current?.focus());
}

// One live link per resume (the server keeps it that way): make it, copy it, point it at the
// latest version, choose what it shows, or turn it off (at once, with Undo).
export function ShareDialog({ resume, open, onOpenChange }: ShareDialogProps) {
  const { user } = useMe();
  const status = useShareStore((state) => state.status);
  const loadError = useShareStore((state) => state.error);
  const link = useShareStore(
    (state) => state.links.find((item) => item.resumeId === resume.id) ?? null,
  );
  const put = useShareStore((state) => state.put);
  const drop = useShareStore((state) => state.drop);
  const [draft, setDraft] = useState<ShareOptionValues>(DEFAULT_SHARE_OPTIONS);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const linkInput = useRef<HTMLInputElement>(null);
  const makeButton = useRef<HTMLButtonElement>(null);
  const title = resumeTitle(resume);
  const userId = user?.id ?? null;

  // Loads once per account; later opens reuse the list the Shared links section shares.
  useEffect(() => {
    if (open && userId) void useShareStore.getState().load(userId);
  }, [open, userId]);

  // Until the account's links have loaded, "no link yet" might be wrong, and making one then would
  // quietly replace the version an existing link shows.
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
    // Making or updating a link is Pro; the settings of one made before stay open on Free. The
    // trial prompt takes this dialog's place rather than stacking on it.
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
      put(saved);
      setNotice(
        created
          ? copied
            ? "Link made and copied. Paste it anywhere."
            : "Link made. Copy it and send it to anyone."
          : "Link updated to this version.",
      );
      focusSoon(linkInput);
    } catch (failure) {
      setError(messageOf(failure));
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
    put({ ...link, ...patch });
    try {
      put((await api.updateShare(link.id, patch)).link);
    } catch (failure) {
      if (isApiError(failure, "not_found")) drop(link.id);
      else put(link);
      setError(messageOf(failure));
    } finally {
      setBusy(null);
    }
  }

  function turnOff(target: SharedLink) {
    close();
    setDraft(DEFAULT_SHARE_OPTIONS);
    turnOffWithUndo(target);
  }

  function retryLoad() {
    if (userId) void useShareStore.getState().load(userId, { force: true });
  }

  const onDialogChange = (next: boolean) => (next ? onOpenChange(true) : close());

  return (
    <Dialog
      open={open}
      onOpenChange={onDialogChange}
      title="Share this resume"
      description={`“${title}” as a web page anyone with the link can read, with a PDF download. No account needed to open it.`}
      footer={
        link ? (
          <>
            <Button variant="ghost" onClick={() => turnOff(link)} disabled={busy !== null}>
              Turn off link
            </Button>
            <OpenShareLink slug={link.slug} />
            <CopyLinkButton slug={link.slug} />
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              ref={makeButton}
              onClick={save}
              loading={busy === "save"}
              disabled={checking || status === "error"}
            >
              <Link2 aria-hidden />
              Make link
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
            Checking for a link you already made
          </p>
        ) : status === "error" ? (
          <Alert
            variant="error"
            title="Couldn't check your links"
            action={
              <Button size="sm" variant="secondary" onClick={retryLoad}>
                Try again
              </Button>
            }
          >
            {loadError ?? "Check your connection, then try again."}
          </Alert>
        ) : null}
        <ShareOptions
          value={options}
          onChange={changeOptions}
          disabled={busy !== null || checking}
        />
        {error ? <Alert variant="error">{error}</Alert> : null}
        {/* Stays in the page while empty, so screen readers hear the notice when it arrives. */}
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
  const inputId = useId();
  const factsId = useId();
  const url = useShareUrl(link.slug);
  const now = useNow();
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>Link</Label>
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
          {now > 0 ? viewFacts(link, now) : null}
        </p>
      </div>
      {isBehind(link, resume) ? (
        <Alert
          title="This link shows an older version"
          action={
            <Button size="sm" variant="secondary" loading={busy === "save"} onClick={onUpdate}>
              Update link
            </Button>
          }
        >
          You changed this resume after sharing it. Updating keeps the same link.
        </Alert>
      ) : null}
    </>
  );
}
