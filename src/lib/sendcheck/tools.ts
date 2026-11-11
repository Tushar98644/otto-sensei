import { monthIndex } from "./dates";

// A tool named in a job that ended before it existed is the first thing a technical screener
// notices. Dates are the earliest public release, checked by hand. Keep the list sorted. A false
// alarm reads as an accusation, so everyday words and names are guarded: `caseSensitive` ("react"),
// `plainWord` (not at a sentence start) and `context` ("Claude" the person, "Kafka" the writer).

export type ToolRelease = {
  name: string;
  aliases?: readonly string[];
  year: number;
  // 1-12. Without it, the tool counts as out from the start of the year.
  month?: number;
  caseSensitive?: boolean;
  plainWord?: boolean;
  // The bare name counts only when the same text also matches this.
  context?: RegExp;
};

const AI_CONTEXT =
  /\b(?:Anthropic|ChatGPT|GPT|OpenAI|Gemini|Copilot|Midjourney|Perplexity|LLMs?|AI|GenAI|chatbots?|prompts?|prompting)\b/;
const FRONT_END_CONTEXT =
  /\b(?:JavaScript|TypeScript|front[- ]?end|components?|SPA|single-page|Nuxt|Vuex|Pinia|React|Angular|HTML|CSS|web app)\b/i;

export const TOOL_RELEASES: readonly ToolRelease[] = [
  { name: "Ansible", year: 2012, month: 2 },
  { name: "AWS Lambda", year: 2014, month: 11 },
  { name: "BigQuery", year: 2010, month: 5 },
  { name: "Canva", year: 2013, month: 8 },
  { name: "ChatGPT", year: 2022, month: 11 },
  {
    name: "Claude",
    aliases: [
      "Claude AI",
      "Claude API",
      "Claude.ai",
      "Anthropic Claude",
      "Claude Instant",
      "Claude Sonnet",
      "Claude Opus",
      "Claude Haiku",
    ],
    year: 2023,
    month: 3,
    caseSensitive: true,
    context: AI_CONTEXT,
  },
  { name: "Claude Code", year: 2025, month: 2, caseSensitive: true },
  { name: "DALL-E", aliases: ["DALL·E", "DALLE"], year: 2021, month: 1 },
  { name: "Deno", year: 2018, month: 5, caseSensitive: true },
  { name: "Docker", year: 2013, month: 3 },
  { name: "Elasticsearch", year: 2010, month: 2 },
  // The invite-only preview opened in December 2015, before the 2016 launch.
  { name: "Figma", year: 2015, month: 12 },
  { name: "Flutter", year: 2017, month: 5, caseSensitive: true, plainWord: true },
  { name: "GA4", aliases: ["Google Analytics 4"], year: 2020, month: 10 },
  { name: "GitHub Actions", year: 2018, month: 10 },
  // Not plain "Copilot": that is also a pilot's job title.
  { name: "GitHub Copilot", year: 2021, month: 6 },
  { name: "Golang", year: 2009, month: 11 },
  { name: "GPT-3", year: 2020, month: 5 },
  { name: "GPT-4", year: 2023, month: 3 },
  { name: "GPT-4o", year: 2024, month: 5 },
  { name: "Grafana", year: 2014, month: 1 },
  { name: "GraphQL", year: 2015, month: 9 },
  { name: "Jetpack Compose", year: 2019, month: 5 },
  {
    name: "Kafka",
    aliases: ["Apache Kafka", "Kafka Streams", "Kafka Connect"],
    year: 2011,
    month: 1,
    caseSensitive: true,
    context:
      /\b(?:streams?|streaming|topics?|brokers?|consumers?|producers?|queues?|events?|messages|messaging|pipelines?|clusters?|ZooKeeper|Spark|Flink|RabbitMQ|microservices?)\b/i,
  },
  { name: "Kotlin", year: 2016, month: 2 },
  { name: "Kubernetes", aliases: ["K8s"], year: 2014, month: 6 },
  { name: "LangChain", year: 2022, month: 10 },
  { name: "Microsoft Teams", year: 2016, month: 11 },
  { name: "Midjourney", year: 2022, month: 2 },
  { name: "MongoDB", year: 2009, month: 2 },
  { name: "Next.js", aliases: ["NextJS"], year: 2016, month: 10 },
  { name: "Node.js", aliases: ["NodeJS"], year: 2009, month: 5 },
  { name: "OpenAI API", year: 2020, month: 6 },
  // "Power BI for Office 365" was announced in July 2013, before the 2015 standalone app.
  { name: "Power BI", year: 2013, month: 7 },
  { name: "PyTorch", year: 2016, month: 9 },
  {
    name: "React",
    aliases: ["React.js", "ReactJS"],
    year: 2013,
    month: 5,
    caseSensitive: true,
    plainWord: true,
  },
  { name: "React Native", year: 2015, month: 1, caseSensitive: true },
  { name: "Redis", year: 2009, month: 5 },
  { name: "Rust", year: 2015, month: 5, caseSensitive: true, plainWord: true },
  { name: "Slack", year: 2013, month: 8, caseSensitive: true, plainWord: true },
  { name: "Snapchat", year: 2011, month: 9 },
  { name: "Stable Diffusion", year: 2022, month: 8 },
  { name: "Supabase", year: 2020 },
  { name: "Svelte", year: 2016, month: 11, caseSensitive: true, plainWord: true },
  { name: "Swift", year: 2014, month: 6, caseSensitive: true, plainWord: true },
  { name: "SwiftUI", year: 2019, month: 6 },
  {
    name: "Tailwind",
    aliases: ["Tailwind CSS", "TailwindCSS"],
    year: 2017,
    month: 11,
    caseSensitive: true,
    context: FRONT_END_CONTEXT,
  },
  { name: "TensorFlow", year: 2015, month: 11 },
  { name: "Terraform", year: 2014, month: 7 },
  { name: "TikTok", year: 2017 },
  { name: "TypeScript", year: 2012, month: 10 },
  { name: "Vercel", year: 2020, month: 4 },
  { name: "Vite", year: 2020, month: 4, caseSensitive: true },
  {
    name: "Vue",
    aliases: ["Vue.js", "VueJS"],
    year: 2014,
    month: 2,
    caseSensitive: true,
    context: FRONT_END_CONTEXT,
  },
  { name: "YouTube Shorts", year: 2020, month: 9 },
];

