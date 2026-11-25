import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Code,
  Eye,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Mic,
  NotebookPen,
  PenLine,
  Rocket,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { fmt, selectPlural } from "@/i18n/format";
import type { ContentProject } from "@/lib/portfolio/content";
import { SocialIcon } from "../icons";
import {
  contactHref,
  designLocale,
  featuredFirst,
  Marked,
  nameOf,
  OutLink,
  TemplateStyle,
} from "../parts";
import type { DesignWords, PortfolioTemplateProps } from "../types";
import type { CardPanel, FilterItem } from "./islands";
import { Filtered, MoreInfo, Pages } from "./on-demand";
import { CARD_CSS } from "./styles";

// Ported from codewithsadee/vcard-personal-portfolio (MIT, see ./LICENSE.txt). Its memoji
// avatars, photographs and client logos are not used: initials and drawn tiles stand in.

type Words = DesignWords["card"];

const SKILL_BARS = 8;

const DOING: [RegExp, LucideIcon][] = [
  [/build|ship|mak|launch/i, Rocket],
  [/read/i, BookOpen],
  [/learn|study/i, GraduationCap],
  [/writ|blog/i, PenLine],
  [/talk|speak/i, Mic],
  [/cod|work|engineer|develop/i, Code],
];

const doingIcon = (label: string): LucideIcon =>
  DOING.find(([pattern]) => pattern.test(label))?.[1] ?? Sparkles;

function IconBox({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="icon-box" aria-hidden>
      <Icon />
    </span>
  );
}

function ServiceIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="service-icon-box" aria-hidden>
      <Icon />
    </span>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <h2 className="h2 article-title">{children}</h2>;
}

function groupOf(project: ContentProject, t: Words): string {
  return project.category.split(/\s*[·/|]\s*/)[0]?.trim() || t.projects;
}

function ProjectTile({ project, t }: { project: ContentProject; t: Words }) {
  const href = project.website?.href ?? project.source?.href ?? null;
  const inner = (
    <>
      <figure className="project-img">
        <span className="project-item-icon-box" aria-hidden>
          <Eye />
        </span>
        <span className="tile" aria-hidden>
          <span className="tile-mark">{project.monogram}</span>
          <span className="tile-line">{project.line || project.name}</span>
        </span>
      </figure>
      <h3 className="project-title">{project.name}</h3>
      <p className="project-category">
        {[project.category || t.project, project.years].filter(Boolean).join(" · ")}
      </p>
    </>
  );
  return href ? (
    <OutLink href={href} className="project-link">
      {inner}
    </OutLink>
  ) : (
    <div className="project-link">{inner}</div>
  );
}

