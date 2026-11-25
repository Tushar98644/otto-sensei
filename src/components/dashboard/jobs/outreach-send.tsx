"use client";

import {
  ArrowUpRight,
  Building,
  Copy,
  Mail,
  TriangleExclamationPoint,
  UserSearch,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useId, useMemo, type ReactNode } from "react";
import { copyText } from "@/components/ui/copy-text";
import type { OutreachDraft } from "@/components/studio/tailor/use-writing";
import { Button, buttonClasses } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import {
  gmailUrl,
  hiringPeopleUrl,
  linkedInPeopleUrl,
  mailtoLink,
  outlookUrl,
  placeholderIn,
  postEmails,
  searchName,
  teamPageUrl,
} from "./outreach-links";

const SUBHEADING = "text-sm font-medium text-ink";
const SEND_BUTTON = buttonClasses({ variant: "secondary", size: "sm" });

function NewTab({
  href,
  className,
  describedBy,
  children,
}: {
  href: string;
  className: string;
  describedBy?: string;
  children: ReactNode;
}) {
  const { send } = useMessages("jobs");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-describedby={describedBy}
    >
      {children}
      <span className="sr-only">{send.newTab}</span>
    </a>
  );
}

type Search = { Icon: LucideIcon; label: string; hint: string; href: string };

export type OutreachSendProps = {
  company: string;
  title: string;
  postText: string;
  message: Pick<OutreachDraft, "subject" | "email">;
};

export function OutreachSend({ company, title, postText, message }: OutreachSendProps) {
  const { send: t } = useMessages("jobs");
  const headingId = useId();
  const fillInId = useId();
  const emails = useMemo(() => postEmails(postText), [postText]);
  const name = searchName(company) || t.theCompany;
  const to = emails[0] ?? "";
  const draft = { to, subject: message.subject, body: message.email };
  const mailto = mailtoLink(draft);
  const fillIn = placeholderIn(message.subject, message.email);
  const describedBy = fillIn ? fillInId : undefined;

  const searches: Search[] = [
    {
      Icon: Users,
      label: fmt(t.linkedin, { name }),
      hint: t.linkedinHint,
      href: linkedInPeopleUrl(company, title),
    },
    {
      Icon: UserSearch,
      label: fmt(t.google, { name }),
      hint: t.googleHint,
      href: hiringPeopleUrl(company, title),
    },
    {
      Icon: Building,
      label: fmt(t.teamPage, { name }),
      hint: t.teamPageHint,
      href: teamPageUrl(company),
    },
  ];

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-5 border-t border-border pt-6"
    >
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="text-base/6 font-semibold text-ink">
          {t.where}
        </h3>
        <p className="text-sm/6 text-pretty text-muted">{t.whereIntro}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className={SUBHEADING}>{t.findPerson}</h4>
        <ul className="flex flex-col gap-3">
          {searches.map(({ Icon, label, hint, href }) => (
            <li key={label} className="flex items-start gap-3">
              <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <NewTab
                  href={href}
                  className="self-start rounded-sm text-sm/6 font-medium text-pretty text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
                >
                  {label}
                  <ArrowUpRight aria-hidden className="ml-0.5 inline size-3.5 align-baseline" />
                </NewTab>
                <p className="text-sm text-pretty text-muted">{hint}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-sm text-pretty text-subtle">{t.newTabNote}</p>

        {emails.length ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-surface-muted p-4">
            <p className={SUBHEADING}>{emails.length === 1 ? t.addressOne : t.addressMany}</p>
            <ul className="flex flex-col gap-1">
              {emails.map((email) => (
                <li key={email} className="flex items-center gap-1">
                  <span className="min-w-0 text-sm break-all text-ink">{email}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={fmt(t.copyAddress, { email })}
                    onClick={() => void copyText(email, "address")}
                  >
                    <Copy aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
            <p className="text-sm text-pretty text-muted">
              {emails.length === 1 ? t.reachOne : t.reachMany}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <h4 className={SUBHEADING}>{t.sendEmail}</h4>
        {fillIn ? (
          <p id={fillInId} className="flex items-start gap-1.5 text-sm/6 text-pretty text-warn-ink">
            <TriangleExclamationPoint aria-hidden className="mt-1 size-4 shrink-0 text-warn" />
            <span>{fmt(t.fillIn, { fillIn })}</span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <NewTab href={gmailUrl(draft)} className={SEND_BUTTON} describedBy={describedBy}>
            <Mail aria-hidden />
            {t.gmail}
          </NewTab>
          <NewTab href={outlookUrl(draft)} className={SEND_BUTTON} describedBy={describedBy}>
            <Mail aria-hidden />
            {t.outlook}
          </NewTab>
          <a href={mailto.href} className={SEND_BUTTON} aria-describedby={describedBy}>
            <Mail aria-hidden />
            {t.app}
          </a>
        </div>
        <p className="text-sm text-pretty text-muted">
          {to ? fmt(t.toLine, { to }) : t.addTo} {t.asIs}
          {mailto.clipped ? ` ${t.clipped}` : null}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className={SUBHEADING}>{t.linkedinNote}</h4>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm/6 text-pretty text-ink">
          <li>{t.step1}</li>
          <li>{t.step2}</li>
          <li>{t.step3}</li>
          <li>{t.step4}</li>
        </ol>
      </div>
    </section>
  );
}
