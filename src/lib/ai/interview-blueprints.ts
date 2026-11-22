import { PREP_LEVELS, type PrepLevel, type RoleFocus } from "@/lib/insights/prep-focus";

// What a real interview loop probes per role family, with the level each topic starts at.

export type BlueprintTopic = {
  name: string;
  // Lowercase text that shows a question is on this topic, for the evals and the demo.
  keys: RegExp;
  from?: PrepLevel;
  until?: PrepLevel;
};

export type Blueprint = {
  topics: readonly BlueprintTopic[];
  design: Readonly<Record<PrepLevel, string>>;
  scale?: Readonly<Record<PrepLevel, string>>;
  deepDive: string;
  coding: string;
};

export const LEVEL_GUIDE: Readonly<Record<PrepLevel, string>> = {
  junior:
    "Explain the idea in plain words and apply it to a small, concrete case: fundamentals, debugging and good habits, at the size of one feature or one service.",
  mid: "Choose between options and say why, debug a real production problem, and own one service or feature end to end.",
  senior:
    "Trade-offs under real constraints: failure modes, scale, cost and running it in production, across a system with several parts.",
  staff:
    "Direction across teams: standards, migrations, build or buy, cost and risk at company scale, and how to roll a change out safely.",
};

const ENGINEERING_SCALE: Readonly<Record<PrepLevel, string>> = {
  junior: "about 10,000 users and a few requests a second",
  mid: "about 1 million users and a few hundred requests a second at peak",
  senior: "about 20 million users and around 10,000 requests a second at peak, in two regions",
  staff: "about 100 million users across several regions, with many teams building on it",
};

const topic = (
  name: string,
  keys: RegExp,
  from?: PrepLevel,
  until?: PrepLevel,
): BlueprintTopic => ({
  name,
  keys,
  ...(from ? { from } : {}),
  ...(until ? { until } : {}),
});

const CACHING = topic("Caching layers and invalidation", /cach|ttl|invalidat|stampede|cdn/);
const OBSERVABILITY = topic(
  "Observability: metrics, logs and traces",
  /observab|tracing|traces?\b|metrics|logs?\b|dashboards?|alert/,
);
const API_DESIGN = topic(
  "API design: resources, pagination, versioning and errors",
  /\bapi\b|apis\b|pagination|versioning|rest\b|grpc|endpoint/,
);
const INDEXING = topic(
  "Database indexing and query plans",
  /index|query plan|explain|n\+1|slow quer/,
);

