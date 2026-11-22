import { describe, expect, it } from "vitest";
import { claimsAboutPerson, guardPersonFacts, sentencesOf, sourcesOf } from "./interview-guards";

const SOURCES = sourcesOf([
  "Built the payouts pipeline on Postgres and SQS, cutting failed payouts by 30%",
  "We're hiring a Senior Backend Engineer. You'll work with Kafka.",
]);

describe("claimsAboutPerson", () => {
  it("spots claims about the person's past, not hypotheticals or general know-how", () => {
    expect(claimsAboutPerson("You built the payouts pipeline on Postgres.")).toBe(true);
    expect(claimsAboutPerson("How did you make retries safe?")).toBe(true);
    expect(claimsAboutPerson("Tie it to your SQS consumer.")).toBe(true);
    expect(claimsAboutPerson("I cut costs by half.")).toBe(true);
    expect(claimsAboutPerson("How would you add a cache in front of Postgres?")).toBe(false);
    expect(claimsAboutPerson("You'd pick Redis with a TTL for this.")).toBe(false);
    expect(claimsAboutPerson("Use an HNSW index for approximate nearest neighbours.")).toBe(false);
  });

  it("counts openers like Mention as personal only when asked to", () => {
    expect(claimsAboutPerson("Mention Kafka streams")).toBe(false);
    expect(claimsAboutPerson("Mention Kafka streams", true)).toBe(true);
    expect(claimsAboutPerson("Explain LRU eviction", true)).toBe(false);
  });
});

describe("sentencesOf", () => {
  it("splits on sentence ends but not on decimals or names like Next.js", () => {
    expect(sentencesOf("Cut it by 3.5 seconds. Then use Next.js caching! Why?")).toEqual([
      "Cut it by 3.5 seconds.",
      "Then use Next.js caching!",
      "Why?",
    ]);
  });
});

describe("guardPersonFacts", () => {
  it("lets general knowledge name any concept and keep its numbers", () => {
    expect(
      guardPersonFacts(
        "Use Redis with a TTL and LRU eviction. Return 429 with Retry-After.",
        SOURCES,
      ),
    ).toBe("Use Redis with a TTL and LRU eviction. Return 429 with Retry-After.");
  });

  it("masks unsourced numbers in a claim and keeps sourced ones", () => {
    expect(guardPersonFacts("You cut failed payouts by 30% and latency by 45%.", SOURCES)).toBe(
      "You cut failed payouts by 30% and latency by [number].",
    );
  });

  it("drops text whose claim names something the resume and post don't", () => {
    expect(guardPersonFacts("Your Redis cluster kept it fast.", SOURCES)).toBeNull();
    expect(guardPersonFacts("Walk through your Kafka consumers.", SOURCES)).toBe(
      "Walk through your Kafka consumers.",
    );
  });

  it("treats every sentence as personal for a deep-dive question", () => {
    const question = "The payouts pipeline ran on Postgres and DynamoDB. Why both?";
    expect(guardPersonFacts(question, SOURCES)).toBe(question);
    expect(guardPersonFacts(question, SOURCES, { personal: true })).toBeNull();
    expect(
      guardPersonFacts(
        "The payouts pipeline ran on Postgres and SQS. How did retries stay safe?",
        SOURCES,
        {
          personal: true,
        },
      ),
    ).toBe("The payouts pipeline ran on Postgres and SQS. How did retries stay safe?");
  });
});
