import { emptyResume, type Resume } from "@/lib/resume/schema";
import {
  PortfolioContentSchema,
  type GitHubStats,
  type PortfolioContent,
  type PortfolioContentView,
  type UploadedImage,
} from "../content";
import { contentView } from "../content-view";
import { portfolioView, type PortfolioView } from "../view";

// Fixture for tests and template previews: Jordan Ellis, the made-up person of the approved
// round-2 samples (../portfolio-samples/v2/_src/data.mjs), as a resume, a filled-in content
// document (everything "beyond resume" in data.mjs) and GitHub numbers. Pictures are uploads
// under a fixed fake account; pass the folder they're served from as `mediaBase`.

export const JORDAN_USER_ID = "00000000-0000-4000-8000-0000000000e1";
const NOW = Date.UTC(2026, 10, 8);

const b = (id: string, text: string) => ({ id, text });

export function jordanV2Resume(): Resume {
  return {
    ...emptyResume(NOW),
    id: "resume-jordan-v2",
    title: "Jordan Ellis",
    basics: {
      name: "Jordan Ellis",
      headline: "Full-stack engineer",
      email: "hello@jordanellis.dev",
      phone: "",
      location: "Lisbon, Portugal",
      links: [
        { id: "l1", label: "GitHub", url: "https://github.com/jordanellis" },
        { id: "l2", label: "LinkedIn", url: "https://linkedin.com/in/jordan-ellis" },
        { id: "l3", label: "X", url: "https://x.com/jordanbuilds" },
        { id: "l4", label: "Website", url: "https://jordanellis.dev" },
      ],
    },
    summary:
      "I build fast, calm software for teams that move money and data, from the Postgres schema to the last pixel. Seven years shipping product end to end. Today I'm a senior engineer at Ledgerly, where 1.4 million payouts a month run on a pipeline I rebuilt.\n\nOpen to senior full-stack roles from January 2027.",
    experience: [
      {
        id: "e1",
        company: "Ledgerly",
        title: "Senior Software Engineer",
        location: "Lisbon · Remote",
        startDate: "Mar 2023",
        endDate: "Present",
        bullets: [
          b(
            "e1b1",
            "Rebuilt the payouts pipeline on Postgres and SQS; failed payouts fell 72% at 1.4M payouts a month.",
          ),
          b(
            "e1b2",
            "Cut dashboard p95 load from 3.1s to 0.9s with streamed rendering and batched queries.",
          ),
          b("e1b3", "Mentor four engineers and run the team's RFC process."),
        ],
      },
      {
        id: "e2",
        company: "Tripwise",
        title: "Software Engineer",
        location: "Berlin",
        startDate: "Jun 2020",
        endDate: "Feb 2023",
        bullets: [
          b(
            "e2b1",
            "Shipped an offline-first itinerary editor used by 300K people a month (React, IndexedDB, CRDT sync).",
          ),
          b("e2b2", "Merged six services behind one GraphQL gateway shared by web and mobile."),
          b("e2b3", "Raised booking conversion 11% with an A/B-tested checkout."),
        ],
      },
      {
        id: "e3",
        company: "Northwind Studio",
        title: "Frontend Developer",
        location: "Manchester, UK",
        startDate: "Aug 2018",
        endDate: "May 2020",
        bullets: [
          b(
            "e3b1",
            "Built 20+ client sites on a shared component library; every one scored 95+ on Lighthouse.",
          ),
          b(
            "e3b2",
            "Introduced visual regression tests that caught 40+ layout bugs before launch.",
          ),
        ],
      },
    ],
    projects: [
      {
        id: "tally",
        name: "Tally",
        link: "https://github.com/jordanellis/tally",
        bullets: [
          b(
            "p1b1",
            "Privacy-first product analytics you can self-host in one command. 600+ sites, 38 contributors.",
          ),
        ],
      },
      {
        id: "shiftboard",
        name: "Shiftboard",
        link: "https://shiftboard.app",
        bullets: [
          b(
            "p2b1",
            "Rota planning for small restaurants, with swaps staff can do from their phone. 140 paying venues, $3.1K MRR.",
          ),
        ],
      },
      {
        id: "pgsnap",
        name: "pgsnap",
        link: "https://github.com/jordanellis/pgsnap",
        bullets: [
          b(
            "p3b1",
            "Snapshot and branch Postgres databases for tests in seconds. Used in CI at 300+ teams.",
          ),
        ],
      },
      {
        id: "platform9",
        name: "Platform 9",
        link: "https://github.com/jordanellis/platform9",
        bullets: [
          b("p4b1", "Live Lisbon metro departures that still work underground. 12K monthly users."),
        ],
      },
      {
        id: "tab",
        name: "Tab",
        link: "https://github.com/jordanellis/tab",
        bullets: [
          b(
            "p5b1",
            "Snap a restaurant receipt, tap who had what, and everyone gets a payment link. Won Best Fintech Hack at Lisbon Hack Week.",
          ),
        ],
      },
    ],
    education: [
      {
        id: "ed1",
        school: "University of Manchester",
        degree: "BSc",
        field: "Computer Science, First-class honours",
        location: "Manchester",
        startDate: "2015",
        endDate: "2018",
        bullets: [],
      },
    ],
    skills: [
      { id: "s1", label: "Languages", items: ["TypeScript", "SQL", "Go", "Python"] },
      {
        id: "s2",
        label: "Frontend",
        items: ["React", "Next.js", "CSS / Tailwind", "React Native"],
      },
      { id: "s3", label: "Backend", items: ["Node.js", "PostgreSQL", "GraphQL", "Redis", "Kafka"] },
      { id: "s4", label: "Infra", items: ["AWS", "Docker", "Terraform", "GitHub Actions"] },
    ],
  };
}

