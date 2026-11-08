// Test-only. Job API answers in the shapes the live APIs returned in November 2026 (GitLab on
// Greenhouse, Spotify on Lever, Linear on Ashby), with the text cut down.

const DUTIES = [
  "Own the plan for bringing AI into the revenue team, from first pilots to daily habits.",
  "Work with sales leaders to find the workflows where AI saves the most time.",
  "Measure adoption and report progress to the leadership team every month.",
];

const ESCAPED_CONTENT = [
  "&lt;div class=&quot;content-intro&quot;&gt;&lt;p&gt;GitLab is the intelligent orchestration platform for DevSecOps.",
  " More than 50 million registered users trust GitLab to ship better software faster.&lt;/p&gt;&lt;/div&gt;",
  "&lt;h2&gt;What you&amp;rsquo;ll do&lt;/h2&gt;&lt;ul&gt;",
  ...DUTIES.map((duty) => `&lt;li&gt;&lt;p&gt;${duty}&lt;/p&gt;&lt;/li&gt;`),
  "&lt;/ul&gt;&lt;p&gt;Salary&amp;nbsp;range: $120,000&amp;ndash;$180,000 &amp;amp; equity.&lt;/p&gt;",
].join("");

export const GREENHOUSE_JOB = {
  absolute_url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
  data_compliance: [{ type: "gdpr", requires_consent: false }],
  internal_job_id: 6449994002,
  location: { name: "Remote, United States" },
  metadata: [
    { id: 4595831002, name: "Quota Coverage Type", value: "n/a", value_type: "single_select" },
  ],
  id: 8638232002,
  updated_at: "2026-11-06T15:25:07-05:00",
  requisition_id: "6682",
  title: "AI Transformation Owner, CRO",
  company_name: "GitLab",
  first_published: "2026-07-22T13:38:40-04:00",
  language: "en",
  application_deadline: null,
  content: ESCAPED_CONTENT,
  departments: [{ id: 1, name: "Sales" }],
  offices: [],
  questions: [{ label: "First Name", required: true }],
};

export const LEVER_POSTING = {
  additionalPlain:
    "The United States base range for this position is $87,069-$124,385 plus equity.",
  additional:
    "<div>The United States base range for this position is $87,069-$124,385 plus equity. The benefits include health insurance and 23 paid days off.</div>",
  categories: {
    commitment: "Permanent",
    department: "Operations and Business Support",
    location: "New York, NY",
    team: "Platform",
    allLocations: ["New York, NY"],
  },
  createdAt: 1792767640768,
  descriptionPlain: "Spotify Technology is our business-to-business software team.",
  description:
    "<div>\n<p>Spotify Technology is our business-to-business software team, helping organizations improve how they build and deliver software.</p>\n<p>As an Account Executive on our Commercial team, you will drive new business.</p></div>",
  id: "2a55d6c9-c564-443a-be3e-a3851db5a93b",
  lists: [
    {
      text: "What You'll Do",
      content:
        "<div>\n<p>• Identify and pursue new business opportunities with companies of fewer than 1,000 employees.</p>\n<p>• Own the full sales cycle, from prospecting and discovery through demos and close.</p></div>",
    },
    {
      text: "Who You Are",
      content:
        "<li>You have 4+ years of experience in a quota-carrying sales role.</li><li>You love fast sales cycles.</li>",
    },
  ],
  text: "Account Executive - Commercial, Spotify Technology",
  country: "US",
  workplaceType: "hybrid",
  opening: "",
  openingPlain: "",
  descriptionBody:
    "<div><p>Spotify Technology is our business-to-business software team.</p></div>",
  descriptionBodyPlain: "Spotify Technology is our business-to-business software team.",
  hostedUrl: "https://jobs.lever.co/spotify/2a55d6c9-c564-443a-be3e-a3851db5a93b",
  applyUrl: "https://jobs.lever.co/spotify/2a55d6c9-c564-443a-be3e-a3851db5a93b/apply",
};

export const ASHBY_JOB_ID = "d3bc1ced-3ce4-4086-a050-555055dbb1ff";

const ASHBY_DESCRIPTION =
  '<p style="min-height:1.5em">At Linear, we\'re building the product development system for teams and agents.</p>' +
  '<p style="min-height:1.5em">Founded in 2019, Linear has become the platform of choice for more than 50,000 companies to plan, build, and ship their products.</p>' +
  "<h3>What you'll do</h3><ul><li><p>Build product features end to end, across the stack.</p></li><li><p>Care about craft and speed in equal measure.</p></li></ul>";

export const ASHBY_BOARD = {
  apiVersion: "1",
  jobs: [
    {
      id: "0a000000-0000-4000-8000-000000000000",
      title: "Another job",
      location: "San Francisco",
      publishedAt: "2026-01-01T00:00:00.000+00:00",
      descriptionHtml: "<p>Not this one.</p>",
    },
    {
      id: ASHBY_JOB_ID,
      title: "Senior / Staff Fullstack Engineer",
      department: "Product",
      team: "Engineering",
      employmentType: "FullTime",
      location: "Europe",
      shouldDisplayCompensationOnJobPostings: false,
      secondaryLocations: [],
      publishedAt: "2021-04-27T20:13:45.158+00:00",
      isListed: true,
      isRemote: true,
      workplaceType: "Remote",
      address: { postalAddress: { addressCountry: "European Union" } },
      jobUrl: `https://jobs.ashbyhq.com/linear/${ASHBY_JOB_ID}`,
      applyUrl: `https://jobs.ashbyhq.com/linear/${ASHBY_JOB_ID}/application`,
      descriptionHtml: ASHBY_DESCRIPTION,
      descriptionPlain:
        "At Linear, we're building the product development system for teams and agents.",
      compensation: { compensationTiers: [], summaryComponents: [] },
    },
  ],
};

// The JSON-LD Ashby's own job page carries for the same posting.
export const ASHBY_JSON_LD = {
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  title: "Senior / Staff Fullstack Engineer",
  description: ASHBY_DESCRIPTION,
  directApply: true,
  identifier: { "@type": "PropertyValue", name: "Linear", value: ASHBY_JOB_ID },
  datePosted: "2021-04-27",
  hiringOrganization: { "@type": "Organization", name: "Linear", sameAs: "https://linear.app/" },
  jobLocation: {
    "@type": "Place",
    address: { "@type": "PostalAddress", addressCountry: "European Union" },
  },
  employmentType: "FULL_TIME",
  jobLocationType: "TELECOMMUTE",
  applicantLocationRequirements: { "@type": "Country", name: "European Union" },
};

export function htmlPage({ head = "", body }: { head?: string; body: string }): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">${head}</head><body>${body}</body></html>`;
}

export function jsonLdScript(value: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
}

// About 600 characters of ordinary job post text.
export const LONG_POST = [
  "<h2>About the role</h2>",
  "<p>We are looking for a backend engineer to join the payments team and help us move money safely for small businesses around the world.</p>",
  "<h2>What you will do</h2><ul>",
  "<li>Design and build APIs in TypeScript and Go that handle millions of requests a day.</li>",
  "<li>Own reliability for the services you ship, including on-call once a month.</li>",
  "<li>Work closely with product and design to turn rough ideas into clear plans.</li>",
  "</ul><h2>What you bring</h2><ul>",
  "<li>Four or more years building production systems.</li>",
  "<li>Experience with PostgreSQL, queues and observability tools.</li>",
  "</ul>",
].join("");
