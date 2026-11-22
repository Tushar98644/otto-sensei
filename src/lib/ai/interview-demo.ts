import {
  PREP_LEVELS,
  type PrepLevel,
  type ResolvedFocus,
  type RoleFocus,
} from "@/lib/insights/prep-focus";
import { PREP_LIMITS, type TechnicalQuestion } from "@/lib/insights/prep";
import { BLUEPRINTS, scaleFor, topicsFor } from "./interview-blueprints";
import { clip, clipWords } from "./text";

// Sample technical rounds for demo mode (no AI key): written by hand for the common roles, built from the blueprint for the rest.

type DemoQuestion = {
  topic: string;
  keys: RegExp;
  question: string;
  covers: readonly string[];
  pitfalls: readonly string[];
  probes: readonly [string, string];
  from?: PrepLevel;
  until?: PrepLevel;
};

type DemoNotes = Pick<DemoQuestion, "covers" | "pitfalls" | "probes">;

type DemoSet = {
  concepts: readonly DemoQuestion[];
  design: DemoNotes;
  coding: readonly DemoQuestion[];
  deepDive: DemoNotes & { angles: readonly (readonly [topic: string, ask: string])[] };
};

const q = (
  topic: string,
  keys: RegExp,
  question: string,
  covers: readonly string[],
  pitfalls: readonly string[],
  probes: readonly [string, string],
  levels: { from?: PrepLevel; until?: PrepLevel } = {},
): DemoQuestion => ({ topic, keys, question, covers, pitfalls, probes, ...levels });

