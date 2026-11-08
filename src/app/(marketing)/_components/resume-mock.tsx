import { Mail, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { Window } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
import { DEMO_FILE_NAME, DEMO_PERSON } from "./recruiter-demo-data";

// A designed, two-column resume in HTML so it stays sharp at any size and costs no image request.
// To screen readers it's one image with a description; its words are repeated, scrambled, in the
// "what hiring software reads" window next to it, which is the part worth reading out.
export function ResumeMock({ className }: { className?: string }) {
  const { name, role, email, phone, skills, languages, jobs } = DEMO_PERSON;
  return (
    <Window
      title={DEMO_FILE_NAME}
      role="img"
      aria-label={`Example resume for ${name}, a ${role.toLowerCase()}. Skills and languages sit in a left column, work history in a right column, with small icons next to her email and phone.`}
      className={cn("shadow-float", className)}
    >
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <p className="font-display text-2xl/8 tracking-tight text-ink">{name}</p>
        <p className="text-sm text-muted">{role}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Mail className="size-3.5 text-subtle" />
            {email}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Phone className="size-3.5 text-subtle" />
            {phone}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-5">
        <div className="col-span-2 flex flex-col gap-4 bg-surface-muted px-3 py-4 sm:px-4">
          <MockGroup title="Skills">
            <MockList items={skills} />
          </MockGroup>
          <MockGroup title="Languages">
            <MockList items={languages} />
          </MockGroup>
        </div>
        <div className="col-span-3 px-3 py-4 sm:px-4">
          <MockGroup title="Experience">
            <div className="flex flex-col gap-3">
              {jobs.map((job) => (
                <div key={job.title} className="text-xs">
                  <p className="font-semibold text-ink">{job.title}</p>
                  <p className="text-subtle">
                    {job.company} · {job.dates}
                  </p>
                  <p className="mt-1 flex gap-1.5 text-muted">
                    <span className="text-subtle">•</span>
                    {job.bullet}
                  </p>
                </div>
              ))}
            </div>
          </MockGroup>
        </div>
      </div>
    </Window>
  );
}

function MockGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold tracking-wider text-ink uppercase">{title}</p>
      {children}
    </div>
  );
}

function MockList({ items }: { items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-1 text-xs text-muted">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}