export const BLUEPRINTS: Readonly<Record<RoleFocus, Blueprint>> = {
  "ai-ml": {
    topics: [
      topic("RAG design: retrieve, rerank, generate, cite", /\brag\b|retriev|rerank|citation/),
      topic("Chunking and embeddings", /chunk|embedding/),
      topic(
        "Vector search: ANN indexes, hybrid search and filters",
        /vector|hnsw|\bann\b|hybrid|bm25|similarity search/,
        "mid",
      ),
      topic(
        "Retrieval evaluation: recall@k, MRR and labelled queries",
        /recall|mrr|ndcg|retrieval (?:eval|quality)|labell?ed quer/,
      ),
      topic(
        "LLM evals: offline sets, LLM-as-judge and regression gates",
        /\bevals?\b|evaluat|judge|golden set|regression/,
      ),
      topic("Caching: prompt caching, semantic caching and the KV cache", /cach|kv\b/),
      topic(
        "Latency and cost control: streaming, routing and token budgets",
        /latenc|cost|token|stream|rout/,
      ),
      topic(
        "Guardrails and hallucination",
        /guardrail|hallucinat|prompt injection|grounded|grounding|jailbreak/,
      ),
      topic(
        "Model choice: size, quality, context and vendor risk",
        /model choice|which model|choose a model|open[- ]weight|smaller model|model size/,
        "mid",
      ),
      topic("Fine-tuning vs RAG", /fine[- ]tun|lora|distill/, "mid"),
      topic("Model serving and inference", /serving|inference|batching|gpu|quantiz/, "senior"),
      topic(
        "Observability for LLM apps: traces, feedback and drift",
        /observab|tracing|trace|feedback|drift|monitor/,
      ),
      topic(
        "Data privacy: PII, retention and tenant isolation",
        /privacy|pii|redact|retention|tenant/,
      ),
      topic(
        "An LLM platform: gateway, shared evals and budgets per team",
        /gateway|platform|budget|governance/,
        "staff",
      ),
    ],
    design: {
      junior: 'a "chat with our help articles" feature over a few hundred documents',
      mid: "a RAG assistant over the company's docs and support tickets, with answers that cite their sources",
      senior:
        "a multi-tenant RAG system with evals, caching, guardrails and a cost ceiling per tenant",
      staff:
        "an LLM platform many product teams share: a model gateway, routing, caching, evals and budgets",
    },
    deepDive:
      "how quality was measured before and after, how retrieval was evaluated, what was cached and how it was invalidated, latency and cost per request, failure cases and guardrails, and why that model",
    coding:
      "top-k cosine similarity over a list of vectors, chunking text into overlapping windows, or a token-bucket limiter for calls to a model API",
  },
  backend: {
    topics: [
      CACHING,
      INDEXING,
      topic(
        "Transactions, isolation levels and consistency",
        /transaction|isolation|consisten|lock|race/,
      ),
      topic("Idempotency and safe retries", /idempoten|dedup|exactly[- ]once|duplicate/),
      topic(
        "Queues, retries and dead-letter queues",
        /queue|retr(?:y|ies)|dead[- ]letter|outbox|backoff|consumer/,
      ),
      topic("Rate limiting", /rate limit|token bucket|sliding window|429|throttl/),
      API_DESIGN,
      topic(
        "Scaling: stateless services, sharding and backpressure",
        /scal|shard|partition|replica|backpressure|connection pool/,
        "mid",
      ),
      OBSERVABILITY,
      topic(
        "Zero-downtime migrations and backfills",
        /migrat|backfill|dual[- ]write|expand.{0,20}contract/,
        "senior",
      ),
      topic(
        "Platform standards across teams: SLOs, ownership and shared libraries",
        /standard|ownership|platform|slo/,
        "staff",
      ),
    ],
    design: {
      junior: "a URL shortener: its API, data model and how a redirect is served",
      mid: "a rate limiter for a public API, shared across several app servers",
      senior: "a payments or notifications service with retries, idempotency and an audit trail",
      staff: "an event platform other teams publish to and consume from, across regions",
    },
    deepDive:
      "the data model, what happens on failure and retry, consistency, how it scaled, what was measured, and what they'd change",
    coding:
      "an LRU cache with get and put in constant time, merging overlapping intervals, or grouping log lines by key and counting them",
  },
  frontend: {
    topics: [
      topic(
        "Rendering strategies: CSR, SSR, SSG, ISR and streaming",
        /\bssr\b|\bssg\b|\bisr\b|\bcsr\b|render|hydrat|server component|stream/,
      ),
      topic(
        "Core Web Vitals: LCP, INP and CLS",
        /web vitals|\blcp\b|\binp\b|\bcls\b|performance|slow|load time/,
      ),
      topic("State management: local, global, server and URL state", /state/),
      topic("Accessibility", /accessib|a11y|aria|keyboard|screen reader|focus|contrast/),
      topic("Testing: unit, integration and end to end", /test/),
      topic(
        "Bundle size: code splitting and lazy loading",
        /bundle|code[- ]split|lazy|tree[- ]shak|javascript size/,
      ),
      topic(
        "Browser basics: the event loop and the rendering pipeline",
        /event loop|layout|paint|reflow|repaint|microtask/,
        undefined,
        "mid",
      ),
      topic(
        "Data fetching: waterfalls, caching and optimistic updates",
        /fetch|waterfall|prefetch|optimistic|stale/,
        "mid",
      ),
      topic(
        "Component APIs and design systems",
        /design system|component api|composition|tokens?\b|variants?/,
        "mid",
      ),
      topic(
        "Frontend architecture: performance budgets, monorepos and migrations",
        /architecture|micro[- ]frontend|budget|monorepo|migrat/,
        "senior",
      ),
    ],
    design: {
      junior: "an autocomplete search box that calls an API as the person types",
      mid: "an infinite-scroll feed with filters, loading states and errors",
      senior: "the frontend of a real-time dashboard or collaborative editor",
      staff: "a shared component platform and a plan to move a large app onto it",
    },
    deepDive:
      "how it rendered and why, what made it slow and how that was measured, state and data fetching, accessibility, and testing",
    coding:
      "a debounce function, rendering a nested comment tree from a flat list, or an accessible tabs component",
  },
  fullstack: {
    topics: [
      API_DESIGN,
      CACHING,
      INDEXING,
      topic(
        "Rendering strategies and data fetching",
        /\bssr\b|\bssg\b|render|hydrat|fetch|server component/,
      ),
      topic("State on the client and the server", /state/),
      topic("Auth and sessions: cookies, tokens and CSRF", /auth|session|cookie|csrf|jwt|oauth/),
      topic("Testing across the stack", /test/),
      topic(
        "Core Web Vitals and backend latency",
        /web vitals|\blcp\b|\binp\b|latenc|performance|slow/,
      ),
      topic("Transactions and consistency", /transaction|consisten|race|lock/, "mid"),
      topic(
        "Queues, background jobs and retries",
        /queue|background job|retr(?:y|ies)|idempoten/,
        "mid",
      ),
      OBSERVABILITY,
    ],
    design: {
      junior: "a to-do app with sign-in, from the database table to the page",
      mid: "comments with mentions and notifications, end to end",
      senior: "a multi-tenant SaaS feature with billing limits, background jobs and an audit log",
      staff:
        "splitting a monolith's busiest feature into a service without slowing the product teams down",
    },
    deepDive:
      "how the pieces talk to each other, where state lives, auth, failure handling, and what was measured",
    coding:
      "an LRU cache, a debounce function, or a small REST handler with validation and pagination",
  },
  mobile: {
    topics: [
      topic("Offline-first storage", /offline|local (?:storage|database)|sqlite|cache/),
      topic("Sync and conflict resolution", /sync|conflict|merge|delta/),
      topic(
        "Performance: startup time, jank and memory",
        /startup|launch time|jank|frame|memory|performance|scroll/,
      ),
      topic(
        "Releases: staged rollouts, feature flags and forced updates",
        /release|rollout|feature flag|app store|review|forced update|version/,
      ),
      topic("Networking on bad connections", /network|retr(?:y|ies)|timeout|connectivity|flaky/),
      topic(
        "App lifecycle, background work and push notifications",
        /lifecycle|background|push notification|notification/,
      ),
      topic("App architecture and state", /architecture|mvvm|state|navigation/),
      topic("Testing and crash reporting", /test|crash/),
      topic(
        "Security on device: tokens, keychain and certificate pinning",
        /keychain|keystore|token|pinning|secure storage/,
        "mid",
      ),
      topic(
        "Shared mobile platform: modules, build times and release trains",
        /modulari|build time|release train|platform/,
        "staff",
      ),
    ],
    design: {
      junior: "a notes app that works offline and syncs when it's back online",
      mid: "a feed that loads fast, caches for offline use and handles a flaky network",
      senior: "a chat app with offline sending, sync across devices and push notifications",
      staff: "a mobile platform several teams ship features into, with one release train",
    },
    scale: {
      junior: "a few thousand daily users on a mix of old and new phones",
      mid: "about 500,000 daily users, many on slow networks",
      senior: "about 10 million daily users on iOS and Android",
      staff: "about 50 million users and 8 teams shipping into one app",
    },
    deepDive:
      "how offline and sync worked, what made the app slow and how it was measured, how releases were rolled out, and crashes",
    coding:
      "merging two sorted lists of changes by timestamp, a debounce or throttle, or an image cache with a size limit",
  },
  "data-science": {
    topics: [
      topic(
        "Experiment design: power, sample size and the metric",
        /experiment|a\/b|power|sample size|mde|randomi/,
      ),
      topic(
        "A/B test statistics: significance, peeking and multiple tests",
        /p[- ]value|significan|confidence interval|peeking|multiple (?:testing|comparisons)|false positive/,
      ),
      topic(
        "Causal pitfalls: confounding, selection bias and Simpson's paradox",
        /causal|confound|selection bias|simpson|regression to the mean/,
      ),
      topic(
        "Modelling: bias and variance, regularisation and leakage",
        /model|overfit|regulari|leakage|bias.{0,10}variance|features?\b/,
      ),
      topic(
        "Model metrics: precision, recall, AUC and calibration",
        /precision|recall|auc|calibrat|f1|confusion/,
      ),
      topic("SQL: window functions and joins", /sql|window function|join/),
      topic("Data quality and missing data", /data quality|missing|outlier|dedup|imput/),
      topic(
        "Variance reduction and quasi-experiments",
        /cuped|variance reduction|diff(?:erence)?[- ]in[- ]diff|synthetic control|propensity|instrument/,
        "mid",
      ),
      topic(
        "Models in production: monitoring and drift",
        /production|monitor|drift|retrain/,
        "senior",
      ),
      topic(
        "Experimentation platform and standards across teams",
        /platform|standard|guardrail metric|governance/,
        "staff",
      ),
    ],
    design: {
      junior: "how to tell whether a new onboarding email lifts week-one activity",
      mid: "an experiment for a pricing-page change, from the metric to the decision",
      senior: "a churn model the retention team will act on, from labels to monitoring",
      staff: "the experimentation standards and tooling every product team will use",
    },
    scale: {
      junior: "about 20,000 new sign-ups a month",
      mid: "about 50,000 visitors to the page a week",
      senior: "about 2 million paying customers and a 3% monthly churn rate",
      staff: "about 40 teams running 200 experiments a quarter",
    },
    deepDive:
      "the question, the data and its flaws, the method and why, how the result was checked, and the decision it changed",
    coding:
      "a SQL query with a window function, computing a confidence interval by hand, or bootstrapping a metric in Python",
  },
  "data-analysis": {
    topics: [
      topic(
        "SQL: window functions, joins and their traps",
        /sql|window function|join|group by|cte/,
      ),
      topic(
        "Metrics: definitions, north star and guardrails",
        /metric|kpi|north star|guardrail|definition/,
      ),
      topic(
        "Experiment design and reading A/B results",
        /experiment|a\/b|significan|sample size|test result/,
      ),
      topic(
        "Causal pitfalls in analysis",
        /causal|confound|correlation|simpson|selection bias|seasonal/,
      ),
      topic("Data quality checks", /data quality|missing|duplicate|null|sanity check|outlier/),
      topic("Funnels, cohorts and retention", /funnel|cohort|retention|churn|conversion/),
      topic(
        "Dashboards and telling the story",
        /dashboard|stor(?:y|ies)|visuali|chart|stakeholder/,
      ),
      topic("Diagnosing a sudden metric drop", /drop|spike|declin|anomal|investigat/, "mid"),
      topic(
        "Self-serve analytics and metric governance",
        /self[- ]serve|governance|semantic layer|single source|standard/,
        "senior",
      ),
    ],
    design: {
      junior: "a weekly dashboard for a new feature launch: which numbers, and why",
      mid: "sign-ups fell 15% last week: how you would find out why",
      senior: "measuring whether a new loyalty program pays for itself",
      staff: "one trusted set of company metrics, and how teams will use it",
    },
    scale: {
      junior: "about 5,000 people using the feature in its first month",
      mid: "about 40,000 sign-ups a week before the drop",
      senior: "about 1 million members across 3 markets",
      staff: "about 30 teams and 400 dashboards today",
    },
    deepDive:
      "the question asked, the data and its gaps, the SQL or method, how the numbers were checked, and what decision changed",
    coding:
      "SQL: the second-highest order per customer, a 7-day rolling average, or week-over-week retention",
  },
  "data-engineering": {
    topics: [
      topic("Batch pipelines: ETL and ELT", /pipeline|etl|elt|batch|ingest/),
      topic("Idempotent backfills", /idempoten|backfill|rerun|re-run|overwrite|partition/),
      topic(
        "Orchestration: DAGs, retries and SLAs",
        /orchestrat|airflow|dagster|dag\b|schedul|retr(?:y|ies)|sla/,
      ),
      topic(
        "Data modelling: star schemas and slowly changing dimensions",
        /model|star schema|dimension|fact table|scd|dbt/,
      ),
      topic(
        "Streaming vs batch: late data, windows and exactly-once",
        /stream|kafka|late (?:data|event)|window|watermark|exactly[- ]once|real[- ]time/,
      ),
      topic(
        "Data quality: tests, contracts and freshness",
        /data quality|contract|freshness|test|great expectations|anomal/,
      ),
      topic(
        "Storage formats and partitioning",
        /parquet|partition|iceberg|delta|format|columnar/,
        "mid",
      ),
      topic(
        "Warehouse cost and query performance",
        /cost|warehouse|performance|cluster|snowflake|bigquery/,
        "mid",
      ),
      topic(
        "Data platform: ownership, lineage and self-serve",
        /platform|lineage|ownership|catalog|self[- ]serve/,
        "senior",
      ),
    ],
    design: {
      junior: "a daily job that loads app events into the warehouse and can be rerun safely",
      mid: "a pipeline from the product database to the warehouse, with backfills and tests",
      senior: "a streaming pipeline for orders with late events, deduplication and replays",
      staff: "the company's data platform: ingestion, modelling, quality and ownership",
    },
    scale: {
      junior: "about 1 million events a day",
      mid: "about 50 tables and 200 million rows a day",
      senior: "about 20,000 events a second at peak, some arriving hours late",
      staff: "about 30 source systems and 15 teams consuming the data",
    },
    deepDive:
      "the sources, the model, how reruns stayed safe, how failures and late data were handled, cost, and data quality",
    coding:
      "SQL to deduplicate events keeping the latest per key, a merge of two sorted streams, or splitting a file into partitions by date",
  },
  devops: {
    topics: [
      topic("CI/CD pipelines", /ci\/cd|pipeline|build|artifact|continuous/),
      topic(
        "Deploys and rollbacks: canary, blue/green and feature flags",
        /rollback|roll back|canary|blue[- ]green|deploy|feature flag/,
      ),
      topic(
        "Infrastructure as code: Terraform state and drift",
        /terraform|infrastructure as code|\biac\b|drift|state file|pulumi/,
      ),
      topic("Incident response and postmortems", /incident|on[- ]call|postmortem|outage|pager/),
      topic("SLOs, SLIs and error budgets", /slo|sli\b|error budget|burn rate|availability/),
      topic(
        "Kubernetes basics: probes, requests and limits, autoscaling",
        /kubernetes|k8s|pod|probe|hpa|autoscal|resource limit/,
      ),
      OBSERVABILITY,
      topic("Secrets and least privilege", /secret|iam|least privilege|vault|credential/),
      topic("Capacity planning and cost", /capacity|cost|right[- ]siz|reserved/, "mid"),
      topic(
        "Multi-region reliability and disaster recovery",
        /multi[- ]region|disaster|failover|backup|rto|rpo/,
        "senior",
      ),
      topic(
        "Platform engineering: paved roads for many teams",
        /platform|paved road|golden path|internal developer/,
        "staff",
      ),
    ],
    design: {
      junior: "a CI pipeline that tests, builds and deploys one web service",
      mid: "monitoring and alerting for an API that has a 99.9% availability target",
      senior: "safe deploys for 40 services: canaries, automatic rollback and feature flags",
      staff: "a platform that lets 30 teams ship to Kubernetes safely without an ops ticket",
    },
    deepDive:
      "what broke and how it was found, how deploys and rollbacks worked, the infrastructure code, alerts, and what changed after an incident",
    coding:
      "a script that finds the top error lines in a log file, parsing and checking a config file, or a retry with exponential backoff",
  },
  security: {
    topics: [
      topic(
        "Threat modelling: assets, trust boundaries and STRIDE",
        /threat model|stride|trust boundar|attack surface|asset/,
      ),
      topic(
        "Web app security: injection, XSS, CSRF and SSRF",
        /injection|xss|csrf|ssrf|owasp|sanitiz|escap/,
      ),
      topic(
        "Authentication and authorisation: OAuth, sessions and RBAC",
        /auth|oauth|oidc|session|rbac|abac|permission|mfa/,
      ),
      topic("Secrets and key management", /secret|key management|kms|rotat|vault/),
      topic(
        "Cloud security: IAM and misconfiguration",
        /cloud|iam|bucket|misconfig|least privilege/,
      ),
      topic("Detection and incident response", /detect|incident|siem|alert|forensic|response/),
      topic(
        "Secure development: code review, scanning and dependencies",
        /sast|dast|scan|dependenc|supply chain|code review|sdlc/,
      ),
      topic(
        "Cryptography basics: hashing, TLS and encryption at rest",
        /hash|bcrypt|argon|tls|encrypt|crypto/,
      ),
      topic(
        "Security programs: risk, metrics and working with teams",
        /program|risk|metric|roadmap|compliance/,
        "senior",
      ),
    ],
    design: {
      junior: "threat-model a file-upload feature",
      mid: "threat-model a password reset flow and say how you'd test it",
      senior: "secrets management for 100 services across two clouds",
      staff: "a security program for a company that just passed 500 engineers",
    },
    deepDive:
      "the threat, how it was found, the fix and its trade-offs, how it was verified, and how it was prevented from coming back",
    coding:
      "finding the bug in a short login handler, parsing auth logs for brute-force attempts, or validating a URL to block SSRF",
  },
  qa: {
    topics: [
      topic(
        "Test strategy: the pyramid and risk-based testing",
        /strategy|pyramid|risk|coverage|what to test/,
      ),
      topic(
        "Automation frameworks and page objects",
        /automation|playwright|selenium|cypress|page object|framework/,
      ),
      topic("Flaky tests: causes and fixes", /flaky|flakiness|intermittent|retr(?:y|ies)|wait/),
      topic("API and contract testing", /\bapi\b|contract|postman|integration test/),
      topic("Test data and environments", /test data|fixture|environment|seed|mock/),
      topic("Tests in CI", /\bci\b|pipeline|parallel|gate/),
      topic(
        "Exploratory testing and bug reports",
        /exploratory|bug report|triage|severity|reproduc/,
      ),
      topic("Performance and load testing", /performance|load test|stress|latenc|k6|jmeter/, "mid"),
      topic(
        "Quality across teams: metrics and shift-left",
        /quality metric|shift[- ]left|escape|defect rate|standard/,
        "senior",
      ),
    ],
    design: {
      junior: "a test plan for a sign-up form",
      mid: "a test plan for a checkout flow with payments",
      senior: "an automation strategy for an app with web, mobile and a public API",
      staff: "how quality should work across 20 teams that each own their own tests",
    },
    scale: {
      junior: "one web form and two browsers to support",
      mid: "about 30 releases a month and 3 payment providers",
      senior: "about 1,500 automated tests and a 40-minute CI run today",
      staff: "about 20 teams and 4 apps",
    },
    deepDive:
      "what was tested and why, how the automation was built, flaky tests, how bugs were found and triaged, and what improved",
    coding:
      "writing test cases for a function that validates passwords, finding the bug in a short test, or automating a login check",
  },
  product: {
    topics: [
      topic("Product sense: users, problems and solutions", /user|problem|solution|need|pain/),
      topic(
        "Metrics: north star, inputs and guardrails",
        /metric|north star|kpi|guardrail|measure/,
      ),
      topic("Diagnosing a metric drop", /drop|declin|fell|dip|investigat/),
      topic(
        "Prioritisation and saying no",
        /priorit|rice|roadmap|trade[- ]off|say no|opportunity cost/,
      ),
      topic(
        "Experiments: designing and reading A/B tests",
        /experiment|a\/b|test result|significan/,
      ),
      topic(
        "Technical depth: APIs, data and working with engineers",
        /\bapi|technical|engineer|data model|tech debt|platform|architecture/,
      ),
      topic(
        "Execution: launches, scope and deadlines",
        /launch|scope|deadline|ship|rollout|execution/,
      ),
      topic("Stakeholders and alignment", /stakeholder|align|disagree|influence|exec/, "mid"),
      topic(
        "Strategy: market, competition and where to play",
        /strategy|market|competit|vision|position/,
        "senior",
      ),
      topic("Portfolio and org: bets across teams", /portfolio|org|bets|teams|investment/, "staff"),
    ],
    design: {
      junior: "a feature that helps new users finish setting up in their first week",
      mid: "a feature that solves the biggest problem this product's main users have",
      senior: "a new product line for an under-served segment of this product's users",
      staff: "next year's strategy for this product area, with two bets and what you'd stop",
    },
    scale: {
      junior: "about 50,000 monthly active users",
      mid: "about 500,000 monthly active users",
      senior: "about 5 million users and 3 competing products",
      staff: "about 6 teams and a budget fixed for the year",
    },
    deepDive:
      "the problem and how it was found, the options and why this one, what was measured before and after, trade-offs with engineering, and what they'd change",
    coding: "none",
  },
  design: {
    topics: [
      topic(
        "Portfolio: process, constraints and your role",
        /process|constraint|role|portfolio|decision/,
      ),
      topic(
        "User research: methods and synthesis",
        /research|interview|usability|synthes|insight|survey/,
      ),
      topic(
        "Design systems: tokens, components and adoption",
        /design system|token|component|pattern librar|adoption/,
      ),
      topic(
        "Interaction design and information architecture",
        /interaction|information architecture|flow|navigation|ia\b/,
      ),
      topic("Accessibility in design", /accessib|contrast|wcag|screen reader|focus/),
      topic(
        "Working with engineers: handoff and feasibility",
        /engineer|handoff|feasib|developer|build/,
      ),
      topic("Measuring design: metrics and impact", /metric|impact|measure|conversion|success/),
      topic("Critique and iteration", /critique|feedback|iterat/, "mid"),
      topic(
        "Design leadership: quality bar and direction across teams",
        /quality bar|leadership|direction|vision|mentor/,
        "senior",
      ),
    ],
    design: {
      junior: "a clearer sign-up flow for a mobile app",
      mid: "onboarding for this product's newest users",
      senior: "a redesign of this product's busiest workflow without breaking power users",
      staff: "a design direction and system that five product teams will build on",
    },
    scale: {
      junior: "a one-week timeline and one engineer",
      mid: "a two-week timeline and a squad of 4 engineers",
      senior: "about 1 million weekly users and a quarter to ship",
      staff: "5 teams and a year",
    },
    deepDive:
      "the problem, the research behind it, the options explored, the trade-offs, how it was tested, and what changed after launch",
    coding: "none",
  },
};

export function topicsFor(blueprint: Blueprint, level: PrepLevel): BlueprintTopic[] {
  const rank = PREP_LEVELS.indexOf(level);
  return blueprint.topics.filter(
    (item) =>
      (item.from === undefined || PREP_LEVELS.indexOf(item.from) <= rank) &&
      (item.until === undefined || PREP_LEVELS.indexOf(item.until) >= rank),
  );
}

export function scaleFor(blueprint: Blueprint, level: PrepLevel): string {
  return (blueprint.scale ?? ENGINEERING_SCALE)[level];
}