const AI_ML: DemoSet = {
  concepts: [
    q(
      "Semantic caching",
      /cach|latenc|cost/,
      "Our assistant is slow and expensive at peak. Where would you add caching, and what exactly would you cache?",
      [
        "Prompt caching: keep the system prompt and shared context as a stable prefix the provider can reuse",
        "Semantic caching: embed the question and reuse an answer above a similarity threshold, scoped per tenant",
        "Plain caches for retrieval results and for embeddings of repeated queries, each with a TTL",
        "Invalidation: tie cached answers to document versions so an edited article can't serve a stale answer",
        "The KV cache: a long shared prefix makes prefill cheaper and the first token arrive sooner",
      ],
      [
        "A similarity threshold so loose it answers a different question",
        "One cache shared across tenants, leaking one customer's data to another",
      ],
      [
        "How would you choose and test the similarity threshold?",
        "What would you never cache, and why?",
      ],
    ),
    q(
      "RAG pipeline",
      /\brag\b|retriev|search|knowledge|docs|documents/,
      "Walk me through what happens between a user asking our assistant a question and the answer coming back, if it's built on retrieval.",
      [
        "Ahead of time: ingest, chunk, embed and index documents, with metadata for filtering",
        "At query time: embed the query, retrieve top-k, rerank, then generate with those chunks in context",
        "Make the answer cite its chunks, and say it doesn't know when nothing relevant comes back",
        "Keep the index fresh: re-embed changed documents and delete removed ones",
      ],
      [
        "Jumping to the model before talking about retrieval quality",
        "Stuffing in every chunk that fits instead of reranking a few",
      ],
      [
        "How would you tell whether retrieval or the model caused a bad answer?",
        "What changes if the documents update every hour?",
      ],
    ),
    q(
      "Chunking and embeddings",
      /chunk|embedding|vector/,
      "How would you decide how to chunk our help articles before embedding them?",
      [
        "Chunk by structure first: headings, sections and lists, not a fixed character count",
        "Small chunks retrieve precisely but lose context; large ones blur the embedding",
        "Add overlap, or retrieve the parent section, so answers aren't cut mid-thought",
        "Store the title and section path with each chunk, and compare sizes on a labelled query set",
      ],
      [
        "Picking one chunk size without measuring retrieval",
        "Forgetting that a new embedding model means re-embedding everything",
      ],
      [
        "How would you chunk tables or code blocks?",
        "When would you embed a summary instead of the raw text?",
      ],
    ),
    q(
      "Retrieval evaluation",
      /retriev|search|relevan|ranking|evaluat/,
      "How would you measure whether our retrieval is actually good, before anyone reads the final answers?",
      [
        "Build a labelled set: real user queries with the chunks that should come back",
        "Track recall@k and MRR or nDCG per query type, not one overall average",
        "Compare with a keyword baseline such as BM25; hybrid search often beats either alone",
        "Rerun the set on every change to chunking, embeddings or the index",
      ],
      [
        "Judging only final answers, which hides retrieval failures",
        "A test set written from the documents instead of from real queries",
      ],
      [
        "How many labelled queries would you start with, and why?",
        "What would you do if recall looks fine but answers are still wrong?",
      ],
    ),
    q(
      "LLM evals",
      /eval|quality|test|prompt/,
      "We change the prompt every week. How would you stop a change from quietly making the answers worse?",
      [
        "An offline eval set of real cases with expected behaviour, versioned with the prompt",
        "Deterministic checks first: format, citations present, banned content, length",
        "LLM-as-judge for quality, checked against human labels, using a different model from the one tested",
        "Run it in CI as a gate, and watch online signals such as thumbs-down rate and escalations",
      ],
      [
        "Trusting a judge model without checking it against people",
        "Testing only the happy path, never empty or adversarial context",
      ],
      [
        "How would you stop the judge from favouring longer answers?",
        "What result would make you roll a prompt change back?",
      ],
    ),
    q(
      "Latency and cost",
      /latenc|cost|token|fast|speed|scale/,
      "Each answer takes about six seconds and costs more than we'd like. How would you bring both down?",
      [
        "Measure first: split the time into retrieval, time to first token and generation, and track cost per request",
        "Stream tokens so the answer starts sooner, and cap the output length",
        "Route easy questions to a smaller model, falling back to a bigger one when it's unsure",
        "Shrink the prompt: fewer, reranked chunks and a shorter system prompt",
        "Set a cost budget per request and per tenant, with an alert when it's crossed",
      ],
      [
        "Tuning the model call before measuring where the time goes",
        "Cutting context to save money without an eval to show answers held up",
      ],
      [
        "How would you decide a smaller model is good enough?",
        "What would you put on a cost dashboard?",
      ],
      { from: "mid" },
    ),
    q(
      "Guardrails",
      /guardrail|hallucinat|safety|trust|accura/,
      "How would you stop the assistant from confidently making things up?",
      [
        "Ground answers in retrieved text and require citations to specific chunks",
        "Have it say it doesn't know when retrieval is empty or weak, and test that it does",
        "Validate output: a JSON schema, allowed actions, and a check that the cited chunk supports the claim",
        "Defend against prompt injection in retrieved documents and in user input",
      ],
      [
        "Relying on the system prompt alone as the guardrail",
        "Never measuring the hallucination rate on an eval set",
      ],
      [
        "How would you catch an answer that cites a real chunk but misreads it?",
        "What would you do with a document that contains instructions to the model?",
      ],
    ),
    q(
      "Fine-tuning vs RAG",
      /fine[- ]tun|train|model/,
      "A teammate wants to fine-tune a model on our docs instead of using retrieval. What would you tell them?",
      [
        "Retrieval adds knowledge that changes; fine-tuning shapes behaviour, format and tone",
        "Fine-tuned knowledge goes stale and can't cite sources; retrieval can",
        "Fine-tuning needs clean labelled examples and its own eval set, and is slower to iterate",
        "They combine well: fine-tune a small model for format, keep retrieval for facts",
      ],
      [
        "Treating fine-tuning as the way to teach facts",
        "Comparing the two without the same eval set",
      ],
      [
        "When would you pick LoRA over full fine-tuning?",
        "How would you show the fine-tune helped?",
      ],
      { from: "mid" },
    ),
    q(
      "Data privacy",
      /privacy|pii|personal data|security|complian|gdpr|tenant/,
      "Customers will paste personal data into this assistant. What would you put in place?",
      [
        "Redact or mask PII before it reaches the model or the logs",
        "Use providers with no-training and short-retention terms, written into the contract",
        "Enforce tenant isolation in retrieval with server-side filters, never through the prompt",
        "Keep logs of prompts and answers behind access controls, with a retention limit",
      ],
      [
        "Filtering by tenant inside the prompt instead of in the query",
        "Keeping full prompts forever for debugging",
      ],
      [
        "How would support debug a bad answer without seeing personal data?",
        "What changes for customers in the EU?",
      ],
    ),
    q(
      "LLM observability",
      /observab|monitor|production|incident|reliab/,
      "In production, how would you know the assistant got worse before users tell you?",
      [
        "Trace every request step by step: retrieval, reranking, the model call and post-checks",
        "Track quality signals: thumbs-down rate, empty retrievals, refusals and escalations",
        "Sample live traffic into a review queue, and score it with the offline judge",
        "Alert on drift: changes in query mix, retrieval scores, latency and cost per request",
      ],
      [
        "Logging only errors, when most failures are confident wrong answers",
        "No link between a bad answer and the chunks it used",
      ],
      ["What would you alert on first?", "How would you turn bad answers into new eval cases?"],
      { from: "senior" },
    ),
  ],
  design: {
    covers: [
      "Agree on requirements first: who asks what, how fresh the data must be, and the latency target",
      "Sketch the pipeline: ingestion, chunking, embeddings, index, retrieval, reranking and generation",
      "Meet the latency and cost targets with caching, streaming and model routing",
      "Plan how you'd know it works: offline evals, online feedback and tracing per step",
      "Cover safety: tenant isolation, personal data and prompt injection",
    ],
    pitfalls: [
      "Drawing boxes before agreeing on requirements and scale",
      "Leaving out evals and monitoring",
    ],
    probes: ["What fails first if traffic doubles?", "Where would you spend the first two weeks?"],
  },
  coding: [
    q(
      "Top-k similarity",
      /vector|embedding|similar/,
      "Write a function that returns the k vectors most similar to a query vector by cosine similarity.",
      [
        "Normalise the vectors once, so cosine similarity becomes a dot product",
        "Keep a min-heap of size k instead of sorting everything: O(n log k)",
        "Handle zero vectors, ties and k larger than the list",
        "Say how an ANN index such as HNSW changes this at millions of vectors",
      ],
      ["Sorting the whole list when only k items are needed", "Dividing by a zero-length vector"],
      ["How would you test it?", "What changes if the vectors don't fit in memory?"],
    ),
    q(
      "Rate limiter",
      /rate|limit|api/,
      "Write a token-bucket rate limiter for calls to a model API.",
      [
        "Track tokens and the last refill time; refill by elapsed time times the rate",
        "Allow bursts up to the bucket size, then reject or queue",
        "Make it safe under concurrency: a lock, or an atomic operation in Redis",
        "Count model tokens, not just requests, if the provider limits tokens per minute",
      ],
      ["Refilling with a timer instead of from elapsed time", "Ignoring concurrent callers"],
      [
        "How would this work across several servers?",
        "What should a caller do when it's rejected?",
      ],
    ),
  ],
  deepDive: {
    angles: [
      ["Measuring quality", "How did you measure quality before and after?"],
      [
        "Latency and cost",
        "Where did the latency and cost come from, and what did you do about them?",
      ],
      ["Failure cases", "What failure cases did you see, and how did you guard against them?"],
    ],
    covers: [
      "State the problem and the constraint in one or two sentences",
      "Walk the pipeline step by step: data in, retrieval or model, checks, output",
      "Name the trade-off made, such as quality against latency or cost, and what was given up",
      "Give the measurement that proved it: [What did you measure before and after?]",
    ],
    pitfalls: [
      "Describing the model and skipping the evaluation",
      "No numbers, or numbers with no baseline",
    ],
    probes: [
      "What would you change if you built it again?",
      "What happens at ten times the traffic?",
    ],
  },
};

