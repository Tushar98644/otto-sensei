import type { ReactNode } from "react";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { rich } from "@/i18n/rich";
import type { SignInWords } from "./use-sign-in-words";

// The legal pages in the reader's language where they're published; the English paths otherwise.
export type LegalLinks = { terms: string; privacy: string };

const ENGLISH_LINKS: LegalLinks = { terms: ROUTES.terms, privacy: ROUTES.privacy };

export function SignInTerms({
  words,
  links = ENGLISH_LINKS,
}: {
  words: Pick<SignInWords, "terms" | "newTab">;
  links?: LegalLinks;
}) {
  const hrefs = [links.terms, links.privacy];
  return (
    <p className="text-xs leading-relaxed text-muted">
      {rich(words.terms, {
        link: (chunk, index) => (
          <LegalLink href={hrefs[index] ?? links.terms} newTab={words.newTab}>
            {chunk}
          </LegalLink>
        ),
      })}
    </p>
  );
}

function LegalLink({
  href,
  newTab,
  children,
}: {
  href: string;
  newTab: string;
  children: ReactNode;
}) {
  return (
    <TextLink href={href} target="_blank" rel="noopener">
      {children}
      <span className="sr-only">{` ${newTab}`}</span>
    </TextLink>
  );
}
