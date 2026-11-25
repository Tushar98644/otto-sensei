import Link from "next/link";
import { MERCHANT } from "@/app/[lang]/(marketing)/_components/merchant";
import { BRAND } from "@/config/brand";
import { FOOTER_GROUPS } from "./routes";
import { SiteLogo } from "./site-logo";

const SHOW_SUPPORT_EMAIL = !BRAND.supportEmail.toLowerCase().endsWith("@example.com");

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container-page flex flex-col gap-10 py-10 sm:py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
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
          <nav
            aria-label="Footer"
            className="grid min-w-0 grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 sm:gap-x-12"
          >
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col">
                <h2
                  id={`footer-${group.title.toLowerCase()}`}
                  className="font-sans text-xs/4 font-medium tracking-widest text-subtle uppercase"
                >
                  {group.title}
                </h2>
                <ul aria-labelledby={`footer-${group.title.toLowerCase()}`} className="mt-2">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        prefetch={false}
                        className="inline-flex min-h-11 items-center text-sm whitespace-nowrap text-muted transition-colors hover:text-ink pointer-fine:min-h-8"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p className="text-sm/5 text-subtle">
          © {new Date().getUTCFullYear()} {BRAND.name} · Payments by {MERCHANT.name}
        </p>
      </div>
    </footer>
  );
}
