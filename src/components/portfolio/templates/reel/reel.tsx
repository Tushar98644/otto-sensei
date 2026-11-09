import { ArrowRight, ChevronRight, Send, X } from "lucide-react";
import type { CSSProperties } from "react";
import type { ContentProject } from "@/lib/portfolio/content";
import { SocialIcon } from "../icons";
import {
  contactHref,
  DesignCredit,
  featuredFirst,
  Marked,
  nameOf,
  OutLink,
  Picture,
  safeId,
  TemplateStyle,
} from "../parts";
import { RevealOnScroll } from "../reveal";
import type { PortfolioTemplateProps } from "../types";
import {
  DecoderText,
  Disciplines,
  MobileNav,
  Sphere,
  ThemeToggle,
  type ReelNavLink,
} from "./islands";
import { REEL_CSS } from "./styles";

// Reel: a rebuild of Hamish Williams' portfolio (github.com/HamishMW/portfolio, MIT;
// ./LICENSE.txt) for anyone's data. A vertical nav rail, an intro whose name decodes out of
// katakana over a displacement sphere while the title rotates through the person's disciplines,
// then one screen per project with its screenshot in a laptop or phone frame, a profile section,
// and a project page per project (opened in place via :target, no extra route).

const SUMMARIES_MAX = 4;
const SOCIALS_MAX = 4;

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

type Device = "laptop" | "phone" | "plain";

function deviceOf(project: ContentProject): Device {
  if (project.device === "phone") return "phone";
  if (project.device === "none" && project.images.length > 0) return "plain";
  if (project.device === "laptop" || project.device === "browser") return "laptop";
  const image = project.images[0];
  return image?.width && image.height && image.height > image.width ? "phone" : "laptop";
}

/** Where a project's button goes: its own page when there's more to show, else its site. */
function projectTarget(project: ContentProject): { href: string; label: string } | null {
  if (project.details.length > 0 || project.images.length > 1) {
    return { href: `#${safeId("pf-reel-p", project.id)}`, label: "View project" };
  }
  if (project.website) return { href: project.website.href, label: "View website" };
  if (project.source) return { href: project.source.href, label: "View source" };
  return null;
}

function Divider() {
  return (
    <div className="divider" aria-hidden>
      <div className="line" />
      <div className="notch" />
    </div>
  );
}

