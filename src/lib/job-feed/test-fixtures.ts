// Test-only. List answers in the shapes the five sources returned on 2026-11-08 (Vercel on
// Greenhouse, Spotify on Lever, Linear on Ashby, the Himalayas and Remote OK feeds), cut down to
// a few jobs with shortened text.

const ESCAPED =
  "&lt;div class=&quot;content-intro&quot;&gt;&lt;h2&gt;About Vercel:&lt;/h2&gt;&lt;p&gt;Vercel gives developers the tools to build and scale the web.&lt;/p&gt;&lt;/div&gt;" +
  "&lt;h3&gt;What you will do&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;Build our dashboard in React, Next.js and TypeScript.&lt;/li&gt;" +
  "&lt;li&gt;Own services in Node.js and Go on AWS.&lt;/li&gt;&lt;/ul&gt;" +
  "&lt;p&gt;You have 5+ years of experience shipping web products.&lt;/p&gt;" +
  "&lt;p&gt;This role is remote, open to candidates in Germany.&lt;/p&gt;";

export const GREENHOUSE_BOARD = {
  jobs: [
    {
      absolute_url: "https://job-boards.greenhouse.io/vercel/jobs/6231864004",
      data_compliance: [{ type: "gdpr", requires_consent: false }],
      internal_job_id: 5231382004,
      location: { name: "Remote - Germany" },
      metadata: [{ id: 18783104004, name: "Career Site Categories", value: "Engineering" }],
      id: 6231864004,
      updated_at: "2026-10-30T14:45:41-04:00",
      requisition_id: "R-00010",
      title: "Senior Software Engineer, Dashboard",
      company_name: "Vercel",
      first_published: "2026-10-22T11:22:01-04:00",
      language: "en",
      application_deadline: null,
      content: ESCAPED,
      departments: [{ id: 4085775004, name: "Engineering" }],
      offices: [{ id: 4035415004, name: "Remote - Germany", location: "Berlin, Germany" }],
    },
    {
      absolute_url: "https://job-boards.greenhouse.io/vercel/jobs/6231864005",
      location: { name: "San Francisco, CA" },
      id: 6231864005,
      updated_at: "2026-11-01T10:00:00-04:00",
      title: "Account Executive, Commercial",
      company_name: "Vercel",
      first_published: "2026-10-25T09:00:00-04:00",
      application_deadline: "2026-12-31",
      content: "&lt;p&gt;Sell Vercel to growing companies. You know Salesforce and MEDDICC.&lt;/p&gt;",
    },
    // No link: dropped.
    { id: 1, title: "Broken", absolute_url: null, content: "" },
  ],
  meta: { total: 3 },
};

export const LEVER_POSTINGS = [
  {
    additionalPlain: "The United States base range for this position is $87,069-$124,385 plus equity.",
    additional: "<div>The United States base range for this position is $87,069-$124,385 plus equity.</div>",
    categories: {
      commitment: "Permanent",
      department: "Engineering",
      location: "Stockholm",
      team: "Platform",
      allLocations: ["Stockholm", "London"],
    },
    createdAt: 1792767640768,
    descriptionPlain: "Spotify is looking for a backend engineer.",
    description: "<div><p>Spotify is looking for a backend engineer to join Platform.</p></div>",
    id: "2A55D6C9-C564-443A-BE3E-A3851DB5A93B",
    lists: [
      { text: "What You'll Do", content: "<li>Build services in Java and Scala.</li><li>Run them on Kubernetes.</li>" },
      { text: "Who You Are", content: "<li>You have 3+ years of experience with distributed systems.</li>" },
    ],
    text: "Backend Engineer, Platform",
    country: "SE",
    workplaceType: "hybrid",
    hostedUrl: "https://jobs.lever.co/spotify/2a55d6c9-c564-443a-be3e-a3851db5a93b",
    applyUrl: "https://jobs.lever.co/spotify/2a55d6c9-c564-443a-be3e-a3851db5a93b/apply",
  },
  { id: "x", text: "No link", hostedUrl: "javascript:alert(1)" },
];

export const ASHBY_BOARD = {
  apiVersion: "1",
  jobs: [
    {
      id: "D3BC1CED-3CE4-4086-A050-555055DBB1FF",
      title: "Senior / Staff Fullstack Engineer",
      department: "Product",
      team: "Engineering",
      employmentType: "FullTime",
      location: "Europe",
      secondaryLocations: [{ location: "North America" }],
      publishedAt: "2026-04-27T20:13:45.158+00:00",
      isListed: true,
      isRemote: true,
      workplaceType: "Remote",
      jobUrl: "https://jobs.ashbyhq.com/linear/d3bc1ced-3ce4-4086-a050-555055dbb1ff",
      applyUrl: "https://jobs.ashbyhq.com/linear/d3bc1ced-3ce4-4086-a050-555055dbb1ff/application",
      descriptionHtml:
        "<p>At Linear, we're building the product development system for teams.</p><ul><li><p>Build features end to end in TypeScript, React and PostgreSQL.</p></li><li><p>Work with GraphQL and Node.js.</p></li></ul>",
      descriptionPlain: "At Linear, we're building the product development system for teams.",
    },
    {
      id: "0a000000-0000-4000-8000-000000000000",
      title: "Hidden role",
      isListed: false,
      jobUrl: "https://jobs.ashbyhq.com/linear/0a000000-0000-4000-8000-000000000000",
      descriptionHtml: "<p>Only by link.</p>",
    },
  ],
};

export const HIMALAYAS_PAGE = {
  comments: "Cursor pagination is now available.",
  updatedAt: 1794066876,
  offset: 0,
  limit: 20,
  totalCount: 116388,
  nextCursor: "MjAyNi0xMS0wN1QxNTo1NDoxNi40MDc0NTVafDI1MjQzNjI",
  jobs: [
    {
      title: "Product Designer",
      excerpt: "Design our mobile app.",
      companyName: "Acme Health",
      companySlug: "acme-health",
      employmentType: "Full Time",
      seniority: ["Mid-level"],
      locationRestrictions: ["United States", "Canada"],
      timezoneRestrictions: [-8, -5],
      categories: ["Product-Designer"],
      description:
        "<p>Design our mobile app in Figma.</p><p>Run user research with patients. Must be based in the United States or Canada.</p>",
      pubDate: 1794066876,
      expiryDate: 1799250875,
      applicationLink: "https://himalayas.app/companies/acme-health/jobs/product-designer?utm_source=api",
      guid: "https://himalayas.app/companies/acme-health/jobs/product-designer",
    },
  ],
};

export const REMOTE_OK_FEED = [
  {
    last_updated: 1794096003,
    legal:
      "API Terms of Service: Please link back (with follow, and without nofollow!) to the URL on Remote OK and mention Remote OK as a source.",
  },
  {
    slug: "remote-ai-developer-salvo-software-1137701",
    id: "1137701",
    epoch: 1794009602,
    date: "2026-11-07T00:00:02+00:00",
    company: "Salvo Software",
    company_logo: "",
    position: "AI Developer",
    tags: ["dev", "python", "docker"],
    description:
      "<p>Salvo Software builds custom software. You will ship LLM features in Python with PyTorch and Docker.</p>",
    location: "Worldwide",
    apply_url: "https://remoteOK.com/remote-jobs/remote-ai-developer-salvo-software-1137701",
    salary_min: 0,
    salary_max: 0,
    url: "https://remoteOK.com/remote-jobs/remote-ai-developer-salvo-software-1137701",
  },
];
