import {
  ArrowUpRight,
  Award,
  Box,
  BriefcaseBusiness,
  ChevronsUpDown,
  CodeXml,
  Crown,
  GraduationCap,
  Infinity as Ongoing,
  Lightbulb,
  Link as LinkIcon,
  Mail,
  MapPin,
  Mic,
  Newspaper,
  PenLine,
  Phone,
  Rocket,
  Star,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ContentRole, MilestoneKind } from "@/lib/portfolio/content";
import { SocialIcon } from "../icons";
import { Marked, nameOf, OutLink, safeId, TemplateStyle } from "../parts";
import type { PortfolioTemplateProps } from "../types";
import { Greeting, IsoMark, LocalTime, Logotype, ShowMore, Taglines, ThemeToggle } from "./islands";
import { DimensionLine, WidthDimension } from "./dimension";
import { flatPaths, isoPaths, pixelText, ROWS } from "./pixel";
import { CV_CSS } from "./styles";

// Ported from ncdai/chanhdai.com (MIT, see ./LICENSE.txt).

const PREFIX = "pf-cv";
const SHOWN = { companies: 3, rows: 4 };

function Tile({ children }: { children: ReactNode }) {
  return (
    <span className="tile" aria-hidden>
      {children}
    </span>
  );
}

function Panel({
  id,
  title,
  count,
  children,
  className,
}: {
  id?: string;
  title?: string;
  count?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={className ? `panel ${className}` : "panel"}>
      {title ? (
        <header className="panel-hd">
          <h2 className="panel-title">
            {id ? <a href={`#${id}`}>{title}</a> : title}
            {count && count > 1 ? <sup>({count})</sup> : null}
          </h2>
        </header>
      ) : null}
      {children}
    </section>
  );
}

function Separator({ children }: { children?: ReactNode }) {
  return (
    <div className="sep" aria-hidden>
      {children}
    </div>
  );
}

