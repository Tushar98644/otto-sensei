import { emptyResume, type Resume } from "@/lib/resume/schema";
import {
  PortfolioContentSchema,
  type GitHubStats,
  type PortfolioContent,
  type PortfolioContentView,
} from "../content";
import { contentView } from "../content-view";
import { portfolioView, type PortfolioView } from "../view";

// Fixture for tests and template previews: Jordan Ellis, the made-up person of the approved
// round-2 samples (../portfolio-samples/v2/_src/data.mjs), as a resume, a filled-in content
// document and GitHub numbers. It fills every section any design draws (TEMPLATE_USES), so the
// sample page shows what a design looks like with everything in it.
//
// Text only, like every real page (owner decision 2026-11-10): no photo, screenshots, logos or
// video. The designs draw initials, monograms and patterns from these words instead.

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
      {
        id: "e4",
        company: "Brightline",
        title: "Software Engineering Intern",
        location: "Leeds, UK",
        startDate: "Jun 2017",
        endDate: "Sep 2017",
        bullets: [
          b(
            "e4b1",
            "Built the usage-alerts service that warned 18,000 households about spikes in their energy use.",
          ),
          b(
            "e4b2",
            "Moved the nightly meter import from cron scripts to a queue; it went from 3 hours to 25 minutes.",
          ),
        ],
      },
      {
        id: "e5",
        company: "Paperplane Coffee",
        title: "Web Developer (part-time)",
        location: "Manchester, UK",
        startDate: "Sep 2016",
        endDate: "May 2018",
        bullets: [
          b(
            "e5b1",
            "Built and ran the roastery's online shop while at university; coffee subscriptions grew from 0 to 900.",
          ),
          b("e5b2", "Printed shipping labels straight from new orders, saving six hours a week."),
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
      {
        id: "quayside",
        name: "Quayside",
        link: "https://github.com/jordanellis/quayside",
        bullets: [
          b(
            "p6b1",
            "Open-source status pages and uptime checks for small teams. 900+ status pages hosted.",
          ),
        ],
      },
      {
        id: "inkwell",
        name: "Inkwell",
        link: "https://github.com/jordanellis/inkwell",
        bullets: [
          b(
            "p7b1",
            "A markdown-first blog engine that builds 400 posts to plain HTML in 0.6 seconds.",
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
        bullets: [
          b("ed1b1", "Dissertation: offline editing that syncs without conflicts, built on CRDTs."),
          b("ed1b2", "Ran the computing society's weekly build night for two years."),
        ],
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
      {
        id: "s5",
        label: "Practices",
        items: ["Testing", "Accessibility", "Observability", "Technical writing"],
      },
    ],
  };
}

export function jordanContent(): PortfolioContent {
  return PortfolioContentSchema.parse({
    pitch:
      "I build fast, calm software for teams that move money and data, from the Postgres schema to the last pixel.",
    intro:
      "Seven years shipping product end to end. Today I'm a senior engineer at Ledgerly, where 1.4 million payouts a month run on a pipeline I rebuilt.",
    disciplines: [
      "Full-stack engineer",
      "Postgres tinkerer",
      "Product builder",
      "Open-source maintainer",
    ],
    availability: {
      open: true,
      text: "Open to senior full-stack roles from January 2027",
      short: "Available Jan 2027",
    },
    location: { label: "Lisbon, Portugal", timezone: "Europe/Lisbon", lat: 38.7223, lng: -9.1393 },
    about: [
      "I started out building agency sites in Manchester, moved to Berlin to work on a travel app half a million people planned trips with, and now live in Lisbon working on payments.",
      "The work I like best sits where product and infrastructure meet: a slow dashboard, a flaky payout, an editor that has to work on a train. I write things down, measure before and after, and leave systems calmer than I found them.",
      "Outside work I keep a few open-source tools alive, write a post every month or two, and spend weekends on a bouldering wall or a road bike in the hills above the city.",
    ],
    highlights: ["Manchester", "Berlin", "Lisbon", "measure before and after"],
    now: [
      { id: "n1", label: "Building", text: "Shiftboard v2: shift swaps that settle themselves" },
      { id: "n2", label: "Reading", text: "Designing Data-Intensive Applications, 2nd ed." },
      { id: "n3", label: "Learning", text: "Portuguese (B1) and outdoor bouldering" },
      { id: "n4", label: "Writing", text: "A post on Postgres migrations with no downtime" },
    ],
    nowUpdatedAt: NOW,
    stats: [
      { id: "st1", value: "7", label: "years shipping product" },
      { id: "st2", value: "1.4M", label: "payouts a month on my pipeline" },
      { id: "st3", value: "9.4k", label: "GitHub stars across my projects" },
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
        details: [
          "Tally started as a weekend fix for my own blog: I wanted to know which posts people read without putting a cookie banner in front of them.",
          "Events go straight into ClickHouse from a 2 KB script. Daily rollups keep the dashboard fast at 50 million events a month on one small server.",
          "The hardest part was the install. One Docker command now brings up the database, the collector and the dashboard, and upgrades run themselves.",
        ],
        outcome: "4.2k stars · 600+ sites · 38 contributors",
        tech: ["TypeScript", "Next.js", "ClickHouse", "Docker"],
        roles: ["Design", "Full stack", "Maintainer"],
        website: "https://tally.dev",
        device: "laptop",
      },
      {
        id: "shiftboard",
        category: "SaaS · side business",
        years: "2025 — Now",
        featured: true,
        line: "Rota planning for small restaurants, with swaps staff can do from their phone.",
        description:
          "Drag-and-drop weekly rotas, labour cost against forecast sales, and shift swaps that need one tap from a manager.",
        details: [
          "A friend ran a small restaurant and planned the week on a whiteboard, photographed into a group chat. Shiftboard is the tool she wished she had.",
          "Swaps are the heart of it: staff offer a shift, a teammate takes it, and the app checks hours and cover before the manager taps approve.",
        ],
        outcome: "140 paying venues · $3.1K MRR",
        tech: ["React", "Node.js", "PostgreSQL", "Stripe"],
        roles: ["Product", "Full stack"],
        source: "",
        device: "phone",
      },
      {
        id: "quayside",
        category: "Open source · monitoring",
        years: "2025 — Now",
        line: "Open-source status pages and uptime checks for small teams.",
        description:
          "Uptime checks from three regions, a public status page and incident updates by email. Self-host it, or use the hosted version for $9 a month.",
        details: [
          "Every check runs from three regions, and a site only counts as down when two agree, so one flaky network never pages anyone at 3 a.m.",
          "Status pages are static files rebuilt on each change, so they stay up even when the thing they report on doesn't.",
        ],
        outcome: "2.1k stars · 900+ status pages",
        tech: ["Go", "TypeScript", "PostgreSQL", "Redis"],
        device: "laptop",
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
      },
      {
        id: "inkwell",
        category: "Open source · publishing",
        years: "2021 — Now",
        line: "A markdown-first blog engine that builds a whole site in under a second.",
        description:
          "Write in markdown, push to Git, and get plain HTML with no client-side JavaScript. It runs jordanellis.dev and a few hundred other blogs.",
        outcome: "850 stars · 400 posts built in 0.6s",
        tech: ["Go", "Markdown", "HTML"],
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
        device: "phone",
      },
    ],
    jobs: {
      e1: {
        highlight: "-72% failed payouts",
        summary:
          "Own the payouts platform that pays 60,000 freelancers and small firms across Europe.",
        type: "Fintech · invoicing and payouts",
        website: "https://ledgerly.example",
        tags: ["TypeScript", "Next.js", "Node.js", "PostgreSQL", "Redis", "AWS"],
      },
      e2: {
        highlight: "300K monthly users",
        summary: "Built the itinerary editor and the API layer behind web and mobile.",
        type: "Consumer · travel planning",
        website: "https://tripwise.example",
        tags: ["React", "GraphQL", "Node.js", "Go", "Kafka"],
      },
      e3: {
        highlight: "20+ client sites",
        summary: "Built sites and small products for 20+ clients.",
        type: "Agency · web and product",
        website: "https://northwind.example",
        tags: ["JavaScript", "React", "Gatsby", "Sass", "Contentful"],
      },
      e4: {
        highlight: "3 hours to 25 minutes",
        summary: "A summer on the data team of a home-energy start-up.",
        type: "Energy · smart meter data",
        website: "https://brightline.example",
        tags: ["Python", "PostgreSQL", "Celery"],
      },
      e5: {
        highlight: "900 subscribers",
        summary: "Built and ran the online shop for a small coffee roastery while studying.",
        type: "Retail · coffee roastery",
        website: "https://paperplane.example",
        tags: ["JavaScript", "Node.js", "Stripe"],
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
      "react native": 2,
      "node.js": 6,
      postgresql: 6,
      graphql: 4,
      redis: 5,
      kafka: 3,
      aws: 6,
      docker: 6,
      terraform: 3,
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
        kind: "launch",
        date: "2025",
        title: "Quayside 1.0 released",
        detail: "Open source",
      },
      {
        id: "m3",
        kind: "talk",
        date: "2025",
        title: "Speaker: Postgres as a queue, Lisbon Node meetup",
      },
      {
        id: "m4",
        kind: "hackathon",
        date: "2024",
        title: "Best Fintech Hack, Lisbon Hack Week",
        place: "Lisbon",
        result: "1st of 120",
      },
      {
        id: "m5",
        kind: "award",
        date: "2024",
        title: "Engineering award for the payouts rebuild",
        detail: "Voted by the engineering team at work",
      },
      {
        id: "m6",
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
      {
        id: "t2",
        title: "Idempotency keys in practice",
        event: "Payments engineering day",
        date: "May 2026",
        place: "Amsterdam, Netherlands",
        recording: "https://jordanellis.dev/talks/idempotency",
      },
      {
        id: "t3",
        title: "Self-hosting analytics on one small server",
        event: "Open source evening",
        date: "Feb 2026",
        place: "Lisbon, Portugal",
        slides: "https://jordanellis.dev/talks/self-hosted-analytics",
      },
      {
        id: "t4",
        title: "Offline-first without the tears",
        event: "Berlin frontend meetup",
        date: "Mar 2022",
        place: "Berlin, Germany",
        recording: "https://jordanellis.dev/talks/offline-first",
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
      {
        id: "w4",
        title: "Status pages should stay up when you don't",
        url: "https://jordanellis.dev/writing/status-pages",
        date: "Oct 2025",
        minutes: 6,
      },
      {
        id: "w5",
        title: "A 2 KB analytics script, byte by byte",
        url: "https://jordanellis.dev/writing/small-script",
        date: "Apr 2025",
        minutes: 7,
      },
      {
        id: "w6",
        title: "Labour cost is the only number a rota needs",
        url: "https://jordanellis.dev/writing/labour-cost",
        date: "Nov 2024",
        minutes: 5,
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
      {
        id: "q3",
        quote:
          "His RFCs are the docs we actually read. Half of our runbooks started as something Jordan wrote down.",
        name: "Lena Hoffmann",
        role: "Staff Engineer, Tripwise",
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
        line: "A 35mm camera and one roll of colour film a month.",
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
      {
        id: "i5",
        title: "Learning Portuguese",
        stat: "B1",
        line: "Two evening classes a week and far too many podcasts.",
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
      { id: "b4", kind: "book", title: "A Philosophy of Software Design", by: "John Ousterhout" },
      { id: "b5", kind: "book", title: "Thinking in Systems", by: "Donella H. Meadows" },
      { id: "b6", kind: "album", title: "In Rainbows", by: "Radiohead" },
      { id: "b7", kind: "book", title: "The Design of Everyday Things", by: "Don Norman" },
      { id: "b8", kind: "album", title: "Blue", by: "Joni Mitchell" },
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
    bio: "Full-stack engineer. Postgres, TypeScript, calm software.",
    followers: 812,
    publicRepos: 41,
    totalStars: 9_420,
    languages: [
      { name: "TypeScript", repos: 22, percent: 54 },
      { name: "Go", repos: 10, percent: 26 },
      { name: "SQL", repos: 4, percent: 10 },
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
        "quayside",
        2_100,
        "Go",
        "Open-source status pages and uptime checks for small teams.",
        "2026-10-30T10:00:00Z",
      ),
      repo(
        "pgsnap",
        1_900,
        "Go",
        "Snapshot and branch Postgres databases for tests in seconds.",
        "2026-08-20T10:00:00Z",
      ),
      repo(
        "inkwell",
        850,
        "Go",
        "A markdown-first blog engine that builds a whole site in under a second.",
        "2026-09-14T10:00:00Z",
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
        { repo: "jordanellis/quayside", kind: "pull", at: "2026-11-04T12:00:00Z" },
        { repo: "jordanellis/pgsnap", kind: "release", at: "2026-10-28T09:00:00Z" },
      ],
    },
    joinedAt: "2014-03-02T12:00:00Z",
    fetchedAt: NOW,
  };
}

/**
 * Jordan's page as a template draws it: the sample page of the previews (the landing page, the
 * "Sample page" side of the preview switch, an account without a resume).
 */
export function jordanPage(): { view: PortfolioView; content: PortfolioContentView } {
  const view = portfolioView(jordanV2Resume(), {
    showEmail: true,
    showPhone: false,
    hiddenSections: [],
  });
  const content = contentView({
    view,
    content: jordanContent(),
    github: jordanGitHub(),
    now: NOW,
  });
  return { view, content };
}

/** Everything a rich template draws for Jordan, ready to render. */
export function jordanContentView(): PortfolioContentView {
  return jordanPage().content;
}
