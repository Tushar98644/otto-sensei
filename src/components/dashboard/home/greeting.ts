import type { Format } from "@/i18n/intl";
import type { DashboardMessages } from "../i18n";

export type Greeting = { title: string; message: string; meta?: string };

// "Welcome back" only once the account holds a resume of its own, so a first visit never hears it.
export function homeGreeting(
  { own, samples }: { own: number; samples: number },
  { home }: DashboardMessages,
  format: Format,
): Greeting {
  if (own > 0) {
    return {
      title: home.welcomeBack,
      message: home.returning,
      meta: format.plural(home.resumes, own),
    };
  }
  if (samples > 0) {
    return {
      title: home.welcome,
      message: home.sampleOnly,
      meta: format.plural(home.samples, samples),
    };
  }
  return { title: home.welcome, message: home.first };
}