const BACKEND: DemoSet = {
  concepts: [
    q(
      "Caching and invalidation",
      /cach|latenc|read|performance|scale/,
      "Our product page reads the same rows thousands of times a minute. How would you add a cache, and how would you keep it correct?",
      [
        "Cache-aside in Redis: read the cache, fall back to the database, then populate it with a TTL",
        "Invalidate on write by deleting the key after the database commit, not before",
        "Prevent stampedes with request coalescing, a lock per key, or early refresh with jitter",
        "Set TTLs by how stale each field may be; prices and stock need shorter ones",
        "Measure hit rate, p95 latency and database load before and after",
      ],
      [
        "Updating the cache before the database transaction commits",
        "No plan for a cold cache after a deploy or a flush",
      ],
      [
        "What happens when two writes race on the same key?",
        "When would you choose write-through instead?",
      ],
    ),
    q(
      "Idempotent retries",
      /idempoten|payment|retr|duplicate|order/,
      "A client times out and retries a payment request. How do you make sure the customer isn't charged twice?",
      [
        "Require an idempotency key per operation, stored under a unique constraint",
        "Save the key and the result in the same transaction as the side effect, and replay that result on retries",
        "Handle the in-flight case: a second request arriving while the first is still running",
        "Expire keys after a window, and scope them per client",
      ],
      [
        "Deduplicating on the request body instead of an explicit key",
        "Calling the payment provider before recording the attempt",
      ],
      [
        "What if the worker crashes after charging but before saving?",
        "How long would you keep the keys?",
      ],
    ),
    q(
      "Indexes and query plans",
      /postgres|sql|database|query|index|mysql/,
      "A query that took 20 milliseconds now takes 2 seconds as the table grew. How would you find out why?",
      [
        "Run EXPLAIN ANALYZE and look for sequential scans, bad row estimates and sorts spilling to disk",
        "Add a composite index that matches the WHERE and ORDER BY, with the columns in the right order",
        "Check for stale statistics misleading the planner, and run ANALYZE",
        "Weigh the cost: every index slows writes and takes space",
        "Look for N+1 queries from the ORM, not just one slow query",
      ],
      [
        "One index per column instead of one composite index",
        "Never checking the plan after the change",
      ],
      [
        "When does the planner ignore an index you added?",
        "How would you add an index to a huge table without locking it?",
      ],
    ),
    q(
      "Transactions and races",
      /transaction|consisten|inventory|booking|concurren/,
      "Two people try to buy the last ticket at the same moment. How would you make sure only one of them gets it?",
      [
        "A transaction with a row lock (SELECT ... FOR UPDATE), or a conditional update that checks stock",
        "Isolation levels: read committed allows this race; serializable prevents it at a cost",
        "Optimistic concurrency: a version column, and a retry on conflict",
        "Keep transactions short, and never hold one open across a network call",
      ],
      [
        "Checking stock in one query and decrementing it in another, with no lock",
        "Assuming the default isolation level prevents every race",
      ],
      [
        "What happens to throughput under heavy contention?",
        "How would this work across two services?",
      ],
    ),
    q(
      "Queues and retries",
      /queue|kafka|sqs|event|async|retr|worker/,
      "A service we call is down for ten minutes. What happens to the jobs in our queue, and what should happen?",
      [
        "At-least-once delivery means every consumer must be idempotent",
        "Retry with exponential backoff and jitter, with a cap on attempts",
        "Send repeated failures to a dead-letter queue, with an alert and a replay tool",
        "A circuit breaker stops hammering a service that's down",
        "The outbox pattern keeps the database write and the event from drifting apart",
      ],
      [
        "Retrying forever until the queue fills up",
        "Retrying in a tight loop that makes the outage worse",
      ],
      [
        "How would you replay the dead-letter queue safely?",
        "What if messages must stay in order per customer?",
      ],
    ),
    q(
      "Rate limiting",
      /rate limit|api|public|throttl|abuse/,
      "How would you rate-limit our public API so one noisy customer can't slow everyone else down?",
      [
        "A token bucket allows bursts; a sliding window gives smoother limits",
        "Keep counters in Redis with atomic increments, keyed by API key",
        "Return 429 with a Retry-After header, and document the limits",
        "Set limits per plan and per endpoint, lower for expensive endpoints",
      ],
      [
        "Per-server counters that let a client get several times the limit",
        "Fixed windows that allow a double burst at the boundary",
      ],
      [
        "What happens if Redis is down?",
        "How would you limit by IP without blocking a whole office?",
      ],
    ),
    q(
      "API design",
      /\bapi|rest|grpc|endpoint|integrat/,
      "Design the API for listing a customer's orders, which could run to thousands.",
      [
        "Cursor pagination on a stable sort key, not offsets, for large or changing lists",
        "Filters and sorting as query parameters, with validated values",
        "One error format with codes clients can act on",
        "Versioning: add fields freely, but never change or remove one without a new version",
      ],
      [
        "Offset pagination that skips or repeats rows as data changes",
        "Returning everything with no limit",
      ],
      [
        "How would a client fetch only orders changed since yesterday?",
        "REST or gRPC here, and why?",
      ],
    ),
    q(
      "Scaling",
      /scal|traffic|growth|load|throughput/,
      "Traffic grows ten times over the next year. What breaks first, and what would you change?",
      [
        "Keep app servers stateless and scale them out behind a load balancer",
        "The database usually breaks first: read replicas, connection pooling, then partitioning",
        "Move slow work onto queues, with backpressure so spikes don't cascade",
        "Load test to find the real bottleneck instead of guessing",
      ],
      [
        "Sharding before trying indexes, caching and replicas",
        "Forgetting the database's connection limit",
      ],
      ["How would you pick a shard key?", "What does replica lag break for users?"],
      { from: "mid" },
    ),
    q(
      "Zero-downtime migrations",
      /migrat|schema|legacy|backfill/,
      "We need to split a busy users table without any downtime. How would you do it?",
      [
        "Expand and contract: add the new structure, dual-write, backfill, switch reads, then remove the old",
        "Backfill in small throttled batches, safe to rerun",
        "Verify with row counts and checksums before switching reads",
        "Keep a rollback path at every step",
      ],
      ["One big migration that locks the table", "Switching reads before the backfill is verified"],
      [
        "How would you handle writes during the backfill?",
        "How would you know it's safe to drop the old column?",
      ],
      { from: "senior" },
    ),
    q(
      "Observability",
      /observab|monitor|on[- ]call|incident|latenc|reliab/,
      "One endpoint gets slow for some customers but not others. How would you find out why?",
      [
        "Start from metrics: rate, errors and duration, split by customer, region and version",
        "Follow one slow request through distributed traces to the span that grew",
        "Use structured logs with a request id to see what that request did",
        "Check what changed: deploys, config, data size for those customers, a noisy neighbour",
      ],
      [
        "Looking only at averages, which hide the slow tail",
        "Adding logs blindly instead of tracing one request",
      ],
      ["Which percentiles would you alert on?", "How would you prove the fix worked?"],
    ),
  ],
  design: {
    covers: [
      "Agree on requirements and scale first: reads against writes, latency, and consistency needs",
      "Sketch the API and the data model before drawing boxes",
      "Walk the write path and the read path, and where caching fits",
      "Cover failure: timeouts, retries, idempotency, and what happens when a dependency is down",
      "Say how it scales and what you'd monitor",
    ],
    pitfalls: [
      "Jumping to Kafka and microservices before the requirements",
      "No word on what happens when parts fail",
    ],
    probes: [
      "What's the first bottleneck at ten times the load?",
      "Which parts need strong consistency, and which don't?",
    ],
  },
  coding: [
    q(
      "LRU cache",
      /cach/,
      "Implement an LRU cache with get and put that both run in constant time.",
      [
        "A hash map from key to node, plus a doubly linked list in recency order",
        "On get, move the node to the front; on put, insert at the front and evict from the back",
        "Handle updating an existing key and a capacity of zero",
        "Say how you'd make it thread-safe",
      ],
      [
        "A list scan on every get, which is O(n)",
        "Forgetting to remove the evicted key from the map",
      ],
      ["How would you add a TTL per entry?", "How is this different from what Redis does?"],
    ),
    q(
      "Merge intervals",
      /schedul|booking|time|interval/,
      "Given a list of time ranges, merge the ones that overlap.",
      [
        "Sort by start time, then sweep, extending the current range while the next one overlaps",
        "O(n log n) for the sort, O(n) for the sweep",
        "Decide whether touching ranges count as overlapping",
        "Test empty input, one range, and ranges fully inside others",
      ],
      ["Not sorting first", "Mutating the input in place without saying so"],
      [
        "How would you handle a stream of ranges instead of a list?",
        "How would you find free slots instead?",
      ],
    ),
  ],
  deepDive: {
    angles: [
      [
        "Failures and retries",
        "How did it behave when something it depended on failed, and how did retries stay safe?",
      ],
      ["Data model", "What did the data model look like, and what would you change about it now?"],
      ["Running it in production", "How did you know it was working in production?"],
    ],
    covers: [
      "Draw the flow: what calls what, where state lives, and what is synchronous",
      "Name the failure modes, such as timeouts, duplicates and partial writes, and how each was handled",
      "Explain the trade-off made and what was given up for it",
      "Give the numbers that prove it: [What did you measure before and after?]",
    ],
    pitfalls: [
      "Listing technologies instead of explaining decisions",
      'Saying "we" so much the interviewer can\'t tell your part',
    ],
    probes: [
      "What would break first at ten times the load?",
      "What would you build differently today?",
    ],
  },
};

