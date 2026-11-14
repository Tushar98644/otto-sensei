import { vi } from "vitest";

export type FakeCall = { url: string; headers: Headers; body: string };
export type FakeHandler = (url: URL, headers: Headers, body: string) => Response | undefined;

export type FakeGitHub = {
  calls: FakeCall[];
  paths: () => string[];
  restore: () => void;
};

export function installFakeGitHub(handler: FakeHandler): FakeGitHub {
  return fakeGitHub(handler, () => true).fake;
}

type HeldGitHub = FakeGitHub & { release: () => void };

// Every answer waits for release(), so a test can see which calls were under way together.
export function holdFakeGitHub(handler: FakeHandler): HeldGitHub {
  let open = false;
  const { fake, waiting } = fakeGitHub(handler, () => open);
  return {
    ...fake,
    release: () => {
      open = true;
      for (const answer of waiting.splice(0)) answer();
    },
  };
}

function fakeGitHub(handler: FakeHandler, isOpen: () => boolean) {
  const calls: FakeCall[] = [];
  const waiting: (() => void)[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const headers = new Headers(init?.headers);
    const body = typeof init?.body === "string" ? init.body : "";
    calls.push({ url: url.href, headers, body });
    if (!isOpen()) await new Promise<void>((resolve) => waiting.push(resolve));
    return handler(url, headers, body) ?? json({ message: "Not Found" }, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  const fake: FakeGitHub = {
    calls,
    paths: () => calls.map((call) => {
      const url = new URL(call.url);
      return `${url.pathname}${url.search}`;
    }),
    restore: () => vi.unstubAllGlobals(),
  };
  return { fake, waiting };
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers as Record<string, string> | undefined) },
  });
}

export function text(body: string, init: ResponseInit = {}): Response {
  return new Response(body, { ...init, headers: { "content-type": "text/plain", ...(init.headers as Record<string, string> | undefined) } });
}

export function aiAnswer(output: unknown): Response {
  return json({
    id: "gen-test",
    provider: "Test",
    choices: [{ finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(output) } }],
    usage: { prompt_tokens: 100, completion_tokens: 50 },
  });
}

export function isAIEndpoint(url: URL): boolean {
  return url.hostname === "openrouter.ai";
}

export type RawRepo = {
  id: number;
  full_name: string;
  description?: string | null;
  homepage?: string | null;
  language?: string | null;
  topics?: string[];
  stargazers_count?: number;
  forks_count?: number;
  fork?: boolean;
  private?: boolean;
  archived?: boolean;
  pushed_at?: string;
};

export function rawRepo(fullName: string, overrides: Partial<RawRepo> = {}): RawRepo {
  return {
    id: Math.abs(hash(fullName)),
    full_name: fullName,
    description: null,
    homepage: null,
    language: "TypeScript",
    topics: [],
    stargazers_count: 0,
    forks_count: 0,
    fork: false,
    private: false,
    archived: false,
    pushed_at: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

export type RawPull = {
  id: number;
  number: number;
  title: string;
  repository_url: string;
  body: string | null;
  pull_request: { merged_at: string | null };
  user: { login: string };
};

export function rawPull(
  repo: string,
  number: number,
  author: string,
  overrides: Partial<RawPull> = {},
): RawPull {
  return {
    id: 9_000_000 + number,
    number,
    title: `Change ${number}`,
    repository_url: `https://api.github.com/repos/${repo}`,
    body: null,
    pull_request: { merged_at: "2026-09-15T12:00:00Z" },
    user: { login: author },
    ...overrides,
  };
}

export function searchResult(items: RawPull[]): { total_count: number; incomplete_results: boolean; items: RawPull[] } {
  return { total_count: items.length, incomplete_results: false, items };
}

function hash(value: string): number {
  let h = 0;
  for (const char of value) h = (h * 31 + char.charCodeAt(0)) | 0;
  return h || 1;
}