function Tags({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="tags">
      {items.map((item) => (
        <li key={item}>
          <span className="tag">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Lines({ lead, lines }: { lead?: string; lines: readonly string[] }) {
  return (
    <div className="typeset">
      {lead ? <p>{lead}</p> : null}
      {lines.length > 0 ? (
        <ul>
          {lines.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const ONGOING = /^(present|now|current|today|ongoing)$/i;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function monthIndex(text: string, end: boolean, now: Date): number | null {
  const value = text.trim();
  if (!value || ONGOING.test(value))
    return end ? now.getUTCFullYear() * 12 + now.getUTCMonth() : null;
  const year = /(\d{4})/.exec(value)?.[1];
  if (!year) return null;
  const named = MONTHS.findIndex((month) => value.toLowerCase().includes(month));
  const numbered = /^(\d{1,2})[./-]\d{4}$/.exec(value)?.[1];
  const month = named >= 0 ? named : numbered ? Number(numbered) - 1 : end ? 11 : 0;
  return Number(year) * 12 + Math.min(Math.max(month, 0), 11);
}

function duration(start: string, end: string, current: boolean, now: Date): string {
  const from = monthIndex(start, false, now);
  const to = monthIndex(current && !end ? "Present" : end, true, now);
  if (from === null || to === null) return "";
  const months = to - from + 1;
  if (months <= 0) return "";
  if (months < 12) return `${months}m`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years}y ${rest}m` : `${years}y`;
}

function Period({ start, end, current }: { start: string; end: string; current?: boolean }) {
  const ongoing = current || ONGOING.test(end.trim());
  if (!start && !end) return null;
  if (!start || start === end) return <span>{end || start}</span>;
  return (
    <span className="period">
      <span>{start}</span>
      <span className="dash">—</span>
      {ongoing ? <Ongoing className="inf" aria-label="Present" /> : <span>{end}</span>}
    </span>
  );
}

function Meta({ items }: { items: ReactNode[] }) {
  const shown = items.filter(Boolean);
  if (shown.length === 0) return null;
  return (
    <span className="meta">
      <span className="meta-in">
        {shown.map((item, index) => (
          <span key={index} className="meta-item">
            {item}
          </span>
        ))}
      </span>
    </span>
  );
}

function JobTile({ title }: { title: string }) {
  return (
    <Tile>
      {/(developer|engineer|programmer)/i.test(title) ? (
        <CodeXml />
      ) : /founder/i.test(title) ? (
        <Lightbulb />
      ) : (
        <BriefcaseBusiness />
      )}
    </Tile>
  );
}

function Position({ role, open, now }: { role: ContentRole; open: boolean; now: Date }) {
  const hasBody = Boolean(role.summary) || role.lines.length > 0;
  const head = (
    <>
      <span className="pos-head">
        <JobTile title={role.title} />
        <span className="pos-title" role="heading" aria-level={4}>
          {role.title || role.company}
        </span>
        {hasBody ? <ChevronsUpDown className="chev" aria-hidden /> : null}
      </span>
      <Meta
        items={[
          role.start || role.end ? (
            <Period start={role.start} end={role.end} current={role.current} />
          ) : null,
          duration(role.start, role.end, role.current, now) || null,
        ]}
      />
    </>
  );
  return (
    <div className="pos">
      <span className="pos-end" aria-hidden />
      {hasBody ? (
        <details open={open}>
          <summary>{head}</summary>
          <div className="pos-body">
            <Lines lead={role.summary} lines={role.lines} />
          </div>
        </details>
      ) : (
        <div className="pos-static">{head}</div>
      )}
      <Tags items={role.tags} />
    </div>
  );
}

function companies(roles: readonly ContentRole[]): ContentRole[][] {
  const groups: ContentRole[][] = [];
  for (const role of roles) {
    const last = groups.at(-1);
    const key = role.company.trim().toLowerCase();
    if (last && key && last[0]!.company.trim().toLowerCase() === key) last.push(role);
    else groups.push([role]);
  }
  return groups;
}

function Company({ roles, first, now }: { roles: ContentRole[]; first: boolean; now: Date }) {
  const lead = roles[0]!;
  const current = roles.some((role) => role.current);
  const name = lead.company || lead.title;
  return (
    <div id={safeId(`${PREFIX}-xp`, lead.id)} className="company">
      <div className="company-head">
        <span className="company-logo" aria-hidden>
          {lead.monogram || name.slice(0, 1)}
        </span>
        <div className="company-text">
          <h3>
            {lead.website ? (
              <OutLink href={lead.website.href} className="link">
                {name}
              </OutLink>
            ) : (
              name
            )}
          </h3>
          {lead.location || current ? (
            <dl className="company-meta">
              {lead.location ? (
                <>
                  <dt className="sr-only">Location</dt>
                  <dd className="truncate">{lead.location}</dd>
                </>
              ) : null}
              {current ? (
                <>
                  <dt className="sr-only">Employment status</dt>
                  <dd>
                    <span className="sr-only">Current</span>
                    <span className="ping" aria-hidden>
                      <span />
                      <span />
                    </span>
                  </dd>
                </>
              ) : null}
            </dl>
          ) : null}
        </div>
      </div>
      <div className="positions">
        {roles.map((role, index) => (
          <Position key={role.id} role={role} open={first && index === 0} now={now} />
        ))}
      </div>
    </div>
  );
}

type RowItem = {
  id: string;
  title: string;
  tile: ReactNode;
  meta: ReactNode[];
  href: string | null;
  linkLabel: string;
  external?: boolean;
  body?: ReactNode;
};

function Row({ item }: { item: RowItem }) {
  const link = item.href ? (
    <OutLink href={item.href} className="row-link" label={item.linkLabel}>
      {item.external ? <ArrowUpRight aria-hidden /> : <LinkIcon aria-hidden />}
    </OutLink>
  ) : null;
  const main = (
    <span className="row-main">
      <span className="row-text">
        <span className="row-title" role="heading" aria-level={3}>
          {item.title}
        </span>
        <Meta items={item.meta} />
      </span>
      {link}
      {item.body ? <ChevronsUpDown className="chev" aria-hidden /> : null}
    </span>
  );
  return (
    <div className="row">
      {item.body ? (
        <details>
          <summary className="row-head">
            <span className="row-tile">
              <Tile>{item.tile}</Tile>
            </span>
            {main}
          </summary>
          <div className="row-body">{item.body}</div>
        </details>
      ) : (
        <div className="row-head">
          <span className="row-tile">
            <Tile>{item.tile}</Tile>
          </span>
          {main}
        </div>
      )}
    </div>
  );
}

function RowList({ items }: { items: RowItem[] }) {
  const head = items.slice(0, SHOWN.rows);
  const rest = items.slice(SHOWN.rows);
  return (
    <>
      <div className="rows">
        {head.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </div>
      {rest.length > 0 ? (
        <ShowMore>
          <div className="rows">
            {rest.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </div>
        </ShowMore>
      ) : null}
    </>
  );
}

const MILESTONE_ICONS: Record<MilestoneKind, ReactNode> = {
  award: <Crown />,
  hackathon: <Trophy />,
  launch: <Rocket />,
  press: <Newspaper />,
  talk: <Mic />,
  other: <Star />,
};
const MILESTONE_LABELS: Record<MilestoneKind, string> = {
  award: "Award",
  hackathon: "Hackathon",
  launch: "Launch",
  press: "Press",
  talk: "Talk",
  other: "Milestone",
};

function dateOf(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export function CvTemplate({ view, content, footer, resumeHref }: PortfolioTemplateProps) {
  const name = nameOf(view);
  const first = content.first || name.split(" ")[0] || name;
  const initials = (content.initials || name.slice(0, 1)).slice(0, 3);
  const now = new Date();
  const place = content.location?.label || view.location;
  const headline = view.headline || content.headline;
  const taglines =
    content.disciplines.length > 0 ? content.disciplines : headline ? [headline] : [];
  const socials = content.socials.filter((social) => social.kind !== "email");
  const current = content.experience.filter((role) => role.current);
  const skills = view.skills.filter((group) => group.items.length > 0);
  const groups = companies(content.experience);
  const titles = {
    stack: view.titles.skills || "Stack",
    experience: view.titles.experience || "Experience",
    education: view.titles.education || "Education",
    projects: view.titles.projects || "Projects",
  };

  const mark = flatPaths(pixelText(initials), 4);
  const markWidth = pixelText(initials).columns * 4;
  const iso = isoPaths(pixelText(initials), 64, 32);
  const avatar = flatPaths(pixelText(initials), 10);
  const avatarWidth = pixelText(initials).columns * 10;
  const word = pixelText(first.slice(0, 14));
  const logotype = flatPaths(word, 32);

  const ids = {
    stack: `${PREFIX}-stack`,
    experience: `${PREFIX}-experience`,
    education: `${PREFIX}-education`,
    projects: `${PREFIX}-projects`,
    recognition: `${PREFIX}-recognition`,
    writing: `${PREFIX}-writing`,
    talks: `${PREFIX}-talks`,
  };

  const overview: ReactNode[] = [
    ...current.map((role) => {
      return (
        <div key={role.id} className="ov-item wide">
          <JobTile title={role.title} />
          <p>
            {role.title ? (
              <>
                {role.title} <span aria-label="at">@</span>
              </>
            ) : null}
            <a className="link strong" href={`#${safeId(`${PREFIX}-xp`, role.id)}`}>
              {role.company}
            </a>
          </p>
        </div>
      );
    }),
    ...(current.length === 0 && headline
      ? [
          <div key="headline" className="ov-item wide">
            <JobTile title={headline} />
            <p>{headline}</p>
          </div>,
        ]
      : []),
    ...(place
      ? [
          <div key="place" className="ov-item">
            <Tile>
              <MapPin />
            </Tile>
            <p>
              <OutLink
                className="link"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`}
                label={`Location: ${place}`}
              >
                {place}
              </OutLink>
            </p>
          </div>,
        ]
      : []),
    ...(content.location?.timezone
      ? [<LocalTime key="time" timeZone={content.location.timezone} />]
      : []),
    ...(content.email
      ? [
          <div key="email" className="ov-item">
            <Tile>
              <Mail />
            </Tile>
            <p>
              <a className="link" href={`mailto:${content.email}`}>
                {content.email}
              </a>
            </p>
          </div>,
        ]
      : []),
    ...(content.phone
      ? [
          <div key="phone" className="ov-item">
            <Tile>
              <Phone />
            </Tile>
            <p>
              <a className="link" href={`tel:${content.phone.replace(/[^\d+]/g, "")}`}>
                {content.phone}
              </a>
            </p>
          </div>,
        ]
      : []),
  ];

  const projectRows: RowItem[] = content.projects.map((project) => {
    const lead = project.description || project.line;
    const lines = project.description ? project.lines.filter((line) => line !== lead) : [];
    const hasBody = Boolean(lead) || project.tech.length > 0 || Boolean(project.outcome);
    return {
      id: project.id,
      title: project.name,
      tile: <span className="mono-mark">{project.monogram || <Box />}</span>,
      meta: [project.years || project.category || null],
      href: project.website?.href ?? project.source?.href ?? null,
      linkLabel: `Open ${project.name}`,
      body: hasBody ? (
        <>
          {lead || lines.length > 0 ? <Lines lead={lead} lines={lines} /> : null}
          {project.outcome ? <p className="outcome">{project.outcome}</p> : null}
          <Tags items={project.tech} />
        </>
      ) : undefined,
    };
  });

  const recognitionRows: RowItem[] = [
    ...view.certifications.map((cert) => ({
      id: cert.id,
      title: cert.name,
      tile: <Award />,
      meta: ["Certificate", cert.issuer || null, cert.date || null],
      href: null,
      linkLabel: "",
    })),
    ...content.milestones.map((milestone) => {
      return {
        id: milestone.id,
        title: milestone.title,
        tile: MILESTONE_ICONS[milestone.kind],
        meta: [
          MILESTONE_LABELS[milestone.kind],
          milestone.result || milestone.detail || milestone.place || null,
          milestone.date || null,
        ],
        href: milestone.href,
        linkLabel: `Open ${milestone.title}`,
        external: true,
      };
    }),
  ];

  const writingRows: RowItem[] = content.writing.map((post) => ({
    id: post.id,
    title: post.title,
    tile: <PenLine />,
    meta: [post.date || null, post.minutes ? `${post.minutes} min read` : null],
    href: post.href,
    linkLabel: `Read ${post.title}`,
    external: true,
  }));

  const talkRows: RowItem[] = content.talks.map((talk) => ({
    id: talk.id,
    title: talk.title,
    tile: <Mic />,
    meta: [talk.event || null, talk.date || null],
    href: talk.href ?? talk.recording ?? talk.slides,
    linkLabel: `Open ${talk.title}`,
    external: true,
  }));

  const blocks: { key: string; node: ReactNode }[] = [];

  if (overview.length > 0 || socials.length > 0)
    blocks.push({
      key: "overview",
      node: (
        <>
          {overview.length > 0 ? (
            <Panel className="overview">
              <h2 className="sr-only">Overview</h2>
              <div className="panel-body ov-grid">{overview}</div>
              <span className="ov-rule" aria-hidden />
            </Panel>
          ) : null}
          {socials.length > 0 ? (
            <Panel className={overview.length > 0 ? "socials joined" : "socials"}>
              <h2 className="sr-only">Social links</h2>
              <div className="panel-body">
                <ul className="social-list">
                  {socials.map((social) => (
                    <li key={social.href}>
                      <OutLink href={social.href} className="sbtn" label={social.label}>
                        <SocialIcon kind={social.kind} />
                        <span className="tip" aria-hidden>
                          {social.label}
                          {social.handle ? ` (${social.handle})` : ""}
                        </span>
                      </OutLink>
                    </li>
                  ))}
                </ul>
              </div>
              <span className="note note-follow" aria-hidden>
                <span>follow me</span>
                <svg viewBox="0 0 40 40" className="arrow flip">
                  <path d="M34 4c1 15-5 26-21 30" />
                  <path d="m22 37-9-3 7.5-8" />
                </svg>
              </span>
            </Panel>
          ) : null}
        </>
      ),
    });

  // Numbers and kind words sit in the About block, so hiding About hides them too.
  const aboutShown = !view.hidden.includes("about");
  const stats = aboutShown ? content.stats : [];
  const quotes = aboutShown ? content.testimonials : [];
  const greetingPanel = content.aboutParts.length > 0;
  const extrasAfterHello = stats.length > 0 || quotes.length > 0;
  if (greetingPanel || extrasAfterHello)
    blocks.push({
      key: "hello",
      node: (
        <>
          {greetingPanel ? (
            <Panel className="hello">
              <header className="panel-hd">
                <h2 className="sr-only">About</h2>
                <Greeting />
              </header>
              <div className="panel-body">
                <div className="typeset">
                  <ul>
                    {content.aboutParts.map((parts, index) => (
                      <li key={index}>
                        <Marked parts={parts} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {extrasAfterHello ? <div className="inner-sep" aria-hidden /> : null}
            </Panel>
          ) : null}
          {stats.length > 0 ? (
            <Panel className="numbers">
              <h2 className="caps">By the numbers</h2>
              <dl className="panel-body num-list">
                {stats.map((stat) => (
                  <div key={`${stat.value}-${stat.label}`} className="num-row">
                    <dt>{stat.label}</dt>
                    <span className="leader" aria-hidden />
                    <dd>{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          ) : null}
          {quotes.length > 0 ? (
            <Panel className="quotes">
              <h2 className="caps">Kind words</h2>
              <ul className="quote-grid">
                {quotes.map((quote) => (
                  <li key={quote.id} className="quote">
                    <blockquote>{quote.quote}</blockquote>
                    <div className="quote-by">
                      <span className="quote-avatar" aria-hidden>
                        {quote.initials}
                      </span>
                      <span className="quote-who">
                        {quote.href ? (
                          <OutLink href={quote.href} className="link">
                            {quote.name}
                          </OutLink>
                        ) : (
                          <span>{quote.name}</span>
                        )}
                        {quote.role ? <span className="quote-role">{quote.role}</span> : null}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </>
      ),
    });

  if (skills.length > 0)
    blocks.push({
      key: "stack",
      node: (
        <Panel id={ids.stack} title={titles.stack}>
          <div className="stack">
            <span className="stack-rule" aria-hidden />
            {skills.map((group, index) => {
              const id = safeId(`${PREFIX}-stack`, group.id);
              return (
                <div key={group.id} className="stack-row">
                  <div id={id} className="stack-cat">
                    <span className="stack-index" aria-hidden>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {group.label || "Skills"}
                  </div>
                  <ul aria-labelledby={id} className="pills">
                    {group.items.map((item) => (
                      <li key={item}>
                        <span className="pill">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Panel>
      ),
    });

  if (groups.length > 0) {
    const head = groups.slice(0, SHOWN.companies);
    const rest = groups.slice(SHOWN.companies);
    blocks.push({
      key: "experience",
      node: (
        <Panel id={ids.experience} title={titles.experience}>
          <div className="xp">
            {head.map((roles, index) => (
              <Company key={roles[0]!.id} roles={roles} first={index === 0} now={now} />
            ))}
          </div>
          {rest.length > 0 ? (
            <ShowMore>
              <div className="xp">
                {rest.map((roles) => (
                  <Company key={roles[0]!.id} roles={roles} first={false} now={now} />
                ))}
              </div>
            </ShowMore>
          ) : null}
        </Panel>
      ),
    });
  }

  if (content.education.length > 0)
    blocks.push({
      key: "education",
      node: (
        <Panel id={ids.education} title={titles.education}>
          <div className="edu positions">
            {content.education.map((school) => {
              const hasBody = school.lines.length > 0;
              const head = (
                <>
                  <span className="pos-head">
                    <Tile>
                      <GraduationCap />
                    </Tile>
                    <span className="pos-title" role="heading" aria-level={3}>
                      {school.website ? (
                        <OutLink href={school.website.href} className="link">
                          {school.school || school.degree}
                        </OutLink>
                      ) : (
                        school.school || school.degree
                      )}
                    </span>
                    {hasBody ? <ChevronsUpDown className="chev" aria-hidden /> : null}
                  </span>
                  <Meta
                    items={[
                      school.start || school.end ? (
                        <Period start={school.start} end={school.end} />
                      ) : null,
                      school.school && school.degree ? school.degree : null,
                    ]}
                  />
                </>
              );
              return (
                <div key={school.id} className="pos">
                  <span className="pos-end" aria-hidden />
                  {hasBody ? (
                    <details>
                      <summary>{head}</summary>
                      <div className="pos-body">
                        <Lines lines={school.lines} />
                      </div>
                    </details>
                  ) : (
                    <div className="pos-static">{head}</div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      ),
    });

  if (projectRows.length > 0)
    blocks.push({
      key: "projects",
      node: (
        <Panel id={ids.projects} title={titles.projects} count={projectRows.length}>
          <RowList items={projectRows} />
        </Panel>
      ),
    });

  if (recognitionRows.length > 0)
    blocks.push({
      key: "recognition",
      node: (
        <Panel
          id={ids.recognition}
          title={
            view.certifications.length > 0 && content.milestones.length === 0
              ? view.titles.certifications || "Certifications"
              : "Recognition"
          }
          count={recognitionRows.length}
        >
          <RowList items={recognitionRows} />
        </Panel>
      ),
    });

  if (writingRows.length > 0)
    blocks.push({
      key: "writing",
      node: (
        <Panel id={ids.writing} title="Writing" count={writingRows.length}>
          <RowList items={writingRows} />
        </Panel>
      ),
    });

  if (talkRows.length > 0)
    blocks.push({
      key: "talks",
      node: (
        <Panel id={ids.talks} title="Talks" count={talkRows.length}>
          <RowList items={talkRows} />
        </Panel>
      ),
    });

  for (const extra of view.extras) {
    if (extra.items.length === 0) continue;
    blocks.push({
      key: extra.id,
      node: (
        <Panel id={safeId(PREFIX, extra.id)} title={extra.title} count={extra.items.length}>
          <RowList
            items={extra.items.map((item) => ({
              id: item.id,
              title: item.title || item.subtitle,
              tile: <span className="dot" />,
              meta: [item.title ? item.subtitle || null : null, item.date || null],
              href: null,
              linkLabel: "",
              body:
                item.detail || item.lines.length > 0 ? (
                  <Lines lead={item.detail} lines={item.lines} />
                ) : undefined,
            }))}
          />
        </Panel>
      ),
    });
  }

  const nav = [
    groups.length > 0 ? { href: `#${ids.experience}`, label: titles.experience } : null,
    projectRows.length > 0 ? { href: `#${ids.projects}`, label: titles.projects } : null,
    skills.length > 0 ? { href: `#${ids.stack}`, label: titles.stack } : null,
    writingRows.length > 0 ? { href: `#${ids.writing}`, label: "Writing" } : null,
  ].filter((item) => item !== null);

  const topSkills = skills.flatMap((group) => group.items).slice(0, 6);
  const updated = view.updatedAt > Date.UTC(2000, 0, 1) ? dateOf(view.updatedAt) : "";
  const fields: { key: string; label: string; wide?: boolean; value: ReactNode }[] = [
    { key: "by", label: "Crafted by", value: name },
    ...(place ? [{ key: "place", label: "Based in", value: place }] : []),
    ...(updated
      ? [{ key: "updated", label: "Updated", value: <time dateTime={updated}>{updated}</time> }]
      : []),
    { key: "type", label: "Typeface", value: "Geist" },
    ...(content.email
      ? [
          {
            key: "email",
            label: "Contact",
            wide: true,
            value: (
              <a className="link-underline" href={`mailto:${content.email}`}>
                {content.email}
              </a>
            ),
          },
        ]
      : []),
    ...(resumeHref
      ? [
          {
            key: "resume",
            label: "Resume",
            value: (
              <a className="link-underline" href={resumeHref}>
                Resume
              </a>
            ),
          },
        ]
      : []),
    ...(topSkills.length > 0
      ? [
          {
            key: "stack",
            label: "Stack",
            wide: true,
            value: (
              <ul className="field-list">
                {topSkills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            ),
          },
        ]
      : []),
    ...(socials.length > 0
      ? [
          {
            key: "links",
            label: "Elsewhere",
            wide: true,
            value: (
              <ul className="field-list">
                {socials.slice(0, 6).map((social) => (
                  <li key={social.href}>
                    <OutLink href={social.href} className="link-underline">
                      {social.label}
                    </OutLink>
                  </li>
                ))}
              </ul>
            ),
          },
        ]
      : []),
  ];
  const span = fields.reduce((total, field) => total + (field.wide ? 2 : 1), 0);
  const filler = (4 - (span % 4)) % 4;

  return (
    <div className="pf-cv">
      <TemplateStyle css={CV_CSS} />
      <header className="hd">
        <div className="hd-in">
          <a href="#pf-cv-top" className="mark" aria-label="Back to top">
            <svg viewBox={`0 0 ${markWidth} ${ROWS * 4}`} aria-hidden>
              <path d={mark.fill} />
            </svg>
          </a>
          <span className="grow" />
          {nav.length > 0 || resumeHref ? (
            <nav className="nav" aria-label="Sections">
              {nav.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
              {resumeHref ? <a href={resumeHref}>Resume</a> : null}
            </nav>
          ) : null}
          <span className="vsep" aria-hidden />
          <ThemeToggle />
        </div>
      </header>

      <div className="main" id="pf-cv-top">
        <div className="frame">
          <WidthDimension value="768" className="frame-dim" />

          <div className="profile">
            <figure className="cover">
              <IsoMark iso={iso} />
              <span className="note note-cursor" aria-hidden>
                <svg viewBox="0 0 40 40" className="arrow up">
                  <path d="M34 4c1 15-5 26-21 30" />
                  <path d="m22 37-9-3 7.5-8" />
                </svg>
                <span>follows your cursor</span>
              </span>
            </figure>
            <div className="avatar-col">
              <div className="avatar-row">
                <div className="avatar">
                  <svg viewBox={`-2 -2 ${avatarWidth + 4} ${ROWS * 10 + 4}`} aria-hidden>
                    <path className="avatar-fill" d={avatar.fill} />
                    <path className="avatar-line" d={avatar.outline} />
                  </svg>
                  <span className="avatar-ring" aria-hidden />
                  <span className="dim dia" aria-hidden>
                    <span className="ext t" />
                    <span className="ext b" />
                    <DimensionLine vertical value="Ø160" />
                  </span>
                </div>
              </div>
            </div>
            <div className="name-col">
              <div className="name-box">
                <div className="name-row">
                  <h1>{name}</h1>
                  {content.availability?.open ? (
                    <span className="open" title={content.availability.text}>
                      <span className="ping" aria-hidden>
                        <span />
                        <span />
                      </span>
                      <span className="sr-only">{content.availability.text}</span>
                    </span>
                  ) : null}
                </div>
                {taglines.length > 0 ? <Taglines items={taglines} /> : null}
              </div>
            </div>
          </div>

          {blocks.map((block, index) => (
            <div key={block.key} className="block">
              <Separator>
                {index === 0 ? (
                  <span className="dim sep-dim">
                    <span className="ext t" />
                    <span className="ext b" />
                    <DimensionLine vertical />
                    <span className="dim-value out">32</span>
                  </span>
                ) : null}
              </Separator>
              {block.node}
            </div>
          ))}
        </div>
      </div>

      <footer className="ft">
        <div className="frame">
          <div className="ft-stripe" aria-hidden />
          <div className="ft-title">
            <span className="outlined">{name}</span>
            {headline || content.pitch ? (
              <span className="ft-sub">{headline || content.pitch}</span>
            ) : null}
          </div>
          <dl className="colophon">
            {fields.map((field) => (
              <div key={field.key} className={field.wide ? "field wide" : "field"}>
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
            {Array.from({ length: filler }, (_, index) => (
              <div key={index} className="field" />
            ))}
          </dl>
        </div>
        <Logotype columns={word.columns} fill={logotype.fill} outline={logotype.outline} />
        {footer ? <div className="credit">{footer}</div> : null}
      </footer>
    </div>
  );
}
