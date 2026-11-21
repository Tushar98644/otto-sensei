import { OTTO } from "@/components/mascot/lines";
import { pluralize } from "@/lib/utils";

export type Greeting = { title: string; message: string; meta?: string };

// "Welcome back" only once the account holds a resume of its own, so a first visit never hears it.
export function homeGreeting({ own, samples }: { own: number; samples: number }): Greeting {
  if (own > 0) {
    return { title: "Welcome back", message: OTTO.home.returning, meta: pluralize(own, "resume") };
  }
  if (samples > 0) {
    return { title: "Welcome", message: OTTO.home.sampleOnly, meta: pluralize(samples, "sample") };
  }
  return { title: "Welcome", message: OTTO.home.first };
}
