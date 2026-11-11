import type { Metadata } from "next";
import { ReminderAction, type ReminderRequest } from "./_components/reminder-action";

export const metadata: Metadata = {
  title: "Reminder",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

export default async function ReminderPage({ searchParams }: Props) {
  const params = await searchParams;
  const action = one(params.do);
  const request: ReminderRequest | null =
    action === "done" || action === "snooze"
      ? { kind: action, u: one(params.u), a: one(params.a), t: one(params.t) }
      : action === "unsubscribe"
        ? { kind: "unsubscribe", u: one(params.u), t: one(params.t) }
        : null;
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-16 sm:py-24">
      <h1 className="font-display text-5xl/none font-normal tracking-tight text-ink">Reminders</h1>
      <ReminderAction request={request} />
    </div>
  );
}
