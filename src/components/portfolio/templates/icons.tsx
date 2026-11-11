import type { ReactElement, ReactNode } from "react";
import { Globe, Link2, Mail } from "lucide-react";
import type { SocialKind } from "@/lib/portfolio/content";

// Brand marks for social links, shared by the templates. Outline marks follow Feather (MIT, as
// bundled by bchiang7/v4); X and Bluesky are solid, like their own logos. Kinds without a mark
// here fall back to a plain link icon rather than a guessed logo.

type IconProps = { className?: string };

const outline = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Svg({ className, children, solid }: IconProps & { children: ReactNode; solid?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...(solid ? { fill: "currentColor" } : outline)}
    >
      {children}
    </svg>
  );
}

export function GitHubIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </Svg>
  );
}

export function LinkedInIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </Svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <Svg className={className} solid>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </Svg>
  );
}

function InstagramIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </Svg>
  );
}

function YouTubeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </Svg>
  );
}

function DribbbleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32" />
    </Svg>
  );
}

function BlueskyIcon({ className }: IconProps) {
  return (
    <Svg className={className} solid>
      <path d="M5.2 3.1C7.95 5.17 10.9 9.36 12 11.63c1.1-2.27 4.05-6.46 6.8-8.53 1.98-1.49 5.2-2.65 5.2 1.03 0 .73-.42 6.17-.67 7.06-.86 3.07-3.99 3.85-6.78 3.38 4.87.83 6.1 3.57 3.43 6.31-5.08 5.21-7.3-1.31-7.87-2.98-.1-.31-.15-.45-.15-.33 0-.12-.05.02-.15.33-.57 1.67-2.79 8.19-7.87 2.98-2.67-2.74-1.44-5.48 3.43-6.31-2.79.47-5.92-.31-6.78-3.38C.42 10.3 0 4.86 0 4.13 0 .45 3.22 1.61 5.2 3.1z" />
    </Svg>
  );
}

const MARKS: Partial<Record<SocialKind, (props: IconProps) => ReactElement>> = {
  github: GitHubIcon,
  linkedin: LinkedInIcon,
  x: XIcon,
  bluesky: BlueskyIcon,
  instagram: InstagramIcon,
  youtube: YouTubeIcon,
  dribbble: DribbbleIcon,
};

export function SocialIcon({ kind, className }: IconProps & { kind: SocialKind }) {
  const Mark = MARKS[kind];
  if (Mark) return <Mark className={className} />;
  if (kind === "email") return <Mail aria-hidden className={className} />;
  if (kind === "website") return <Globe aria-hidden className={className} />;
  return <Link2 aria-hidden className={className} />;
}