const FRONTEND: DemoSet = {
  concepts: [
    q(
      "Rendering strategies",
      /render|ssr|next\.js|react|seo|server/,
      "Our marketing pages and our logged-in dashboard both use React. How would you decide how each one renders?",
      [
        "Static generation for content that rarely changes; revalidation (ISR) when it changes sometimes",
        "Server rendering for personalised pages that need a fast first paint or SEO",
        "Client rendering for highly interactive views behind a login",
        "Streaming and server components send the shell early and cut client JavaScript",
        "Hydration cost: every client component adds JavaScript the browser must run",
      ],
      [
        "Server-rendering everything without thinking about caching or server cost",
        "Ignoring hydration mismatches",
      ],
      [
        "What would you cache at the CDN, and for how long?",
        "How would you tell hydration is the bottleneck?",
      ],
    ),
    q(
      "Core Web Vitals",
      /performance|web vitals|fast|slow|mobile|speed/,
      "Our product page feels slow on phones. How would you find out why, and fix it?",
      [
        "Start from field data (CrUX or RUM) for LCP, INP and CLS, then reproduce it in the lab",
        "LCP: prioritise the hero image, preload key fonts, and cut render-blocking work",
        "INP: break up long tasks and move non-urgent work off the main thread",
        "CLS: reserve space for images, embeds and late content",
        "Set a performance budget and check it in CI",
      ],
      ["Only testing on a fast laptop", "Lazy-loading the image that is the LCP element"],
      [
        "How would you find which script causes a long task?",
        "What's the difference between lab and field data?",
      ],
    ),
    q(
      "State management",
      /state|redux|react|data/,
      "When would you reach for a global store, and when is local state or a server cache enough?",
      [
        "Fetched data is server state: keep it in a cache such as React Query or SWR, not a global store",
        "UI state stays in the component, lifted only as far as it needs to go",
        "Filters and tabs belong in the URL, so links and the back button work",
        "A global store is for truly shared client state, such as a cart or an editor",
        "Derive values instead of storing copies that can drift apart",
      ],
      [
        "Copying fetched data into a global store and syncing it by hand",
        "One store for everything",
      ],
      ["How would you handle an optimistic update that fails?", "Where would form state live?"],
    ),
    q(
      "Accessibility",
      /accessib|a11y|wcag|keyboard|inclusive/,
      "How would you make a custom dropdown work for keyboard and screen reader users?",
      [
        "Start from a native element if you can; it brings keyboard support and semantics for free",
        "Follow the ARIA pattern: roles, aria-expanded, and roving focus or aria-activedescendant",
        "Keyboard: Enter or Space opens, arrows move, Escape closes, and focus returns to the button",
        "Test with a screen reader and the keyboard alone, plus automated checks such as axe",
        "Keep a visible focus style and enough contrast",
      ],
      [
        "ARIA roles without the keyboard behaviour they promise",
        "Relying only on automated checks",
      ],
      [
        "How would you test this in CI?",
        "What should a screen reader announce when the selection changes?",
      ],
    ),
    q(
      "Frontend testing",
      /test|jest|playwright|cypress|quality/,
      "What would you test in a checkout form, and with what kind of test?",
      [
        "Unit tests for pure logic such as validation and price rules",
        "Component tests with Testing Library, finding elements by role and label as a user would",
        "Mock the network at the boundary, for example with MSW, not internal functions",
        "A few end-to-end tests for the critical path, in a real browser",
        "Keep tests deterministic: no real timers or network",
      ],
      [
        "Testing implementation details such as state or class names",
        "Slow end-to-end tests for every edge case",
      ],
      ["How would you deal with a flaky end-to-end test?", "What would you choose not to test?"],
    ),
    q(
      "Bundle size",
      /bundle|javascript|performance|load/,
      "Our main JavaScript bundle doubled in size this year. How would you bring it back down?",
      [
        "Analyse the bundle per route to see what's actually in it",
        "Split code by route and lazy-load heavy, rarely used components",
        "Replace or trim heavy dependencies, and check tree shaking really works",
        "Move work to the server where you can, for example with server components",
        "Set a size budget that fails CI when it's crossed",
      ],
      ["Lazy-loading what the first paint needs", "Guessing instead of measuring"],
      ["How would you stop it from growing again?", "What does lazy loading cost the user?"],
    ),
    q(
      "The event loop",
      /javascript|browser|event|async/,
      "Explain what happens in the browser when someone clicks a button that updates state and fetches data.",
      [
        "The click handler runs as a task; React batches the state updates and re-renders",
        "fetch returns a promise; its callback runs as a microtask once the response arrives",
        "Style, layout, paint and composite happen between tasks",
        "A long task blocks input, which is what INP measures",
      ],
      ["Mixing up tasks and microtasks", "Assuming setState updates the value immediately"],
      ["Why might the page freeze while sorting a big list?", "How would you keep it responsive?"],
      { until: "mid" },
    ),
    q(
      "Data fetching",
      /fetch|api|data|load/,
      "A page makes five requests one after another before it shows anything. How would you fix that?",
      [
        "Find the waterfall in the network panel, and start independent requests in parallel",
        "Fetch on the server or in a route loader, before components render",
        "Prefetch on hover or when links scroll into view",
        "Cache responses, and show stale data while revalidating",
      ],
      [
        "Fetching inside deeply nested components",
        "Showing a spinner per request instead of one loading state",
      ],
      [
        "How would you cancel a request the user no longer needs?",
        "When is stale data not acceptable?",
      ],
      { from: "mid" },
    ),
    q(
      "Component API design",
      /design system|component|ui librar/,
      "How would you design a Button component that a dozen teams will use?",
      [
        "A small API: variant and size props, and composition over a pile of booleans",
        "Pass through native button props and forward the ref",
        "Accessible by default: real button element, focus styles, loading and disabled states",
        "Design tokens for colour and spacing, so themes don't fork the component",
        "Document it, version it, and plan how breaking changes roll out",
      ],
      ["Adding a boolean prop for every request", "Wrapping a div with an onClick"],
      ["How would you handle a button that's really a link?", "How would you deprecate a variant?"],
      { from: "mid" },
    ),
  ],
  design: {
    covers: [
      "Agree on requirements first: devices, data size, and what must feel instant",
      "Break it into components, and decide where each piece of state lives",
      "Data fetching: debounce input, cancel stale requests, cache results",
      "Loading, empty and error states, plus keyboard and screen reader support",
      "Performance: virtualise long lists, and measure with Web Vitals",
    ],
    pitfalls: [
      "Jumping into code before agreeing on behaviour",
      "Forgetting error and empty states",
    ],
    probes: ["What changes if the list has 100,000 items?", "How would you test it?"],
  },
  coding: [
    q(
      "Debounce",
      /search|input|event/,
      "Write a debounce function, and explain where you'd use it.",
      [
        "Keep a timer; each call clears it and starts a new one",
        "Call the function with the latest arguments and the right this",
        "Offer a leading option and a cancel method",
        "Explain debounce against throttle, for example search input against scroll",
      ],
      ["Losing the latest arguments", "Never clearing the timer when a component unmounts"],
      [
        "How would you test it without waiting in real time?",
        "How would you use it in a React hook?",
      ],
    ),
    q(
      "Accessible tabs",
      /component|accessib|ui/,
      "Build a tabs component that works with a keyboard and a screen reader.",
      [
        "Roles: tablist, tab and tabpanel, linked with aria-controls and aria-labelledby",
        "Arrow keys move between tabs; Home and End jump to the ends",
        "Only the selected tab is in the tab order (roving tabindex)",
        "Keep panel state in the URL if links to a tab should work",
      ],
      ["Clickable divs with no roles", "Every tab in the tab order"],
      [
        "Should arrow keys switch the panel at once, or wait for Enter?",
        "How would you test the keyboard behaviour?",
      ],
    ),
  ],
  deepDive: {
    angles: [
      ["Rendering", "How did it render, and why that way?"],
      ["Performance", "What made it slow, and how did you measure the fix?"],
      ["Accessibility", "How did you make sure it worked for keyboard and screen reader users?"],
    ],
    covers: [
      "Explain the component structure and where its state lived",
      "Say how data was fetched and cached, and what loading and error states it had",
      "Name one trade-off, such as bundle size against features, and the choice made",
      "Give the measurement that proved it: [What did you measure before and after?]",
    ],
    pitfalls: ["Listing libraries instead of decisions", "No word on accessibility or testing"],
    probes: ["What would you change if you built it again?", "How did you test it?"],
  },
};

