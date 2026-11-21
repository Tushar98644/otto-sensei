import type { ReactNode } from "react";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { cn } from "@/lib/utils";

export function SignInTerms({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted", className)}>
      New here? This creates your free account. By continuing you agree to the{" "}
      <LegalLink href={ROUTES.terms}>Terms</LegalLink> and{" "}
      <LegalLink href={ROUTES.privacy}>Privacy Policy</LegalLink>.
    </p>
  );
}

function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <TextLink href={href} target="_blank" rel="noopener">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </TextLink>
  );
}