export type ToolMention = {
  tool: ToolRelease;
  text: string;
  releasedAt: number;
  start: number;
  end: number;
};

export type FindToolsOptions = {
  // A job title or a name, not a sentence: its first word is capitalized because it is a name.
  heading?: boolean;
};

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const source = (names: readonly string[]) =>
  [...names]
    .sort((a, b) => b.length - a.length)
    .map((name) => escape(name).replace(/ /g, "\\s+"))
    .join("|");

// Not inside a longer word or name: "GPT-4" never matches in "GPT-4o", "React" never in "Reactor".
const bounded = (alternatives: string, flags: string) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}.-])(?:${alternatives})(?![\\p{L}\\p{N}]|[.-][\\p{L}\\p{N}])`,
    flags,
  );

const PATTERNS = TOOL_RELEASES.map((tool) => {
  const flags = tool.caseSensitive ? "gu" : "giu";
  const names = source([tool.name, ...(tool.aliases ?? [])]);
  return {
    tool,
    releasedAt: monthIndex(tool.year, (tool.month ?? 1) - 1),
    // The names alone, without the word-boundary checks: it matches wherever `pattern` could.
    quick: new RegExp(names, tool.caseSensitive ? "u" : "iu"),
    pattern: bounded(names, flags),
    bare: new RegExp(
      `^${escape(tool.name).replace(/ /g, "\\s+")}$`,
      tool.caseSensitive ? "u" : "iu",
    ),
  };
});

// One cheap scan first: the \p{L} boundary checks make each `pattern` slow to compile (~70 ms for
// the whole list), so they only compile for tools a line really names.
const ANY_TOOL = new RegExp(
  source(TOOL_RELEASES.flatMap((tool) => [tool.name, ...(tool.aliases ?? [])])),
  "iu",
);

// Start of the text or of a sentence, past any opening quote, bracket or list marker.
const SENTENCE_START = /(?:^|[.!?\n])[\s"'“‘(\[•*–—-]*$/u;

// When one name sits inside another ("Claude" in "Claude Code"), only the longer one counts.
export function findTools(text: string, options: FindToolsOptions = {}): ToolMention[] {
  if (!ANY_TOOL.test(text)) return [];
  const found: ToolMention[] = [];
  for (const { tool, releasedAt, quick, pattern, bare } of PATTERNS) {
    if (!quick.test(text)) continue;
    for (const match of text.matchAll(pattern)) {
      const start = match.index;
      const isBare = bare.test(match[0]);
      if (isBare && tool.context && !tool.context.test(text)) continue;
      if (isBare && tool.plainWord && !options.heading && SENTENCE_START.test(text.slice(0, start)))
        continue;
      found.push({ tool, text: match[0], releasedAt, start, end: start + match[0].length });
    }
  }
  return found.filter(
    (mention) =>
      !found.some(
        (other) =>
          other !== mention &&
          other.start <= mention.start &&
          other.end >= mention.end &&
          other.end - other.start > mention.end - mention.start,
      ),
  );
}