const DATA_SCIENCE: DemoSet = {
  concepts: [
    q(
      "Experiment design",
      /experiment|a\/b|test|launch/,
      "We want to test a new onboarding flow. How would you design the experiment?",
      [
        "One primary metric tied to the goal, plus guardrail metrics",
        "Randomise by user, not session, and check for sample ratio mismatch",
        "Compute the sample size from the smallest effect worth detecting and the metric's variance",
        "Fix the duration up front, covering at least one full weekly cycle",
      ],
      ["Stopping the test as soon as it looks significant", "Several primary metrics"],
      ["What if users can see both versions?", "How would you handle a novelty effect?"],
    ),
    q(
      "Reading an A/B result",
      /experiment|a\/b|statistic|significan/,
      "The test shows a 2% lift with a p-value of 0.04. What would you tell the product manager?",
      [
        "A p-value is how surprising the data is if there were no effect, not the chance the change works",
        "Report the confidence interval, and whether it clears the smallest effect that matters",
        "Check for peeking, many metrics and sample ratio mismatch before trusting it",
        "Weigh practical significance and cost alongside statistical significance",
      ],
      ["Saying there's a 96% chance the change works", "Ignoring that ten metrics were tested"],
      ["How would you correct for testing many metrics?", "What if the effect differs by country?"],
    ),
    q(
      "Causal pitfalls",
      /causal|insight|retention|engagement/,
      "Users who use search keep their subscription twice as long. Should we push everyone to search?",
      [
        "Correlation isn't causation: engaged users both search more and stay longer",
        "Name the likely confounders and the selection bias",
        "Test it: an experiment that nudges search, or a quasi-experiment if you can't randomise",
        "Check segments for Simpson's paradox before drawing a conclusion",
      ],
      ["Recommending the push straight from the correlation", "No plan to test the causal claim"],
      ["What quasi-experiment could you run without randomising?", "What would change your mind?"],
    ),
    q(
      "Model leakage",
      /model|predict|machine learning|churn/,
      "A churn model scores 0.95 AUC in testing but does poorly in production. What could be wrong?",
      [
        "Leakage: a feature known only after churn, such as a cancellation ticket",
        "A random split where a time-based split was needed",
        "Training data that doesn't match production: drift, or a changed population",
        "AUC hides calibration and the decision threshold the business needs",
      ],
      ["Retuning the model before checking the features", "Trusting one offline metric"],
      ["How would you set up validation to catch this?", "How would you choose the threshold?"],
    ),
    q(
      "Precision and recall",
      /model|classif|fraud|precision|recall/,
      "When would you care more about precision than recall, and how would you choose the threshold?",
      [
        "Precision matters when false alarms are costly, such as blocking good payments",
        "Recall matters when misses are costly, such as missing fraud",
        "Choose the threshold from the cost of each error, not a default of 0.5",
        "Check calibration if scores will be read as probabilities",
      ],
      [
        "Reporting accuracy on imbalanced classes",
        "Picking the threshold without the business costs",
      ],
      ["How does class imbalance change this?", "What would you monitor after launch?"],
    ),
    q(
      "SQL window functions",
      /sql|query|data/,
      "How would you find each customer's second purchase, and the days between their first and second?",
      [
        "ROW_NUMBER() over a partition by customer, ordered by purchase time",
        "LAG() to get the previous purchase date in the same partition",
        "Decide how to break ties on the same timestamp",
        "Filter on the row number in an outer query or CTE, not in WHERE directly",
      ],
      ["A self-join that multiplies rows", "Forgetting customers with only one purchase"],
      ["How would you get the median gap per month?", "How would this perform on a billion rows?"],
    ),
    q(
      "Variance reduction",
      /experiment|a\/b|variance|sample/,
      "Our tests take six weeks to reach significance. How could we get answers faster without cutting corners?",
      [
        "CUPED: adjust the metric with each user's pre-experiment value to cut variance",
        "A more sensitive metric that moves with the goal, checked against the long-term one",
        "Trim or cap outliers in heavy-tailed metrics",
        "Sequential testing with a correction, if you must look early",
      ],
      ["Peeking daily with no correction", "Switching metrics after seeing the data"],
      ["How would you check CUPED isn't biasing the result?", "When is a proxy metric dangerous?"],
      { from: "mid" },
    ),
  ],
  design: {
    covers: [
      "Frame the decision first: what would we do differently depending on the answer",
      "Define the metric and the unit, and the data you'd need",
      "Pick the method, an experiment or a model, and say why",
      "Say how you'd check the result is real: validation, guardrails, segments",
      "End with how it gets used, and what you'd monitor",
    ],
    pitfalls: ["Starting with the model before the decision", "No check on data quality"],
    probes: [
      "What would make you stop and change the plan?",
      "How would you explain the result to an executive?",
    ],
  },
  coding: [
    q(
      "Bootstrap",
      /statistic|python|experiment/,
      "In Python, compute a 95% confidence interval for a median using the bootstrap.",
      [
        "Resample the data with replacement many times, and compute the median of each sample",
        "Take the 2.5th and 97.5th percentiles of those medians",
        "Set a random seed, and use enough resamples, for example 10,000",
        "Say when the bootstrap struggles: tiny samples and heavy tails",
      ],
      ["Resampling without replacement", "Too few resamples"],
      ["How would you vectorise it?", "How would you compare two groups' medians?"],
    ),
  ],
  deepDive: {
    angles: [
      ["Validity", "How did you know the result was real and not noise?"],
      ["Data quality", "What was wrong with the data, and how did you handle it?"],
      ["Impact", "What decision changed because of it?"],
    ],
    covers: [
      "State the question and the decision it fed into",
      "Describe the data and its flaws, and how you dealt with them",
      "Explain the method and why it beat the obvious alternative",
      "Give the result with its uncertainty: [What was the effect, and how sure were you?]",
    ],
    pitfalls: ["Describing the method but not the decision", "A result with no uncertainty"],
    probes: ["What would you do differently with more time?", "Who disagreed, and why?"],
  },
};

