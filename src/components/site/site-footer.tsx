import Link from "next/link";
import { BRAND } from "@/config/brand";
import { FOOTER_NAV } from "./routes";
import { SiteLogo } from "./site-logo";

const SHOW_SUPPORT_EMAIL = !BRAND.supportEmail.toLowerCase().endsWith("@example.com");

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between sm:py-12">
        <div className="flex flex-col items-start gap-1">
          <SiteLogo />
          <p className="text-sm text-muted">Made for job seekers everywhere.</p>
          {SHOW_SUPPORT_EMAIL ? (
            <a
              href={`mailto:${BRAND.supportEmail}`}
              className="inline-flex min-h-12 items-center text-sm text-ink underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-ink sm:min-h-11"
            >
              {BRAND.supportEmail}
            </a>
          ) : null}
        </div>
        <nav aria-label="Footer" className="min-w-0">
          <ul className="grid grid-cols-2 gap-x-8 sm:flex sm:flex-wrap sm:justify-end sm:gap-x-6">
            {FOOTER_NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={false}
                  className="inline-flex min-h-12 items-center text-sm whitespace-nowrap text-muted transition-colors hover:text-ink sm:min-h-11"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
