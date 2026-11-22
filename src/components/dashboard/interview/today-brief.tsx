"use client";

import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { useSessionUserId } from "@/components/account/session-user";
import { Eyebrow } from "@/components/ui/eyebrow";
import { api } from "@/lib/api/client";
import { briefOf } from "@/lib/interviews/brief";
import { useAppQueryClient } from "@/lib/queries/client";
import { cn } from "@/lib/utils";

const briefKey = (userId: string, applicationId: string) =>
  ["interview-brief", userId, applicationId] as const;

// On the interview's day: the saved pack's strongest stories, likely questions and questions to ask.
export function TodayBrief({
  applicationId,
  className,
}: {
  applicationId: string;
  className?: string;
}) {
  const userId = useSessionUserId();
  const client = useAppQueryClient();
  const titleId = useId();
  const { data: prep } = useQuery(
    {
      queryKey: briefKey(userId ?? "", applicationId),
      queryFn: async () => (await api.interviewPrep(applicationId)).prep,
      enabled: userId !== null,
    },
    client,
  );
  if (!prep) return null;
  const brief = briefOf(prep);
  const lists = [
    { title: "Your strongest stories", items: brief.stories },
    { title: "Likely questions", items: brief.questions },
    { title: "Questions to ask them", items: brief.asks },
  ].filter((list) => list.items.length > 0);
  if (lists.length === 0) return null;
  return (
    <section
      aria-labelledby={titleId}
      className={cn("flex flex-col gap-4 motion-safe:animate-fade-in", className)}
    >
      <h4 id={titleId} className="font-sans text-sm/5 font-medium text-ink">
        Today&rsquo;s brief
      </h4>
      <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
        {lists.map((list) => (
          <div key={list.title} className="flex min-w-0 flex-col gap-2">
            <Eyebrow>{list.title}</Eyebrow>
            <ul className="flex flex-col gap-1.5 text-sm/5 text-pretty text-muted">
              {list.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-subtle" />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