const PRODUCT: DemoSet = {
  concepts: [
    q(
      "Users and problems",
      /user|customer|problem|merchant/,
      "Who do you think this product's most important users are, and what problem would you solve for them first?",
      [
        "Segment the users, and pick one segment on purpose, saying why",
        "State the problem in the user's words, with the evidence you'd look for",
        "Offer two or three solutions, and choose one with a clear reason",
        "Say how you'd know it worked: one success metric and one guardrail",
      ],
      ["Solving for everyone at once", "Jumping to a feature before the problem"],
      [
        "How would you check this is a real problem?",
        "What would you build first, and what would wait?",
      ],
    ),
    q(
      "Success metrics",
      /metric|kpi|data|measure|growth/,
      "How would you define success for this product's main feature?",
      [
        "A north-star metric tied to the value users get, not just activity",
        "Input metrics the team can move week to week",
        "Guardrails, such as support tickets, latency or churn, so wins aren't bought with harm",
        "A time frame and a baseline, so the target means something",
      ],
      ["Picking a vanity metric such as page views", "No guardrail metric"],
      [
        "What would you do if the north star rose but retention fell?",
        "How often would you review it?",
      ],
    ),
    q(
      "Metric drop",
      /metric|data|analytics|growth/,
      "Weekly active users dropped 8% last week. Walk me through what you'd do.",
      [
        "Check the data first: tracking changes, outages, a broken dashboard",
        "Segment by platform, country, version and acquisition channel",
        "List internal changes, such as releases and experiments, and external ones such as seasonality",
        "Form hypotheses, test the cheapest ones first, and share updates as you go",
      ],
      ["Assuming a cause before checking the data", "Looking only at the overall number"],
      ["What if the drop is only on Android?", "When would you escalate?"],
    ),
    q(
      "Prioritisation",
      /priorit|roadmap|stakeholder|planning/,
      "Sales wants three features, support wants one, and engineering wants to pay down tech debt. How do you decide what's next?",
      [
        "Tie each request to the team's goal for the quarter",
        "Estimate reach, impact, confidence and effort, roughly, for each",
        "Consider the cost of delay and dependencies, not just the score",
        "Decide, and explain the no to each group with the reasoning",
      ],
      ["Letting the loudest group win", "Treating tech debt as never urgent"],
      [
        "How would you handle a big customer threatening to leave?",
        "How do you revisit a decision?",
      ],
    ),
    q(
      "Working with engineering",
      /technical|engineer|api|platform|data/,
      "Engineering estimates a feature at three months because it needs a new API. How would you work through that with them?",
      [
        "Understand why first: the architecture, the dependencies and the risks",
        "Slice the scope: what smallest version tests the main bet",
        "Ask what a cheaper interim path would cost later, in tech debt",
        "Agree milestones and the decision points where you'd re-plan",
      ],
      [
        "Pushing for a smaller estimate without changing scope",
        "Agreeing without understanding the risk",
      ],
      ["What would you cut first?", "How would you explain the delay to leadership?"],
    ),
    q(
      "Reading experiments",
      /experiment|a\/b|test/,
      "A feature won its A/B test on clicks but lost on 30-day retention. Would you ship it?",
      [
        "Retention matters more than clicks if it's closer to lasting value",
        "Check significance and the confidence interval on both metrics",
        "Look at segments: it may help some users and hurt others",
        "Consider a changed version, and say what you'd test next",
      ],
      ["Shipping because the primary metric won", "Ignoring the guardrail"],
      ["What would make you ship anyway?", "How would you design the next test?"],
    ),
    q(
      "Strategy",
      /strategy|market|competit|vision/,
      "Where should this product play over the next two years, and what would you stop doing?",
      [
        "Start from the market: segments, trends and where competitors are weak",
        "Name the company's right to win in one or two sentences",
        "Make two or three bets, each with how you'd know early if it's failing",
        "Say what you'd stop, and why that frees up the team",
      ],
      ["A list of features presented as a strategy", "No trade-offs"],
      ["What would a competitor do in response?", "What's the riskiest assumption here?"],
      { from: "senior" },
    ),
  ],
  design: {
    covers: [
      "Clarify the goal and the user first, then pick a segment on purpose",
      "List the user's main problems, and pick one to solve",
      "Sketch the key flow and the smallest version worth shipping",
      "Name the metric that shows it worked, and a guardrail",
      "Say what comes later, and what you'd leave out",
    ],
    pitfalls: ["Designing for every user at once", "No metric for success"],
    probes: [
      "What's the riskiest assumption, and how would you test it?",
      "How would you launch it?",
    ],
  },
  coding: [],
  deepDive: {
    angles: [
      ["Deciding what to build", "How did you decide it was the right thing to build?"],
      ["Measuring impact", "What did you measure before and after, and what surprised you?"],
      ["Trade-offs", "What trade-off did you make with engineering or design?"],
    ],
    covers: [
      "Open with the problem and how you found it",
      "Name the options you weighed and why this one won",
      "Give the result with a baseline: [What moved, from what to what?]",
      "Say what you learned and what you'd change",
    ],
    pitfalls: [
      "Talking about the team's work without saying your part",
      "Results without a baseline",
    ],
    probes: ["Who disagreed, and how did you resolve it?", "What would you do differently now?"],
  },
};