let counter = 0;
function shot(alt: string, width = 2400, height = 1500): UploadedImage {
  counter += 1;
  const id = `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
  return { kind: "upload", id, key: `${JORDAN_USER_ID}/${id}.webp`, width, height, alt };
}

export function jordanContent(): PortfolioContent {
  counter = 0;
  return PortfolioContentSchema.parse({
    photo: shot("Jordan Ellis", 1024, 1024),
    pitch:
      "I build fast, calm software for teams that move money and data, from the Postgres schema to the last pixel.",
    intro:
      "Seven years shipping product end to end. Today I'm a senior engineer at Ledgerly, where 1.4 million payouts a month run on a pipeline I rebuilt.",
    disciplines: ["Full-stack engineer", "Postgres tinkerer", "Product builder"],
    availability: {
      open: true,
      text: "Open to senior full-stack roles from January 2027",
      short: "Available Jan 2027",
    },
    location: { label: "Lisbon, Portugal", timezone: "Europe/Lisbon", lat: 38.7223, lng: -9.1393 },
    about: [
      "I started out building agency sites in Manchester, moved to Berlin to work on a travel app half a million people planned trips with, and now live in Lisbon working on payments.",
      "The work I like best sits where product and infrastructure meet: a slow dashboard, a flaky payout, an editor that has to work on a train. I write things down, measure before and after, and leave systems calmer than I found them.",
    ],
    highlights: ["Manchester", "Berlin", "Lisbon", "measure before and after"],
    now: [
      { id: "n1", label: "Building", text: "Shiftboard v2: shift swaps that settle themselves" },
      { id: "n2", label: "Reading", text: "Designing Data-Intensive Applications, 2nd ed." },
      { id: "n3", label: "Learning", text: "Portuguese (B1) and outdoor bouldering" },
    ],
    nowUpdatedAt: NOW,
    stats: [
      { id: "st1", value: "7", label: "years shipping product" },
      { id: "st2", value: "1.4M", label: "payouts a month on my pipeline" },
      { id: "st3", value: "4.2k", label: "GitHub stars on Tally" },
      { id: "st4", value: "300K", label: "monthly users served at Tripwise" },
    ],
    projects: [
      {
        id: "tally",
        category: "Open source · analytics",
        years: "2024 — Now",
        featured: true,
        line: "Privacy-first product analytics you can self-host in one command.",
        description:
          "A cookie-free analytics dashboard on ClickHouse. One Docker command to run, a 2 KB script to install, and no consent banner needed.",
        outcome: "4.2k stars · 600+ sites · 38 contributors",
        tech: ["TypeScript", "Next.js", "ClickHouse", "Docker"],
        website: "https://tally.dev",
        images: [shot("Tally dashboard"), shot("Tally setup screen")],
        device: "browser",
      },
      {
        id: "shiftboard",
        category: "SaaS · side business",
        years: "2025 — Now",
        featured: true,
        line: "Rota planning for small restaurants, with swaps staff can do from their phone.",
        description:
          "Drag-and-drop weekly rotas, labour cost against forecast sales, and shift swaps that need one tap from a manager.",
        outcome: "140 paying venues · $3.1K MRR",
        tech: ["React", "Node.js", "PostgreSQL", "Stripe"],
        source: "",
        images: [shot("Shiftboard weekly rota", 1170, 2532)],
        device: "phone",
      },
      {
        id: "pgsnap",
        category: "Open source · CLI",
        years: "2023",
        line: "Snapshot and branch Postgres databases for tests in seconds.",
        description:
          "Copy-on-write snapshots so every test run gets a fresh database. A 2.3 GB database branches in under two seconds.",
        outcome: "1.9k stars · used in CI at 300+ teams",
        tech: ["Go", "PostgreSQL", "ZFS"],
        images: [shot("pgsnap in a terminal")],
      },
      {
        id: "platform9",
        category: "PWA · transit",
        years: "2022",
        line: "Live Lisbon metro departures that still work underground.",
        description:
          "A tiny offline-first web app with live departures and delays for every Lisbon metro station. Loads in 0.4s on 3G.",
        outcome: "12K monthly users · 0.4s load on 3G",
        tech: ["TypeScript", "Service Workers", "Cloudflare Workers"],
        website: "https://platform9.pt",
        video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
      {
        id: "tab",
        category: "Hackathon · winner",
        years: "2024",
        line: "Snap a restaurant receipt, tap who had what, and everyone gets a payment link.",
        description:
          "Built in 48 hours: receipt OCR, per-item splitting, and payment links. Won Best Fintech Hack at Lisbon Hack Week.",
        outcome: "1st of 120 teams · 48 hours",
        tech: ["React Native", "Vision API", "Stripe"],
        roles: ["Mobile", "Payments"],
      },
    ],
    jobs: {
      e1: {
        highlight: "-72% failed payouts",
        summary:
          "Own the payouts platform that pays 60,000 freelancers and small firms across Europe.",
        type: "Fintech · invoicing and payouts",
        website: "https://ledgerly.example",
        logo: shot("Ledgerly", 128, 128),
        tags: ["TypeScript", "Next.js", "Node.js", "PostgreSQL", "Redis", "AWS"],
      },
      e2: {
        summary: "Built the itinerary editor and the API layer behind web and mobile.",
        type: "Consumer · travel planning",
        website: "https://tripwise.example",
        logo: shot("Tripwise", 128, 128),
        tags: ["React", "GraphQL", "Node.js", "Go", "Kafka"],
      },
      e3: {
        summary: "Built sites and small products for 20+ clients.",
        type: "Agency · web and product",
        website: "https://northwind.example",
        logo: shot("Northwind Studio", 128, 128),
        tags: ["JavaScript", "React", "Gatsby", "Sass", "Contentful"],
      },
    },
    schools: { ed1: { website: "https://manchester.ac.uk" } },
    skillYears: {
      typescript: 7,
      sql: 7,
      go: 3,
      python: 2,
      react: 7,
      "next.js": 5,
      "node.js": 6,
      postgresql: 6,
    },
    milestones: [
      {
        id: "m1",
        kind: "launch",
        date: "2026",
        title: "Tally passes 4,000 GitHub stars",
        detail: "Open source",
      },
      {
        id: "m2",
        kind: "talk",
        date: "2025",
        title: "Speaker: Postgres as a queue, Lisbon Node meetup",
      },
      {
        id: "m3",
        kind: "hackathon",
        date: "2024",
        title: "Best Fintech Hack, Lisbon Hack Week",
        place: "Lisbon",
        result: "1st of 120",
      },
      {
        id: "m4",
        kind: "press",
        date: "2023",
        title: "pgsnap featured in a Postgres weekly newsletter",
      },
    ],
    talks: [
      {
        id: "t1",
        title: "Postgres as a queue",
        event: "Lisbon Node meetup",
        date: "Oct 2025",
        place: "Lisbon, Portugal",
        slides: "https://jordanellis.dev/talks/postgres-queue",
      },
    ],
    writing: [
      {
        id: "w1",
        title: "Postgres is a fine queue (until it isn't)",
        url: "https://jordanellis.dev/writing/postgres-queue",
        date: "Sep 2026",
        minutes: 8,
      },
      {
        id: "w2",
        title: "What 1.4 million payouts taught me about idempotency",
        url: "https://jordanellis.dev/writing/idempotency",
        date: "Jun 2026",
        minutes: 11,
      },
      {
        id: "w3",
        title: "Shipping an offline-first editor without losing your mind",
        url: "https://jordanellis.dev/writing/offline-first",
        date: "Jan 2026",
        minutes: 9,
      },
    ],
    testimonials: [
      {
        id: "q1",
        quote:
          "Jordan is the engineer you hand the scary migration to. He ships it, writes it up, and nobody gets paged.",
        name: "Maya Okafor",
        role: "VP Engineering, Ledgerly",
      },
      {
        id: "q2",
        quote:
          "He turned our checkout from a guess into a measured system. Conversion went up and stayed up.",
        name: "Tomás Ferreira",
        role: "Product Lead, Tripwise",
      },
    ],
    interests: [
      {
        id: "i1",
        title: "Bouldering",
        stat: "V5",
        line: "Projecting V5 at the local wall, outdoors at Sintra when it's dry.",
      },
      {
        id: "i2",
        title: "Film photography",
        stat: "36 exp",
        line: "A 35mm camera and one roll of Portra a month.",
      },
      {
        id: "i3",
        title: "Road cycling",
        stat: "64 km",
        line: "The Sintra loop on Sundays: 64 km, 1,120 m of climbing.",
      },
      {
        id: "i4",
        title: "Home espresso",
        stat: "1:2.2",
        line: "Dialling in light roasts: 18 g in, 40 g out, 28 seconds.",
      },
    ],
    shelf: [
      {
        id: "b1",
        kind: "book",
        title: "Designing Data-Intensive Applications",
        by: "Martin Kleppmann",
      },
      {
        id: "b2",
        kind: "book",
        title: "The Pragmatic Programmer",
        by: "David Thomas, Andrew Hunt",
      },
      { id: "b3", kind: "album", title: "Kind of Blue", by: "Miles Davis" },
    ],
    photos: [
      {
        id: "ph1",
        image: shot("Bouldering at Sintra", 1600, 1200),
        caption: "Sintra, on a dry day",
      },
      { id: "ph2", image: shot("A roll of Portra", 1200, 1600), caption: "One roll a month" },
      { id: "ph3", image: shot("Espresso", 1600, 1600), caption: "18 g in, 40 g out" },
    ],
  });
}

export function jordanGitHub(): GitHubStats {
  const repo = (
    name: string,
    stars: number,
    language: string,
    description: string,
    pushedAt: string,
    homepage = "",
  ) => ({
    name,
    fullName: `jordanellis/${name}`,
    url: `https://github.com/jordanellis/${name}`,
    description,
    homepage,
    language,
    topics: [],
    stars,
    forks: Math.round(stars / 12),
    pushedAt,
  });
  return {
    username: "jordanellis",
    name: "Jordan Ellis",
    avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
    bio: "Full-stack engineer. Postgres, TypeScript, calm software.",
    followers: 812,
    publicRepos: 41,
    totalStars: 6_430,
    languages: [
      { name: "TypeScript", repos: 22, percent: 58 },
      { name: "Go", repos: 8, percent: 21 },
      { name: "SQL", repos: 4, percent: 11 },
      { name: "Python", repos: 4, percent: 10 },
    ],
    repos: [
      repo(
        "tally",
        4_200,
        "TypeScript",
        "Privacy-first product analytics you can self-host in one command.",
        "2026-11-02T10:00:00Z",
        "https://tally.dev",
      ),
      repo(
        "pgsnap",
        1_900,
        "Go",
        "Snapshot and branch Postgres databases for tests in seconds.",
        "2026-08-20T10:00:00Z",
      ),
      repo(
        "platform9",
        210,
        "TypeScript",
        "Live Lisbon metro departures that still work underground.",
        "2026-03-11T10:00:00Z",
        "https://platform9.pt",
      ),
      repo("tab", 64, "TypeScript", "Split a receipt in one tap.", "2024-05-01T10:00:00Z"),
    ],
    activity: {
      lastActiveAt: "2026-11-07T18:30:00Z",
      events90d: 214,
      weeks: [12, 18, 9, 22, 15, 19, 25, 14, 17, 21, 16, 26],
      recent: [
        { repo: "jordanellis/tally", kind: "push", at: "2026-11-07T18:30:00Z" },
        { repo: "jordanellis/pgsnap", kind: "release", at: "2026-10-28T09:00:00Z" },
      ],
    },
    joinedAt: "2014-03-02T12:00:00Z",
    fetchedAt: NOW,
  };
}

/**
 * Jordan's page as a template draws it, for previews where the reader has no resume of their own
 * (the landing page, an account without one). The default media folder is public/portfolio-
 * fixtures, which holds the stand-in pictures under the fixture's upload keys.
 */
export function jordanPage({ mediaBase = "/portfolio-fixtures/" }: { mediaBase?: string } = {}): {
  view: PortfolioView;
  content: PortfolioContentView;
} {
  const view = portfolioView(jordanV2Resume(), {
    showEmail: true,
    showPhone: false,
    hiddenSections: [],
  });
  return {
    view,
    content: contentView({
      view,
      content: jordanContent(),
      github: jordanGitHub(),
      mediaBase,
      now: NOW,
    }),
  };
}

/** Everything a rich template draws for Jordan, ready to render. */
export function jordanContentView({
  mediaBase = "/portfolio-fixtures/",
}: { mediaBase?: string } = {}): PortfolioContentView {
  return jordanPage({ mediaBase }).content;
}
