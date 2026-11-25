import { Fragment, type ReactNode } from "react";
import { fmt } from "@/i18n/format";
import { rich } from "@/i18n/rich";
import type { ContentLink } from "@/lib/portfolio/content";
import { designFormat, Marked, nameOf, OutLink, TemplateStyle } from "../parts";
import type { PortfolioTemplateProps } from "../types";
import type { NoteMeta } from "./islands";
import { NotesApp } from "./on-demand";
import { FOLIO_CSS } from "./styles";

// Ported from alanagoyal/alanagoyal's Notes app (MIT, see ./LICENSE.txt).

type Note = NoteMeta & { body: ReactNode };

function Link({ link, children }: { link: ContentLink | null; children: ReactNode }) {
  if (!link) return <>{children}</>;
  return <OutLink href={link.href}>{children}</OutLink>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="sec">
      <summary>
        <h2>{title}</h2>
      </summary>
      {children}
    </details>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  const shown = items.filter(Boolean);
  if (shown.length === 0) return null;
  return (
    <ul>
      {shown.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function plain(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function FolioTemplate({
  view,
  content,
  words,
  footer,
  resumeHref,
}: PortfolioTemplateProps) {
  const t = words.folio;
  const format = designFormat(view);
  const name = nameOf(view, words.shared.untitled);
  const place = content.location?.label || view.location;
  const headline = view.headline || content.headline;
  const dated = view.updatedAt > Date.UTC(2000, 0, 1);
  const stamp = dated
    ? format.date(view.updatedAt, {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : "";
  const short = dated ? format.date(view.updatedAt, { timeZone: "UTC" }) : "";
  const roleAt = (title: string, company: string, link: ContentLink | null) =>
    title ? (
      rich(
        t.about.roleAt,
        { link: (chunk) => <Link link={link}>{chunk}</Link> },
        { title, company },
      )
    ) : (
      <Link link={link}>{company}</Link>
    );
  const lower = (title: string, fallback: string) => (title || fallback).toLowerCase();

  const current = content.experience.filter((role) => role.current);
  const past = content.experience.filter((role) => !role.current);
  const notes: Note[] = [];

  const aboutText = content.about.join(" ");
  notes.push({
    id: "about-me",
    emoji: "📍",
    title: t.notes.aboutMe,
    pinned: true,
    preview: plain(fmt(t.about.myName.replace(/<\/?b>/g, ""), { name }), aboutText),
    text: plain(name, headline, aboutText, place),
    body: (
      <>
        <p>
          {rich(t.about.myName, {}, { name })}
          {current.length === 0 && headline ? <>, {headline}</> : null}
        </p>
        {content.aboutParts.map((parts, index) => (
          <p key={index}>
            <Marked parts={parts} />
          </p>
        ))}
        {current.length > 0 || place || content.availability ? (
          <Section title={t.about.currently}>
            <Bullets
              items={[
                ...current.map((role) => <>{roleAt(role.title, role.company, role.website)}</>),
                place ? <>{fmt(t.about.basedIn, { place })}</> : null,
                content.availability ? <>{content.availability.text.toLowerCase()}</> : null,
              ]}
            />
          </Section>
        ) : null}
        {past.length > 0 || content.education.length > 0 ? (
          <Section title={t.about.previously}>
            <Bullets
              items={[
                ...past.map((role) => (
                  <>
                    {roleAt(role.title, role.company || role.title, role.website)}
                    {role.start ? ` (${role.start.replace(/\D*(\d{4}).*/, "$1")})` : null}
                  </>
                )),
                ...content.education.map((school) => (
                  <>
                    {rich(
                      school.degree ? t.about.studiedAt : t.about.studied,
                      { link: (chunk) => <Link link={school.website}>{chunk}</Link> },
                      { degree: school.degree, school: school.school },
                    )}
                  </>
                )),
              ]}
            />
          </Section>
        ) : null}
      </>
    ),
  });

  const socials = content.socials.filter((social) => social.kind !== "email");
  if (content.email || content.phone || socials.length > 0 || resumeHref)
    notes.push({
      id: "quick-links",
      emoji: "📎",
      title: t.notes.quickLinks,
      pinned: true,
      preview: plain(
        content.email ? `${t.links.email} - ${content.email}` : null,
        resumeHref ? t.links.resume : null,
        ...socials.map((social) => `${social.label.toLowerCase()} - ${social.handle}`),
      ),
      text: plain(content.email, ...socials.map((social) => `${social.label} ${social.handle}`)),
      body: (
        <Bullets
          items={[
            content.email ? (
              <>
                {t.links.email} - <a href={`mailto:${content.email}`}>{content.email}</a>
              </>
            ) : null,
            content.phone ? (
              <>
                {t.links.phone} -{" "}
                <a href={`tel:${content.phone.replace(/[^\d+]/g, "")}`}>{content.phone}</a>
              </>
            ) : null,
            resumeHref ? (
              <>
                {t.links.resume} - <a href={resumeHref}>{t.links.resumeLink}</a>
              </>
            ) : null,
            ...socials.map((social) => (
              <>
                {social.label.toLowerCase()} -{" "}
                <OutLink href={social.href}>{social.handle || social.label}</OutLink>
              </>
            )),
          ]}
        />
      ),
    });

  if (content.experience.length > 0)
    notes.push({
      id: "experience",
      emoji: "💼",
      title: lower(view.titles.experience, t.notes.experience),
      pinned: false,
      preview: plain(
        ...content.experience.map((role) => `${role.company || role.title} - ${role.title}`),
      ),
      text: plain(
        ...content.experience.map((role) =>
          plain(role.company, role.title, role.summary, ...role.lines),
        ),
      ),
      body: content.experience.map((role) => (
        <Section key={role.id} title={role.company || role.title}>
          <p className="meta">
            {[role.company ? role.title : "", role.dates, role.location]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {role.summary ? <p>{role.summary}</p> : null}
          <Bullets items={role.lines} />
          {role.tags.length > 0 ? (
            <p className="meta">{fmt(t.stack, { list: role.tags.join(", ") })}</p>
          ) : null}
        </Section>
      )),
    });

  if (content.projects.length > 0)
    notes.push({
      id: "projects",
      emoji: "🛠️",
      title: lower(view.titles.projects, t.notes.projects),
      pinned: false,
      preview: plain(...content.projects.map((project) => project.name)),
      text: plain(
        ...content.projects.map((project) =>
          plain(project.name, project.description, project.line, ...project.lines),
        ),
      ),
      body: content.projects.map((project) => {
        const lead = project.description || project.line;
        const lines = project.lines.filter((line) => line !== lead);
        const link = project.website ?? project.source;
        return (
          <Section key={project.id} title={project.name}>
            {project.years || project.category ? (
              <p className="meta">
                {[project.category, project.years].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            {lead ? <p>{lead}</p> : null}
            <Bullets
              items={[
                ...lines,
                project.outcome || null,
                link ? (
                  <>
                    <OutLink href={link.href}>{link.text}</OutLink>
                  </>
                ) : null,
              ]}
            />
            {project.tech.length > 0 ? (
              <p className="meta">{fmt(t.stack, { list: project.tech.join(", ") })}</p>
            ) : null}
          </Section>
        );
      }),
    });

  const skills = view.skills.filter((skill) => skill.items.length > 0);
  if (skills.length > 0)
    notes.push({
      id: "skills",
      emoji: "🧰",
      title: lower(view.titles.skills, t.notes.skills),
      pinned: false,
      preview: plain(...skills.flatMap((skill) => skill.items).slice(0, 12)),
      text: plain(...skills.map((skill) => plain(skill.label, ...skill.items))),
      body: (
        <Bullets
          items={skills.map((skill) => (
            <>
              {skill.label ? <strong>{skill.label.toLowerCase()}</strong> : null}
              {skill.label ? " - " : null}
              {skill.items.join(", ")}
            </>
          ))}
        />
      ),
    });

  if (content.education.length > 0)
    notes.push({
      id: "education",
      emoji: "🎓",
      title: lower(view.titles.education, t.notes.education),
      pinned: false,
      preview: plain(...content.education.map((school) => `${school.school} ${school.degree}`)),
      text: plain(
        ...content.education.map((school) => plain(school.school, school.degree, ...school.lines)),
      ),
      body: content.education.map((school) => (
        <Section key={school.id} title={school.school || school.degree}>
          <p className="meta">
            {[school.school ? school.degree : "", school.dates].filter(Boolean).join(" · ")}
          </p>
          <Bullets items={school.lines} />
        </Section>
      )),
    });

  if (content.writing.length > 0)
    notes.push({
      id: "writing",
      emoji: "✍️",
      title: t.notes.writing,
      pinned: false,
      preview: plain(...content.writing.map((post) => post.title)),
      text: plain(...content.writing.map((post) => plain(post.title, post.publisher))),
      body: (
        <Bullets
          items={content.writing.map((post) => (
            <>
              {post.href ? <OutLink href={post.href}>{post.title}</OutLink> : post.title}
              {[post.date, post.minutes ? fmt(t.minutes, { minutes: post.minutes }) : ""]
                .filter(Boolean)
                .map((part) => ` - ${part}`)
                .join("")}
            </>
          ))}
        />
      ),
    });

  if (content.talks.length > 0)
    notes.push({
      id: "talks",
      emoji: "🎤",
      title: t.notes.talks,
      pinned: false,
      preview: plain(...content.talks.map((talk) => talk.title)),
      text: plain(...content.talks.map((talk) => plain(talk.title, talk.event, talk.place))),
      body: (
        <Bullets
          items={content.talks.map((talk) => {
            const href = talk.href ?? talk.recording ?? talk.slides;
            return (
              <>
                {href ? <OutLink href={href}>{talk.title}</OutLink> : talk.title}
                {[talk.event, talk.date].filter(Boolean).length > 0
                  ? ` - ${[talk.event, talk.date].filter(Boolean).join(", ")}`
                  : null}
              </>
            );
          })}
        />
      ),
    });

  const honours = [
    ...content.milestones.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      href: milestone.href,
      rest: [milestone.result || milestone.detail, milestone.date].filter(Boolean).join(", "),
    })),
    ...view.certifications.map((cert) => ({
      id: cert.id,
      title: cert.name,
      href: null,
      rest: [cert.issuer, cert.date].filter(Boolean).join(", "),
    })),
  ];
  if (honours.length > 0)
    notes.push({
      id: "milestones",
      emoji: "🏆",
      title: content.milestones.length > 0 ? t.notes.milestones : t.notes.certifications,
      pinned: false,
      preview: plain(...honours.map((item) => item.title)),
      text: plain(...honours.map((item) => plain(item.title, item.rest))),
      body: (
        <Bullets
          items={honours.map((item) => (
            <>
              {item.href ? <OutLink href={item.href}>{item.title}</OutLink> : item.title}
              {item.rest ? ` - ${item.rest}` : null}
            </>
          ))}
        />
      ),
    });

  if (content.now && content.now.items.length > 0)
    notes.push({
      id: "now",
      emoji: "🌱",
      title: t.notes.now,
      pinned: false,
      preview: plain(...content.now.items.map((item) => `${item.label}: ${item.text}`)),
      text: plain(...content.now.items.map((item) => plain(item.label, item.text))),
      body: (
        <Bullets
          items={content.now.items.map((item) => (
            <>
              <strong>{item.label.toLowerCase()}</strong> - {item.text}
            </>
          ))}
        />
      ),
    });

  // Kind words often name employers, so they hide along with About.
  if (content.testimonials.length > 0 && !view.hidden.includes("about"))
    notes.push({
      id: "kind-words",
      emoji: "💬",
      title: t.notes.kindWords,
      pinned: false,
      preview: plain(...content.testimonials.map((quote) => `"${quote.quote}"`)),
      text: plain(...content.testimonials.map((quote) => plain(quote.quote, quote.name))),
      body: content.testimonials.map((quote) => (
        <blockquote key={quote.id}>
          <p>&ldquo;{quote.quote}&rdquo;</p>
          <p>
            - {quote.href ? <OutLink href={quote.href}>{quote.name}</OutLink> : quote.name}
            {quote.role ? `, ${quote.role}` : null}
          </p>
        </blockquote>
      )),
    });

  if (content.shelf.length > 0)
    notes.push({
      id: "reading-list",
      emoji: "📚",
      title: t.notes.readingList,
      pinned: false,
      preview: plain(...content.shelf.map((item) => item.title)),
      text: plain(...content.shelf.map((item) => plain(item.title, item.by))),
      body: (
        <Bullets
          items={content.shelf.map((item) => (
            <>
              {item.href ? <OutLink href={item.href}>{item.title}</OutLink> : item.title}
              {item.by ? ` ${fmt(t.by, { by: item.by })}` : null}
            </>
          ))}
        />
      ),
    });

  if (content.interests.length > 0)
    notes.push({
      id: "off-the-clock",
      emoji: "🎧",
      title: t.notes.offTheClock,
      pinned: false,
      preview: plain(...content.interests.map((item) => item.title)),
      text: plain(...content.interests.map((item) => plain(item.title, item.line))),
      body: (
        <Bullets
          items={content.interests.map((item) => (
            <>
              <strong>{item.title.toLowerCase()}</strong>
              {item.line ? ` - ${item.line}` : null}
            </>
          ))}
        />
      ),
    });

  for (const extra of view.extras) {
    if (extra.items.length === 0) continue;
    notes.push({
      id: `extra-${extra.id}`,
      emoji: "🗂️",
      title: extra.title.toLowerCase(),
      pinned: false,
      preview: plain(...extra.items.map((item) => item.title)),
      text: plain(
        ...extra.items.map((item) => plain(item.title, item.subtitle, item.detail, ...item.lines)),
      ),
      body: extra.items.map((item) => (
        <Section key={item.id} title={item.title || item.subtitle}>
          {[item.title ? item.subtitle : "", item.date].filter(Boolean).length > 0 ? (
            <p className="meta">
              {[item.title ? item.subtitle : "", item.date].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {item.detail ? <p>{item.detail}</p> : null}
          <Bullets items={item.lines} />
        </Section>
      )),
    });
  }

  return (
    <div className="pf-folio">
      <TemplateStyle css={FOLIO_CSS} />
      <h1 className="sr-only">{name}</h1>
      <NotesApp
        notes={notes.map(({ id, emoji, title, pinned, preview, text }) => ({
          id,
          emoji,
          title,
          pinned,
          preview,
          text,
        }))}
        bodies={notes.map((note) => (
          <Fragment key={note.id}>{note.body}</Fragment>
        ))}
        updatedAt={dated ? view.updatedAt : null}
        stamp={stamp}
        short={short}
        locale={format.locale}
        words={t.app}
        footer={footer}
      />
    </div>
  );
}