const WRITTEN: Partial<Record<RoleFocus, DemoSet>> = {
  "ai-ml": AI_ML,
  backend: BACKEND,
  frontend: FRONTEND,
  fullstack: {
    ...BACKEND,
    concepts: [
      ...FRONTEND.concepts.slice(0, 3),
      ...BACKEND.concepts.slice(0, 4),
      ...FRONTEND.concepts.slice(3),
    ],
  },
  "data-science": DATA_SCIENCE,
  product: PRODUCT,
};

const GENERIC: Omit<DemoSet, "concepts"> = {
  design: {
    covers: [
      "Agree on the goal, the users and the constraints before proposing anything",
      "Sketch the main parts and how they connect",
      "Walk through the main flow, then what happens when something fails",
      "Say how you'd measure that it works, and what you'd watch after launch",
    ],
    pitfalls: ["Starting with tools before requirements", "No plan for failure or measurement"],
    probes: [
      "What would you change at ten times the size?",
      "What would you do in the first two weeks?",
    ],
  },
  coding: [],
  deepDive: {
    angles: [
      ["How it worked", "Walk me through how it worked, end to end."],
      ["Trade-offs", "What was the hardest trade-off, and what did you give up?"],
      ["Results", "How did you know it worked?"],
    ],
    covers: [
      "State the problem and the constraint in one or two sentences",
      "Explain how it worked, step by step, and your part in it",
      "Name one trade-off and why you made it",
      "Give the result: [What changed, and how did you measure it?]",
    ],
    pitfalls: ["Too much background, too little on decisions", "No result or measurement"],
    probes: ["What would you change if you did it again?", "What went wrong along the way?"],
  },
};