export function CardTemplate({ view, content, words, footer, resumeHref }: PortfolioTemplateProps) {
  const t = words.card;
  const locale = designLocale(view);
  const name = nameOf(view, words.shared.untitled);
  const headline = content.headline || view.headline;
  const aboutShown = !view.hidden.includes("about");
  const socials = content.socials.filter((social) => social.kind !== "email");
  const hello = contactHref(content);
  const projects = featuredFirst(content.projects);
  const doing = aboutShown ? (content.now?.items ?? []) : [];
  const testimonials = aboutShown ? content.testimonials : [];
  const companies = [...new Set(content.experience.map((job) => job.company).filter(Boolean))];
  const bars = content.skills
    .flatMap((group) => group.items)
    .filter((item) => (item.years ?? 0) > 0)
    .sort((a, b) => (b.years ?? 0) - (a.years ?? 0))
    .slice(0, SKILL_BARS);
  const longest = Math.max(1, ...bars.map((item) => item.years ?? 0));
  const place = content.location?.label || view.location;
  const timeline = [
    content.education.length > 0 && {
      key: "education",
      title: view.titles.education || t.education,
      icon: BookOpen,
      items: content.education.map((school) => ({
        id: school.id,
        title: school.school || school.degree,
        sub: school.school ? school.degree : "",
        dates: school.dates,
        lines: school.lines,
      })),
    },
    content.experience.length > 0 && {
      key: "experience",
      title: view.titles.experience || t.experience,
      icon: BriefcaseBusiness,
      items: content.experience.map((job) => ({
        id: job.id,
        title: [job.title, job.company].filter(Boolean).join(" · "),
        sub: [job.highlight, job.location].filter(Boolean).join(" · "),
        dates: job.dates,
        lines: job.summary ? [job.summary, ...job.lines] : job.lines,
      })),
    },
    view.certifications.length > 0 && {
      key: "certifications",
      title: view.titles.certifications || t.certifications,
      icon: FileText,
      items: view.certifications.map((cert) => ({
        id: cert.id,
        title: cert.name,
        sub: cert.issuer,
        dates: cert.date,
        lines: [],
      })),
    },
    ...view.extras.map((section) => ({
      key: `x-${section.id}`,
      title: section.title,
      icon: NotebookPen,
      items: section.items.map((item) => ({
        id: item.id,
        title: item.title || item.detail,
        sub: item.title ? [item.subtitle, item.detail].filter(Boolean).join(" · ") : item.subtitle,
        dates: item.date,
        lines: item.lines,
      })),
    })),
  ].filter((block) => block !== false);

  const panels: CardPanel[] = [];

  panels.push({
    id: "about",
    label: t.nav.about,
    body: (
      <>
        <header>
          <Title>{t.aboutMe}</Title>
        </header>
        {content.about.length > 0 || content.pitch ? (
          <section className="about-text">
            {content.about.length > 0 ? (
              content.aboutParts.map((parts, i) => (
                <p key={i}>
                  <Marked parts={parts} />
                </p>
              ))
            ) : (
              <p>{content.pitch}</p>
            )}
          </section>
        ) : null}
        {doing.length > 0 || content.disciplines.length > 0 ? (
          <section className="service">
            <h3 className="h3 service-title">{t.doing}</h3>
            <ul className="service-list">
              {doing.length > 0
                ? doing.map((item) => (
                    <li className="service-item" key={item.label}>
                      <ServiceIcon icon={doingIcon(item.label)} />
                      <div>
                        <h4 className="h4 service-item-title">{item.label}</h4>
                        <p className="service-item-text">{item.text}</p>
                      </div>
                    </li>
                  ))
                : content.disciplines.map((discipline) => (
                    <li className="service-item" key={discipline}>
                      <ServiceIcon icon={doingIcon(discipline)} />
                      <div>
                        <h4 className="h4 service-item-title">{discipline}</h4>
                      </div>
                    </li>
                  ))}
            </ul>
          </section>
        ) : null}
        {testimonials.length > 0 ? (
          <section className="testimonials">
            <h3 className="h3 testimonials-title">{t.testimonials}</h3>
            <ul className="testimonials-list">
              {testimonials.map((quote) => (
                <li className="testimonials-item" key={quote.id}>
                  <figure className="content-card">
                    <span className="testimonials-avatar-box" aria-hidden>
                      {quote.initials}
                    </span>
                    <figcaption className="h4 testimonials-item-title">
                      <OutLink href={quote.href}>{quote.name}</OutLink>
                      {quote.role ? <span className="testimonials-role">{quote.role}</span> : null}
                    </figcaption>
                    <blockquote className="testimonials-text">{quote.quote}</blockquote>
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {companies.length > 0 ? (
          <section className="clients">
            <h3 className="h3 clients-title">{t.worked}</h3>
            <ul className="clients-list">
              {companies.map((company, i) => (
                <li className="clients-item" key={company} data-style={i % 3}>
                  {company}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </>
    ),
  });

  if (timeline.length > 0 || content.skills.length > 0)
    panels.push({
      id: "resume",
      label: t.nav.resume,
      body: (
        <>
          <header className="title-row">
            <Title>{t.nav.resume}</Title>
            {resumeHref ? (
              <a className="form-btn small" href={resumeHref}>
                <FileText aria-hidden />
                <span>{t.fullResume}</span>
              </a>
            ) : null}
          </header>
          {timeline.map((block) => (
            <section className="timeline" key={block.key}>
              <div className="title-wrapper">
                <IconBox icon={block.icon} />
                <h3 className="h3">{block.title}</h3>
              </div>
              <ol className="timeline-list">
                {block.items.map((item) => (
                  <li className="timeline-item" key={item.id}>
                    <h4 className="h4 timeline-item-title">{item.title}</h4>
                    {item.dates ? <span className="dates">{item.dates}</span> : null}
                    {item.sub ? <p className="timeline-sub">{item.sub}</p> : null}
                    {item.lines.map((line, i) => (
                      <p className="timeline-text" key={i}>
                        {line}
                      </p>
                    ))}
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {content.skills.length > 0 ? (
            <section className="skill">
              <h3 className="h3 skills-title">{t.mySkills}</h3>
              <div className="skills-list content-card">
                {bars.length > 0 ? (
                  <ul>
                    {bars.map((item) => (
                      <li className="skills-item" key={item.name}>
                        <div className="title-wrapper">
                          <h5 className="h5">{item.name}</h5>
                          <data value={item.years ?? 0}>
                            {fmt(selectPlural(locale, t.years, item.years ?? 0), {
                              count: item.years ?? 0,
                            })}
                          </data>
                        </div>
                        <div className="skill-progress-bg">
                          <div
                            className="skill-progress-fill"
                            style={{
                              width: `${Math.max(12, Math.round(((item.years ?? 0) / longest) * 100))}%`,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <dl className="skill-groups">
                  {content.skills.map((group) => (
                    <div key={group.id}>
                      <dt>{group.label || t.skills}</dt>
                      <dd>{group.items.map((item) => item.name).join(", ")}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          ) : null}
        </>
      ),
    });

  if (projects.length > 0) {
    const items: FilterItem[] = projects.map((project) => ({
      id: project.id,
      category: groupOf(project, t),
      body: <ProjectTile project={project} t={t} />,
    }));
    panels.push({
      id: "portfolio",
      label:
        view.titles.projects && view.titles.projects !== "Projects"
          ? view.titles.projects
          : t.nav.portfolio,
      body: (
        <>
          <header>
            <Title>{t.nav.portfolio}</Title>
          </header>
          <section className="projects">
            <Filtered
              items={items}
              categories={[...new Set(items.map((item) => item.category))]}
              all={t.all}
            />
          </section>
        </>
      ),
    });
  }

  const posts = [
    ...content.writing.map((post) => ({
      id: post.id,
      kind: post.publisher || t.writing,
      date: post.date,
      title: post.title,
      text: post.minutes ? fmt(t.minuteRead, { count: post.minutes }) : "",
      href: post.href,
    })),
    ...content.talks.map((talk) => ({
      id: talk.id,
      kind: t.talk,
      date: talk.date,
      title: talk.title,
      text: [talk.event, talk.place].filter(Boolean).join(", "),
      href: talk.href ?? talk.recording ?? talk.slides,
    })),
  ];
  if (posts.length > 0)
    panels.push({
      id: "blog",
      label: content.writing.length > 0 ? t.nav.blog : t.nav.talks,
      body: (
        <>
          <header>
            <Title>{content.writing.length > 0 ? t.nav.blog : t.nav.talks}</Title>
          </header>
          <ul className="blog-posts-list">
            {posts.map((post) => {
              const inner = (
                <>
                  <figure className="blog-banner-box" aria-hidden>
                    <span className="banner-year">
                      {/\b(?:19|20)\d{2}\b/.exec(post.date)?.[0] ?? "—"}
                    </span>
                    <span className="banner-kind">{post.kind}</span>
                  </figure>
                  <div className="blog-content">
                    <div className="blog-meta">
                      <p className="blog-category">{post.kind}</p>
                      {post.date ? (
                        <>
                          <span className="dot" aria-hidden />
                          <time>{post.date}</time>
                        </>
                      ) : null}
                    </div>
                    <h3 className="h3 blog-item-title">{post.title}</h3>
                    {post.text ? <p className="blog-text">{post.text}</p> : null}
                  </div>
                </>
              );
              return (
                <li className="blog-post-item" key={post.id}>
                  {post.href ? (
                    <OutLink href={post.href} className="blog-link">
                      {inner}
                    </OutLink>
                  ) : (
                    <div className="blog-link">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ),
    });

  if (hello || place)
    panels.push({
      id: "contact",
      label: t.nav.contact,
      body: (
        <>
          <header>
            <Title>{t.nav.contact}</Title>
          </header>
          {place ? (
            <section className="mapbox" aria-label={t.location}>
              <span className="map-grid" aria-hidden />
              <span className="map-pin" aria-hidden>
                <MapPin />
              </span>
              <p className="map-place">{place}</p>
              {content.availability ? (
                <p className="map-note">{content.availability.text}</p>
              ) : null}
            </section>
          ) : null}
          {hello ? (
            <section className="contact-form">
              <h3 className="h3 form-title">{t.sayHello}</h3>
              <ul className="form-rows">
                {content.email ? (
                  <li>
                    <a className="form-input" href={`mailto:${content.email}`}>
                      <Mail aria-hidden />
                      <span>{content.email}</span>
                    </a>
                  </li>
                ) : null}
                {socials.map((social) => (
                  <li key={social.href}>
                    <OutLink href={social.href} className="form-input">
                      <SocialIcon kind={social.kind} className="social-svg" />
                      <span>{social.handle || social.label}</span>
                    </OutLink>
                  </li>
                ))}
              </ul>
              <OutLink href={hello} className="form-btn">
                <Mail aria-hidden />
                <span>{content.email ? t.sendMessage : t.getInTouch}</span>
              </OutLink>
            </section>
          ) : null}
        </>
      ),
    });

  const details = [
    content.email && {
      icon: Mail,
      title: t.details.email,
      body: (
        <a className="contact-link" href={`mailto:${content.email}`}>
          {content.email}
        </a>
      ),
    },
    content.phone && {
      icon: Smartphone,
      title: t.details.phone,
      body: (
        <a className="contact-link" href={`tel:${content.phone.replace(/[^\d+]/g, "")}`}>
          {content.phone}
        </a>
      ),
    },
    content.availability && {
      icon: CalendarDays,
      title: t.details.status,
      body: (
        <p className="contact-link">{content.availability.short || content.availability.text}</p>
      ),
    },
    place && { icon: MapPin, title: t.details.location, body: <address>{place}</address> },
    resumeHref && {
      icon: FileText,
      title: t.details.resume,
      body: (
        <a className="contact-link" href={resumeHref}>
          {t.readResume}
        </a>
      ),
    },
  ].filter((item) => Boolean(item)) as { icon: LucideIcon; title: string; body: ReactNode }[];

  return (
    <div className="pf-card">
      <TemplateStyle css={CARD_CSS} />
      <div className="main">
        <aside className="sidebar" aria-label={t.profile}>
          <div className="sidebar-info">
            <figure className="avatar-box" aria-hidden>
              <span>{content.initials || name.slice(0, 1)}</span>
            </figure>
            <div className="info-content">
              <h1 className="name" title={name}>
                {name}
              </h1>
              {headline ? <p className="title">{headline}</p> : null}
            </div>
          </div>
          {details.length > 0 || socials.length > 0 ? (
            <MoreInfo show={t.showContacts} hide={t.hideContacts}>
              <div className="separator" />
              {details.length > 0 ? (
                <ul className="contacts-list">
                  {details.map((item) => (
                    <li className="contact-item" key={item.title}>
                      <IconBox icon={item.icon} />
                      <div className="contact-info">
                        <p className="contact-title">{item.title}</p>
                        {item.body}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {details.length > 0 && socials.length > 0 ? <div className="separator" /> : null}
              {socials.length > 0 ? (
                <ul className="social-list">
                  {socials.map((social) => (
                    <li className="social-item" key={social.href}>
                      <OutLink href={social.href} className="social-link" label={social.label}>
                        <SocialIcon kind={social.kind} className="social-svg" />
                      </OutLink>
                    </li>
                  ))}
                </ul>
              ) : null}
            </MoreInfo>
          ) : null}
        </aside>
        <Pages panels={panels} label={t.pages} />
      </div>
      {footer ? <footer className="credit">{footer}</footer> : null}
    </div>
  );
}
