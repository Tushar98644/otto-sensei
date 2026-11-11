import { Globe, Mail, MapPin, Phone } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { SocialKind } from "@/lib/portfolio/content";
import { SocialIcon } from "../icons";
import { allSkills, Marked, nameOf, OutLink, TemplateStyle } from "../parts";
import type { PortfolioTemplateProps } from "../types";
import { CommandMenu } from "./islands";
import { CV_CSS } from "./styles";

// Ported from BartoszJarocki/cv (MIT, see ./LICENSE.txt).

type ContactLink = { label: string; href: string; text: string; icon: ReactNode };

const fade = (step: number) => ({ animationDelay: `${step * 75}ms` }) as CSSProperties;

function shortUrl(href: string): string {
  return href
    .replace(/^mailto:|^tel:/i, "")
    .replace(/^https?:\/\/(www\.)?/i, "")
    .replace(/\/$/, "");
}

function Arrow() {
  return (
    <span className="arrow" aria-hidden>
      {" ↗"}
    </span>
  );
}

function Tags({
  tags,
  label,
  skills,
}: {
  tags: readonly string[];
  label: string;
  skills?: boolean;
}) {
  if (tags.length === 0) return null;
  return (
    <ul className={skills ? "tags skills" : "tags"} aria-label={label}>
      {tags.map((tag, index) => (
        <li key={tag}>
          {tag}
          {index < tags.length - 1 ? (
            <span className="dot" aria-hidden>
              {" · "}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function iconFor(kind: SocialKind) {
  if (kind === "website") return <Globe aria-hidden />;
  return <SocialIcon kind={kind} />;
}

export function CvTemplate({ view, content, footer }: PortfolioTemplateProps) {
  const name = nameOf(view);
  const about = view.headline || content.pitch;
  const place = content.location?.label || view.location;
  const socials = content.socials.filter((social) => social.kind !== "email");
  const links: ContactLink[] = [
    ...socials
      .filter((social) => social.kind === "website")
      .map((social) => ({
        label: social.label || "Website",
        href: social.href,
        text: shortUrl(social.href),
        icon: iconFor(social.kind),
      })),
    ...(content.email
      ? [
          {
            label: "Email",
            href: `mailto:${content.email}`,
            text: content.email,
            icon: <Mail aria-hidden />,
          },
        ]
      : []),
    ...(content.phone
      ? [
          {
            label: "Phone",
            href: `tel:${content.phone.replace(/[^\d+]/g, "")}`,
            text: content.phone,
            icon: <Phone aria-hidden />,
          },
        ]
      : []),
    ...socials
      .filter((social) => social.kind !== "website")
      .map((social) => ({
        label: social.label,
        href: social.href,
        text: shortUrl(social.href),
        icon: iconFor(social.kind),
      })),
  ];
  const menuLinks = links
    .filter((link) => !/^(mailto|tel):/i.test(link.href))
    .map(({ label, href }) => ({ label, href }));
  const skills = allSkills(view);

  const sections: ReactNode[] = [];
  if (content.about.length > 0) {
    sections.push(
      <Section key="about" title="About">
        <div className="summary">
          {content.aboutParts.map((parts, index) => (
            <p key={index}>
              <Marked parts={parts} />
            </p>
          ))}
        </div>
      </Section>,
    );
  }
  if (content.experience.length > 0) {
    sections.push(
      <Section key="work" title="Work Experience">
        <div className="entries">
          {content.experience.map((job) => (
            <article key={job.id}>
              <div className="entry-top">
                <div className="entry-line">
                  <h3>
                    {job.website ? (
                      <OutLink href={job.website.href} label={`${job.company} company website`}>
                        {job.company || job.title}
                        <Arrow />
                      </OutLink>
                    ) : (
                      job.company || job.title
                    )}
                  </h3>
                  {job.dates ? (
                    <div className="dates" title={`Employment period: ${job.dates}`}>
                      {job.start && job.end ? `${job.start} - ${job.end}` : job.dates}
                    </div>
                  ) : null}
                </div>
                {job.company && job.title ? <h4>{job.title}</h4> : null}
              </div>
              {job.summary || job.lines.length > 0 ? (
                <div className="desc">
                  {job.summary}
                  {job.lines.length > 0 ? (
                    <ul>
                      {job.lines.map((line, index) => (
                        <li key={index}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              <Tags tags={job.tags} label="Technologies used" />
            </article>
          ))}
        </div>
      </Section>,
    );
  }
  if (content.education.length > 0) {
    sections.push(
      <Section key="education" title="Education">
        <div className="entries tight">
          {content.education.map((school) => (
            <article key={school.id}>
              <div className="entry-line">
                <h3>
                  {school.website ? (
                    <OutLink href={school.website.href}>
                      {school.school || school.degree}
                      <Arrow />
                    </OutLink>
                  ) : (
                    school.school || school.degree
                  )}
                </h3>
                {school.dates ? (
                  <div className="dates" title={`Period: ${school.dates}`}>
                    {school.start && school.end ? `${school.start} - ${school.end}` : school.dates}
                  </div>
                ) : null}
              </div>
              {school.school && school.degree ? (
                <div className="degree">{school.degree}</div>
              ) : null}
            </article>
          ))}
        </div>
      </Section>,
    );
  }
  if (skills.length > 0) {
    sections.push(
      <Section key="skills" title="Skills">
        <Tags tags={skills} label="List of skills" skills />
      </Section>,
    );
  }
  if (content.projects.length > 0) {
    sections.push(
      <Section key="projects" title="Side projects">
        <div className="projects">
          {content.projects.map((project) => {
            const href = project.website?.href ?? project.source?.href ?? null;
            const text = project.line || project.description;
            return (
              <article key={project.id}>
                <h3>
                  {href ? (
                    <OutLink href={href} label={`${project.name} project (opens in new tab)`}>
                      {project.name}
                      <Arrow />
                    </OutLink>
                  ) : (
                    project.name
                  )}
                </h3>
                {href ? (
                  <OutLink href={href} className="url">
                    {shortUrl(href)}
                  </OutLink>
                ) : null}
                {text ? <p>{text}</p> : null}
                <Tags tags={project.tech} label="Technologies used" />
              </article>
            );
          })}
        </div>
      </Section>,
    );
  }

  return (
    <div className="pf-cv">
      <TemplateStyle css={CV_CSS} />
      <div className="main">
        <div className="sheet" aria-label="Resume content">
          <div className="fade" style={fade(0)}>
            <header className="head">
              <div className="head-text">
                <h1>{name}</h1>
                {about ? <p className="about">{about}</p> : null}
                {place ? (
                  <p className="where">
                    <OutLink
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`}
                      label={`Location: ${place}`}
                    >
                      <MapPin aria-hidden />
                      {place}
                    </OutLink>
                  </p>
                ) : null}
                {links.length > 0 ? (
                  <>
                    <ul className="contact" aria-label="Contact links">
                      {links.map((link) => (
                        <li key={link.href}>
                          <OutLink href={link.href} label={link.label}>
                            {link.icon}
                          </OutLink>
                        </li>
                      ))}
                    </ul>
                    <div className="print-contact">
                      {links.map((link, index) => (
                        <span key={link.href}>
                          <a href={link.href}>{link.text}</a>
                          {index < links.length - 1 ? <span aria-hidden> /</span> : null}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
              <div className="avatar" aria-hidden>
                {content.initials}
              </div>
            </header>
          </div>
          {sections.map((section, index) => (
            <div key={index} className="fade" style={fade(index + 1)}>
              {section}
            </div>
          ))}
        </div>
        {footer ? (
          <footer className="foot">
            <div className="credit">{footer}</div>
          </footer>
        ) : null}
        <CommandMenu links={menuLinks} />
      </div>
    </div>
  );
}