const GENERIC_NOTES: DemoNotes = {
  covers: [
    "Define it in a sentence or two, in plain words",
    "Name two ways to do it, and when each one wins",
    "Say how you'd measure whether it's working",
    "Say what breaks first under load or failure, and how you'd notice",
  ],
  pitfalls: ["Staying abstract, with no example", "Naming tools without saying why"],
  probes: ["What changes at ten times the scale?", "What's a common mistake with this?"],
};

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function setFor(resolved: ResolvedFocus): DemoSet {
  const written = WRITTEN[resolved.focus];
  if (written) return written;
  const concepts = topicsFor(BLUEPRINTS[resolved.focus], resolved.level).map((item) =>
    q(
      item.name.split(":")[0]!.trim(),
      item.keys,
      `Let's talk about ${lowerFirst(item.name.split(":")[0]!.trim())}. How would you approach it in this role, with an example?`,
      GENERIC_NOTES.covers,
      GENERIC_NOTES.pitfalls,
      GENERIC_NOTES.probes,
    ),
  );
  return { ...GENERIC, concepts };
}

function fits(item: Pick<DemoQuestion, "from" | "until">, level: PrepLevel): boolean {
  const rank = PREP_LEVELS.indexOf(level);
  return (
    (item.from === undefined || PREP_LEVELS.indexOf(item.from) <= rank) &&
    (item.until === undefined || PREP_LEVELS.indexOf(item.until) >= rank)
  );
}

type Line = { text: string; place: string };

const HAS_NUMBER = /\d/;
const NAMED = /\b[A-Z][A-Za-z0-9.+#-]*[A-Z0-9][A-Za-z0-9.+#-]*\b|\b[A-Z][a-z]+(?:SQL|DB|JS)\b/;

function deepDiveLines(lines: readonly Line[], resolved: ResolvedFocus, count: number): Line[] {
  const topics = BLUEPRINTS[resolved.focus].topics;
  const score = (line: Line) => {
    const text = line.text.toLowerCase();
    return (
      2 * topics.filter((item) => item.keys.test(text)).length +
      Number(NAMED.test(line.text)) +
      Number(HAS_NUMBER.test(line.text))
    );
  };
  return lines
    .map((line, index) => ({ line, index, score: score(line) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map((item) => item.line);
}

const QUOTED_LINE_CHARS = 150;

function designQuestion(resolved: ResolvedFocus, company: string): string {
  const prompt = BLUEPRINTS[resolved.focus].design[resolved.level]
    .replace(/\bthe company's\b/g, company ? `${company}'s` : "our")
    .replace(/\bthis product's\b/g, company ? `${company}'s` : "our product's");
  return `Let's design something together: ${prompt}. Walk me through how you'd approach it.`;
}

// The questions the post stresses most, with one beyond the basics from mid-level up, in the order written.
function pickConcepts(
  all: readonly DemoQuestion[],
  level: PrepLevel,
  post: string,
  count: number,
): DemoQuestion[] {
  const ranked = all
    .map((item, index) => ({ item, index, hit: Number(item.keys.test(post)) }))
    .filter(({ item }) => fits(item, level))
    .sort((a, b) => b.hit - a.hit || a.index - b.index);
  const chosen = ranked.slice(0, count);
  const deeper = ranked.find(({ item }) => item.from !== undefined);
  if (level !== "junior" && deeper && !chosen.some(({ item }) => item.from !== undefined)) {
    chosen.splice(chosen.length - 1, 1, deeper);
  }
  return chosen.sort((a, b) => a.index - b.index).map(({ item }) => item);
}

export function demoTechnical(
  resolved: ResolvedFocus,
  lines: readonly Line[],
  job: { post: string; company: string },
): TechnicalQuestion[] {
  const set = setFor(resolved);
  const post = job.post.toLowerCase();
  const coding = resolved.coding ? set.coding.slice(0, 2) : [];
  const deep = deepDiveLines(lines, resolved, 3);
  const conceptCount = Math.min(8, Math.max(4, 10 - deep.length - coding.length));
  const concepts = pickConcepts(set.concepts, resolved.level, post, conceptCount);

  const notes = (item: DemoNotes) => ({
    covers: [...item.covers],
    pitfalls: [...item.pitfalls],
    probes: [...item.probes],
  });
  return [
    ...deep.map((line, index): TechnicalQuestion => {
      const [topic, ask] = set.deepDive.angles[index % set.deepDive.angles.length]!;
      return {
        kind: "deep-dive",
        topic,
        question: clipWords(
          `Let's dig into this line from your resume: “${clipWords(line.text, QUOTED_LINE_CHARS)}”. ${ask}`,
          PREP_LIMITS.technicalQuestionChars,
        ),
        assume: "",
        ...notes(set.deepDive),
        resume: {
          line: clip(line.text, PREP_LIMITS.lineChars),
          place: clip(line.place, PREP_LIMITS.placeChars),
        },
      };
    }),
    ...concepts.map((item): TechnicalQuestion => ({
      kind: "concept",
      topic: item.topic,
      question: item.question,
      assume: "",
      ...notes(item),
      resume: null,
    })),
    {
      kind: "design",
      topic: "Design",
      question: designQuestion(resolved, job.company),
      assume: `Assume ${scaleFor(BLUEPRINTS[resolved.focus], resolved.level)}.`,
      ...notes(set.design),
      resume: null,
    },
    ...coding.map((item): TechnicalQuestion => ({
      kind: "coding",
      topic: item.topic,
      question: item.question,
      assume: "",
      ...notes(item),
      resume: null,
    })),
  ];
}
