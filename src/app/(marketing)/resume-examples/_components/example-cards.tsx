import { ArrowRight } from "lucide-react";
import { IntentLink } from "@/components/site/intent-link";
import { Panel } from "@/components/ui/panel";
import type { RoleExample } from "@/lib/seo-pages/examples";
import { examplePath } from "@/lib/seo-pages/paths";
import { cn } from "@/lib/utils";

export function ExampleCards({
  examples,
  className,
}: {
  examples: readonly RoleExample[];
  className?: string;
}) {
  return (
    <Panel className={cn("max-sm:rounded-none max-sm:bg-transparent max-sm:p-0", className)}>
      <ul
        role="list"
        className="divide-y divide-border border-y border-border sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0 sm:border-0 lg:grid-cols-3"
      >
        {examples.map((example) => (
          <li key={example.slug}>
            <IntentLink
              href={examplePath(example.slug)}
              className="group flex h-full flex-col gap-1 py-4 sm:gap-2 sm:rounded-2xl sm:bg-surface sm:p-6 sm:transition-colors sm:hover:bg-surface-hover"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-lg/7 font-medium tracking-tight text-ink">
                  {example.role}
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                />
              </span>
              <span className="text-sm/6 text-pretty text-muted">{example.card}</span>
            </IntentLink>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
