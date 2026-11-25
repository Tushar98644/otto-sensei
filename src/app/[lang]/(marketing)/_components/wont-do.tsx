import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { rich } from "@/i18n/rich";
import type { HomeMessages, HomeProps } from "./home-copy";
import { Section, SectionHeader } from "./section";

const PLEDGES: readonly (keyof HomeMessages["wontDo"]["pledges"])[] = [
  "score",
  "numbers",
  "download",
  "file",
];

export function WontDo({ t, href }: Pick<HomeProps, "t" | "href">) {
  const words = t.wontDo;
  return (
    <Section
      labelledBy="wont-do-title"
      lazySize="[contain-intrinsic-size:auto_800px] sm:[contain-intrinsic-size:auto_700px] lg:[contain-intrinsic-size:auto_635px]"
    >
      <SectionHeader id="wont-do-title" title={words.title} />
      <ul role="list" className="mt-12 divide-y divide-border border-y border-border sm:mt-16">
        {PLEDGES.map((key) => {
          const { claim, reason } = words.pledges[key];
          return (
            <li key={key} className="grid gap-2 py-8 sm:grid-cols-2 sm:gap-8">
              <p className="font-display text-3xl/9 text-ink sm:text-4xl/10">{claim}</p>
              <p className="max-w-prose text-base/7 text-muted sm:pt-1">
                {rich(reason, {
                  link: (chunk) => <TextLink href={href(ROUTES.privacy)}>{chunk}</TextLink>,
                })}
              </p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
