# Otto Jobs MCP server

Otto Jobs is a public, read-only [MCP](https://modelcontextprotocol.io) server. It lets people search Otto's open jobs from Claude, ChatGPT or any other MCP client. Each result links to the original posting and to Otto Sensei.

- **URL:** `https://www.ottosensei.com/api/mcp`. Always use `www`: the bare domain redirects, and MCP clients may not follow redirects.
- **Sign-in:** none. It reads public job data only.
- **Transport:** Streamable HTTP, stateless. It serves both 2026-07-28 clients (no handshake) and 2025-era clients (`initialize`), using `createMcpHandler` from `@modelcontextprotocol/server` 2.4.0 with `legacy: "stateless"`.

## Tools

| Tool     | Input                                                                        | Returns                                                                                                                                                                                                                                                                                                       |
| -------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search` | `query`: 1–100 characters of free text, e.g. `react developer remote berlin` | `{ results: [{ id, title, url }] }`: up to 10 of the newest matching openings. `title` reads "Job title at Company (place), via Source" and `url` is the original posting. The word `remote` anywhere in the query keeps remote jobs only. A second text block gives the total, or tips when nothing matched. |
| `fetch`  | `id`: an id from `search`                                                    | `{ id, title, text, url, metadata }`: a short plain summary with the location, job type, level, posting date, skills, the apply link with its source credit, and the Otto link.                                                                                                                               |

- These are the names and shapes ChatGPT deep research and company knowledge expect.
- Both tools carry `title`, `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true` and `openWorldHint: false`. Claude's directory and OpenAI's review both check for these.
- How `search` reads the query:
  - Every word must start a word of the job's title, company, place or skills, as in the app's search box.
  - Common accents don't matter, so `zurich` finds Zürich.
  - A leading or trailing `remote` keeps remote jobs only.
  - Filler words (`jobs`, `in`, `at`, `role` and similar) are dropped.
- Errors come back as `isError` results that say what to do next, for example "Run search again for current openings."

## What it never returns

- **Job descriptions.** The feeds' terms allow their text inside the app only. See `src/app/api/jobs/[id]/route.ts`.
- **Himalayas jobs.** Their terms forbid passing jobs to other job search engines. See [job-sources.md](job-sources.md).
- **Copies, general applications and stale jobs.** A copy is the same opening in another city; it is shown once, and any copy's place still matches. Stale means first posted over 90 days ago.
- **Internal fields:** board tokens, external ids, work-rights facts and place codes.

## Links in results

- `url` / `applyUrl`: the posting link exactly as stored, credited "via <Source>". It has no UTM, because the sources require their own links unchanged.
- `ottoUrl`: `/login?next=/dashboard/jobs?tailor=<id>` with top-level `utm_source=mcp&utm_medium=connector&utm_campaign=otto_jobs`.
  - After sign-in, it opens "tailor resume" for that job.
  - PostHog page views pick up the UTM tags.

## Privacy and limits

- **Nothing to sign in with.** No cookies, and no conversation data is stored.
- **Logs keep counts only:** the number of query words, the result count, the total and the time taken. They never keep the query text or the IP address.
- **Unknown origins.** A browser client from an origin outside the known list (Otto, Claude, ChatGPT, localhost) is logged by origin only, and still served. Strict Origin checks break real hosts.
- **Rate limits:**
  - 60 tool calls a minute per network (an IPv4 address, or an IPv6 /64), counted in `rate_limits`. Rows are kept 2 days.
  - 240 requests a minute per network on each server instance, counted in memory.
  - One JSON-RPC message per request: batches (dropped from MCP in 2025-06-18) get a -32600 error, and a body that isn't valid JSON gets -32700, so neither can carry tool calls past the limit.
  - Over a limit, the answer is a JSON-RPC 429 with `Retry-After`.
  - If the limiter's database write fails, the call goes through.
- **Search limits:**
  - One SQL query per search, with a 3-second `statement_timeout`.
  - At most 10 results; the code also caps paging at 100 skipped.
  - Request bodies over 64 KB are refused.
- **HTTP behaviour:**
  - `GET` and `DELETE` answer 405, since there are no streams or sessions.
  - CORS allows any origin (`*`), which is safe with no credentials.
  - Every answer is `Cache-Control: no-store`.

## Add it to a client

- **Claude (web, desktop):**
  1. Open Settings → Connectors (claude.ai/customize/connectors) → Add custom connector.
  2. Paste the URL and leave auth empty.
  3. In a chat, turn it on under + → Connectors.
  - On Team or Enterprise, an Owner adds it.
- **Claude Code:** `claude mcp add --transport http otto-jobs https://www.ottosensei.com/api/mcp`
- **ChatGPT:**
  1. Open chatgpt.com/plugins → + → Add custom MCP server.
  2. Paste the URL and choose no authentication.
  3. Choose Create as a plugin.
  - Which plans allow custom servers isn't documented.
- **MCP Inspector:**
  - `npx @modelcontextprotocol/inspector@2.17.0 --cli https://www.ottosensei.com/api/mcp --method tools/list --strict`
  - `npx @modelcontextprotocol/inspector@2.17.0 --cli https://www.ottosensei.com/api/mcp --method tools/call --tool-name search --tool-arg query="data analyst remote"`

## Directory listings (not done yet)

- **Official MCP Registry:** [mcp/server.json](mcp/server.json) names the server `com.ottosensei/jobs`.
  1. Prove the domain with DNS auth: a TXT record on `ottosensei.com`. HTTP auth would need the bare domain to answer without a redirect.
  2. Run `mcp-publisher login dns --domain ottosensei.com …`, then `mcp-publisher publish`.
  3. Bump `version` on every later publish.
  - PulseMCP and Glama import from this registry.
- **Claude directory:**
  - Submit at claude.ai/directory/manage → Submit new → MCP connector, with no authentication.
  - It asks for this page, the privacy policy and a support contact.
- **ChatGPT plugins:**
  - Upload at platform.openai.com/plugins: a plugin ZIP with `plugin.json`, `mcp.json`, a skill and icons.
  - It also needs domain verification at `https://www.ottosensei.com/.well-known/openai-apps-challenge`.

## Code

| File                                                                      | What                                                                                     |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/app/api/mcp/route.ts`                                                | The route: CORS, origin logging, rate limits and the SDK handler                         |
| `src/lib/mcp/otto-jobs.ts`                                                | The server: instructions, the two tools, query parsing and result text                   |
| `src/lib/job-feed/public-search.ts`                                       | `searchPublicJobs` and `publicJobById`: the bounded query and the public field whitelist |
| `src/app/api/mcp/route.test.ts`, `src/lib/job-feed/public-search.test.ts` | Both eras end to end, errors, limits, CORS, and what is left out                         |
