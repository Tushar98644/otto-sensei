"use client";

import { useEffect, useId, useState, type CSSProperties, type MouseEvent } from "react";
import type { SocialKind } from "@/lib/portfolio/content";
import { SocialIcon } from "../icons";
import { Transition } from "./motion";
import { useReel } from "./root";
import { scrollToHash } from "./scroll";
import { Icon } from "./sprites";
import { Button } from "./ui";

// HamishMW/portfolio layouts/navbar: the monogram, the sideways links and the social icons down
// the left, the theme toggle top right, and below 696px a menu button opening a full-screen,
// blurred menu. The monogram is the owner's initials drawn the way his mark is.

export type ReelNavLink = { label: string; href: string };
export type ReelSocial = { label: string; href: string; kind: SocialKind };

const EXTERNAL = /^https?:/i;
// Marks his sprite has; the rest come from the shared social icons.
const OWN_MARKS = new Set<SocialKind>(["github", "bluesky"]);

export function Navbar({
  name,
  initials,
  home,
  links,
  socials,
}: {
  name: string;
  initials: string;
  home: string;
  links: ReelNavLink[];
  socials: ReelSocial[];
}) {
  const { reduceMotion } = useReel();
  const [current, setCurrent] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setCurrent(window.location.hash || null);
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const handleNavItemClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const href = event.currentTarget.getAttribute("href") ?? "";
    if (href.startsWith("#")) setCurrent(href);
    scrollToHash(event, reduceMotion);
  };

  const handleMobileNavClick = (event: MouseEvent<HTMLAnchorElement>) => {
    handleNavItemClick(event);
    if (menuOpen) setMenuOpen(false);
  };

  return (
    <header className="navbar">
      <a
        href={home}
        data-navbar-item
        className="navbar-logo"
        aria-label={`${name}, home`}
        onClick={handleMobileNavClick}
      >
        <Monogram initials={initials} />
      </a>
      <NavToggle onClick={() => setMenuOpen(!menuOpen)} menuOpen={menuOpen} />
      <nav className="navbar-nav">
        <div className="navbar-nav-list">
          {links.map(({ label, href }) => (
            <NavLink
              key={label}
              href={href}
              className="navbar-nav-link"
              current={current === href}
              onClick={handleNavItemClick}
            >
              {label}
            </NavLink>
          ))}
        </div>
        <NavbarIcons desktop socials={socials} />
      </nav>
      <Transition unmount in={menuOpen} timeout={600}>
        {({ visible }) => (
          <nav className="navbar-mobile-nav" data-visible={visible}>
            {links.map(({ label, href }, index) => (
              <NavLink
                key={label}
                href={href}
                className="navbar-mobile-nav-link"
                data-visible={visible}
                current={current === href}
                onClick={handleMobileNavClick}
                style={{ "--transitionDelay": `${300 + index * 50}ms` } as CSSProperties}
              >
                {label}
              </NavLink>
            ))}
            <NavbarIcons socials={socials} />
            <ThemeToggle isMobile />
          </nav>
        )}
      </Transition>
      <ThemeToggle data-navbar-item />
    </header>
  );
}

function NavLink({
  href,
  className,
  current,
  onClick,
  style,
  children,
  ...rest
}: {
  href: string;
  className: string;
  current: boolean;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  style?: CSSProperties;
  children: string;
  "data-visible"?: boolean;
}) {
  const external = EXTERNAL.test(href);
  return (
    <a
      href={href}
      className={className}
      aria-current={current ? "page" : undefined}
      onClick={onClick}
      style={style}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer nofollow ugc" : undefined}
      {...rest}
    >
      {children}
    </a>
  );
}

function NavbarIcons({ desktop, socials }: { desktop?: boolean; socials: ReelSocial[] }) {
  if (socials.length === 0) return null;
  return (
    <div className="navbar-nav-icons">
      {socials.map(({ label, href, kind }) => (
        <a
          key={href}
          data-navbar-item={desktop || undefined}
          className="navbar-nav-icon-link"
          aria-label={label}
          href={href}
          target={EXTERNAL.test(href) ? "_blank" : undefined}
          rel={EXTERNAL.test(href) ? "noopener noreferrer nofollow ugc" : undefined}
        >
          {OWN_MARKS.has(kind) ? (
            <Icon className="navbar-nav-icon" icon={kind === "github" ? "github" : "bluesky"} />
          ) : (
            <SocialIcon kind={kind} className="navbar-nav-icon-outline" />
          )}
        </a>
      ))}
    </div>
  );
}

/** components/monogram, with the owner's initials as the mark the accent wipes over. */
function Monogram({ initials }: { initials: string }) {
  const id = useId();
  const clipId = `${id}monogram-clip`;
  return (
    <svg aria-hidden className="monogram" width="48" height="29" viewBox="0 0 48 29">
      <defs>
        <clipPath id={clipId}>
          <text className="monogram-text" x="24" y="27" textAnchor="middle">
            {initials}
          </text>
        </clipPath>
      </defs>
      <rect clipPath={`url(#${clipId})`} width="100%" height="100%" />
      <g clipPath={`url(#${clipId})`}>
        <rect className="monogram-highlight" width="100%" height="100%" />
      </g>
    </svg>
  );
}

function NavToggle({ menuOpen, onClick }: { menuOpen: boolean; onClick: () => void }) {
  return (
    <Button iconOnly className="nav-toggle" label="Menu" expanded={menuOpen} onClick={onClick}>
      <span className="nav-toggle-inner">
        <Icon className="nav-toggle-icon" data-menu data-open={menuOpen} icon="menu" />
        <Icon className="nav-toggle-icon" data-close data-open={menuOpen} icon="close" />
      </span>
    </Button>
  );
}

/** layouts/navbar/theme-toggle: the sun's rays fold in as a moon bites it, and back. */
function ThemeToggle({ isMobile, ...rest }: { isMobile?: boolean; "data-navbar-item"?: boolean }) {
  const id = useId();
  const { toggleTheme } = useReel();
  const maskId = `${id}theme-toggle-mask`;
  return (
    <Button
      iconOnly
      className="theme-toggle"
      data-mobile={isMobile}
      label="Toggle theme"
      onClick={() => toggleTheme()}
      {...rest}
    >
      <svg aria-hidden className="theme-toggle-svg" width="38" height="38" viewBox="0 0 38 38">
        <defs>
          <mask id={maskId}>
            <circle className="theme-toggle-circle" data-mask cx="19" cy="19" r="13" />
            <circle className="theme-toggle-mask" cx="25" cy="14" r="9" />
          </mask>
        </defs>
        <path
          className="theme-toggle-path"
          d="M19 3v7M19 35v-7M32.856 11l-6.062 3.5M5.144 27l6.062-3.5M5.144 11l6.062 3.5M32.856 27l-6.062-3.5"
        />
        <circle className="theme-toggle-circle" mask={`url(#${maskId})`} cx="19" cy="19" r="12" />
      </svg>
    </Button>
  );
}