function Preview({ project }: { project: ContentProject }) {
  const device = deviceOf(project);
  const video = project.video?.kind === "file" ? project.video : null;
  if (device === "plain") {
    return (
      <div className="plain">
        <Picture image={project.images[0]!} />
      </div>
    );
  }
  if (device === "phone") {
    const shots = project.images.slice(0, 2);
    return (
      <div className="phones">
        {(shots.length > 0 ? shots : [null]).map((image, index) => (
          <div className="phone" key={image?.src ?? index}>
            <div className="screen">
              {image ? (
                <Picture image={image} />
              ) : (
                <div className="blank-screen">{project.name}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
  const image = project.images[0];
  return (
    <div className="laptop">
      <div className="laptop-screen">
        <div className="screen">
          {video ? (
            <video
              src={video.src}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label={`${project.name} video`}
            />
          ) : image ? (
            <Picture image={image} />
          ) : (
            <div className="blank-screen">{project.name}</div>
          )}
        </div>
      </div>
      <div className="laptop-base" />
    </div>
  );
}

function Summary({ project, index }: { project: ContentProject; index: number }) {
  const alternate = index % 2 === 1;
  const target = projectTarget(project);
  const titleId = `pf-reel-project-${index + 1}-title`;
  const details = (
    <div className="details">
      <div className="index" aria-hidden>
        <Divider />
        <span className="index-number">{pad(index + 1)}</span>
      </div>
      <h2 className="heading h3" id={titleId}>
        {project.name}
      </h2>
      {project.line || project.description ? (
        <p className="text m description">{project.line || project.description}</p>
      ) : null}
      {target ? (
        <div className="cta">
          <OutLink href={target.href} className="button">
            {target.label}
            <ArrowRight aria-hidden />
          </OutLink>
        </div>
      ) : null}
    </div>
  );
  const preview = (
    <div className="preview">
      <div className="devices" data-device={deviceOf(project)}>
        <Preview project={project} />
        <span className="katakana" aria-hidden>
          プロジェクト
        </span>
      </div>
    </div>
  );
  return (
    <section
      id={`pf-reel-project-${index + 1}`}
      className={`summary section${alternate ? "alt" : ""}${index === 0 ? "first" : ""}`}
      aria-labelledby={titleId}
      data-reveal
    >
      <div className="summary-content">
        {alternate ? (
          <>
            {preview}
            {details}
          </>
        ) : (
          <>
            {details}
            {preview}
          </>
        )}
      </div>
    </section>
  );
}

function DetailPage({ project, back }: { project: ContentProject; back: string }) {
  const link = project.website ?? project.source;
  const meta = [...project.roles, project.category, project.years].filter(Boolean);
  const paragraphs =
    project.details.length > 0 ? project.details : project.description ? [project.description] : [];
  return (
    <article id={safeId("pf-reel-p", project.id)} className="detail" aria-label={project.name}>
      <a className="detail-close" href={back}>
        <X aria-hidden width={18} height={18} />
        Close
      </a>
      <section className="detail-header section">
        <div className="detail-header-content">
          <div>
            <h2 className="heading h2 detail-title">{project.name}</h2>
            {project.line ? <p className="text xl detail-description">{project.line}</p> : null}
            {link ? (
              <OutLink href={link.href} className="button secondary">
                <ChevronRight aria-hidden />
                {project.website ? "Visit website" : "View source"}
              </OutLink>
            ) : null}
          </div>
          {meta.length > 0 ? (
            <ul className="meta">
              {meta.map((item) => (
                <li key={item} className="meta-item">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
      {project.images.length > 0 ? (
        <div className="detail-images section">
          {project.images.map((image) => (
            <div key={image.src} className="detail-image">
              <Picture image={image} />
            </div>
          ))}
        </div>
      ) : null}
      {paragraphs.length > 0 ? (
        <section className="detail-section section">
          <div className="detail-section-inner">
            {project.outcome ? <h3 className="heading h3">{project.outcome}</h3> : null}
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text l">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

export function ReelTemplate({ view, content, footer }: PortfolioTemplateProps) {
  const name = nameOf(view);
  const disciplines =
    content.disciplines.length > 0 ? content.disciplines : view.headline ? [view.headline] : [];
  const role = disciplines[0] ?? "Portfolio";
  const rotating = disciplines.slice(1);
  // The original's words ("Designer", "Illustrator") are short; longer ones step the type down.
  const longest = Math.max(role.length, ...rotating.map((word) => word.length + 2));
  const titleScale = Math.min(1, 11 / Math.max(longest, 1));
  const projects = featuredFirst(content.projects);
  const summaries = projects.slice(0, SUMMARIES_MAX);
  const more = projects.slice(SUMMARIES_MAX);
  const socials = content.socials.filter((social) => social.kind !== "email").slice(0, SOCIALS_MAX);
  const hello = contactHref(content);
  const about =
    content.aboutParts.length > 0
      ? content.aboutParts
      : content.pitch
        ? [[{ text: content.pitch, mark: false }]]
        : [];
  const workAnchor = summaries.length > 0 ? "#pf-reel-project-1" : "#pf-reel-intro";
  const year = new Date().getUTCFullYear();

  const links: ReelNavLink[] = [
    summaries.length > 0 ? { href: "#pf-reel-project-1", label: "Projects" } : null,
    about.length > 0 ? { href: "#pf-reel-details", label: "Details" } : null,
    hello ? { href: hello, label: "Contact" } : null,
  ].filter((link): link is ReelNavLink => link !== null);

  return (
    <div className="pf-reel" data-theme="dark">
      <TemplateStyle css={REEL_CSS} />
      <RevealOnScroll />
      <div className="shell">
        <header className="navbar">
          <a className="monogram" href="#pf-reel-intro" aria-label={`${name}, home`}>
            <svg viewBox="0 0 48 32" aria-hidden>
              <text x="24" y="25" textAnchor="middle">
                {content.initials || name.charAt(0)}
              </text>
            </svg>
          </a>
          <nav className="nav">
            <div className="nav-list">
              {links.map((link) => (
                <OutLink key={link.href} href={link.href} className="nav-link">
                  {link.label}
                </OutLink>
              ))}
            </div>
            {socials.length > 0 ? (
              <div className="nav-icons">
                {socials.map((social) => (
                  <OutLink
                    key={social.href}
                    href={social.href}
                    className="nav-icon"
                    label={social.label}
                  >
                    <SocialIcon kind={social.kind} />
                  </OutLink>
                ))}
              </div>
            ) : null}
          </nav>
          <MobileNav
            links={[
              ...links,
              ...socials.map((social) => ({ href: social.href, label: social.label })),
            ]}
          />
        </header>
        <ThemeToggle />

        <section id="pf-reel-intro" className="intro section" aria-labelledby="pf-reel-intro-title">
          <div className="sphere-still" aria-hidden />
          <Sphere />
          <header className="intro-text">
            <h1 className="name" id="pf-reel-intro-title">
              <DecoderText text={name} delay={500} />
            </h1>
            <h2
              className="heading h0 title"
              style={{ "--title-scale": titleScale } as CSSProperties}
            >
              <span className="visually-hidden">{[role, ...rotating].join(", ")}</span>
              <span className="row" aria-hidden>
                <span
                  className="word"
                  data-status="entering"
                  style={{ "--delay": "200ms" } as CSSProperties}
                >
                  {role}
                </span>
                <span className="line" />
              </span>
              {rotating.length > 0 ? <Disciplines words={rotating} /> : null}
            </h2>
          </header>
          {summaries.length > 0 ? (
            <a className="scroll-indicator" href={workAnchor}>
              <span className="visually-hidden">Scroll to projects</span>
            </a>
          ) : null}
        </section>

        {summaries.map((project, index) => (
          <Summary key={project.id} project={project} index={index} />
        ))}

        {more.length > 0 ? (
          <section className="more section" aria-labelledby="pf-reel-more-title" data-reveal>
            <div className="more-inner">
              <div className="index" aria-hidden>
                <Divider />
              </div>
              <h2 className="heading h3" id="pf-reel-more-title">
                More projects
              </h2>
              <div className="more-list">
                {more.map((project, index) => {
                  const target = projectTarget(project);
                  return (
                    <div key={project.id} className="more-item">
                      <span className="index-number">{pad(SUMMARIES_MAX + index + 1)}</span>
                      <div>
                        <h3>
                          {target ? (
                            <OutLink href={target.href}>{project.name}</OutLink>
                          ) : (
                            project.name
                          )}
                        </h3>
                        {project.line ? <p className="text s">{project.line}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {about.length > 0 ? (
          <section
            id="pf-reel-details"
            className="profile section"
            aria-labelledby="pf-reel-details-title"
            data-reveal
          >
            <div className="profile-content">
              <div className="profile-column">
                <h2 className="heading h3 profile-title" id="pf-reel-details-title">
                  <DecoderText text="Hi there" delay={500} />
                </h2>
                {about.map((parts, index) => (
                  <p key={index} className="text l profile-text">
                    <Marked parts={parts} mark="span" className="mark" />
                  </p>
                ))}
                {hello ? (
                  <OutLink href={hello} className="button secondary profile-text">
                    <Send aria-hidden />
                    Send me a message
                  </OutLink>
                ) : null}
              </div>
              <div className="profile-column">
                <div className="profile-tag" aria-hidden>
                  <Divider />
                  <div className="profile-tag-text">About me</div>
                </div>
                <div className="profile-image">
                  <div className="profile-frame">
                    {content.photo ? (
                      <Picture image={content.photo} />
                    ) : (
                      <div className="initials" aria-hidden>
                        {content.initials}
                      </div>
                    )}
                  </div>
                  <span className="katakana-v" aria-hidden>
                    プロフィール
                  </span>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <footer className="footer">
          <span>
            &copy; {year} {name}.
          </span>
          <DesignCredit id="reel" />
          {footer ? <div className="credit">{footer}</div> : null}
        </footer>

        {projects
          .filter((project) => projectTarget(project)?.href.startsWith("#"))
          .map((project) => (
            <DetailPage key={project.id} project={project} back={workAnchor} />
          ))}
      </div>
    </div>
  );
}
