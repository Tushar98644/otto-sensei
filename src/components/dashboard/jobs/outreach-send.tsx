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
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-describedby={describedBy}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
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
  const headingId = useId();
  const fillInId = useId();
  const emails = useMemo(() => postEmails(postText), [postText]);
  const name = searchName(company) || "the company";
  const to = emails[0] ?? "";
  const draft = { to, subject: message.subject, body: message.email };
  const mailto = mailtoLink(draft);
  const fillIn = placeholderIn(message.subject, message.email);
  const describedBy = fillIn ? fillInId : undefined;

  const searches: Search[] = [
    {
      Icon: Users,
      label: `Search LinkedIn for people at ${name}`,
      hint: "Look for someone on the team you'd join. Works when you're signed in to LinkedIn.",
      href: linkedInPeopleUrl(company, title),
    },
    {
      Icon: UserSearch,
      label: `Search Google for managers and recruiters at ${name}`,
      hint: "Public LinkedIn profiles of managers, team leads, recruiters and founders.",
      href: hiringPeopleUrl(company, title),
    },
    {
      Icon: Building,
      label: `Search Google for ${name}'s team page`,
      hint: "Small companies often list their founders and team on their own site.",
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
          Where to send it
        </h3>
        <p className="text-sm/6 text-pretty text-muted">
          Write to one person, not several at the same company. No reply in about a week? Follow up
          once.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className={SUBHEADING}>Find the person</h4>
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
        <p className="text-sm text-pretty text-subtle">
          These open in a new tab. Otto doesn&apos;t look anyone up. What you type into your
          message, like their name, is saved with it.
        </p>

        {emails.length ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-surface-muted p-4">
            <p className={SUBHEADING}>
              {emails.length === 1
                ? "This address is in the job post"
                : "These addresses are in the job post"}
            </p>
            <ul className="flex flex-col gap-1">
              {emails.map((email) => (
                <li key={email} className="flex items-center gap-1">
                  <span className="min-w-0 text-sm break-all text-ink">{email}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Copy ${email}`}
                    onClick={() => void copyText(email, "address")}
                  >
                    <Copy aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
            <p className="text-sm text-pretty text-muted">
              {emails.length === 1 ? "It" : "They"} may reach a recruiting team rather than the
              hiring manager.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <h4 className={SUBHEADING}>Send the email</h4>
        {fillIn ? (
          <p id={fillInId} className="flex items-start gap-1.5 text-sm/6 text-pretty text-warn-ink">
            <TriangleExclamationPoint aria-hidden className="mt-1 size-4 shrink-0 text-warn" />
            <span>
              Your email still says {fillIn}. Swap in their name, or write “Hi there” if it&apos;s
              going to a team inbox.
            </span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <NewTab href={gmailUrl(draft)} className={SEND_BUTTON} describedBy={describedBy}>
            <Mail aria-hidden />
            Open in Gmail
          </NewTab>
          <NewTab href={outlookUrl(draft)} className={SEND_BUTTON} describedBy={describedBy}>
            <Mail aria-hidden />
            Open in Outlook
          </NewTab>
          <a href={mailto.href} className={SEND_BUTTON} aria-describedby={describedBy}>
            <Mail aria-hidden />
            Open in your email app
          </a>
        </div>
        <p className="text-sm text-pretty text-muted">
          {to
            ? `The To line has ${to}, from the job post. Swap in the person's own address if you find it.`
            : "Add the person's address in the To line."}{" "}
          Your subject and email go in as they are now.
          {mailto.clipped
            ? " “Open in your email app” starts this email but cuts it short, since mail links have a length limit. Replace it there with the whole email from Copy email."
            : null}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className={SUBHEADING}>Or send the LinkedIn note</h4>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm/6 text-pretty text-ink">
          <li>Copy the note.</li>
          <li>Open their LinkedIn profile.</li>
          <li>Press Connect, then Add a note. If Connect isn&apos;t there, look under More.</li>
          <li>Paste the note and send it.</li>
        </ol>
      </div>
    </section>
  );
}
