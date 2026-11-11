import { beforeEach, describe, expect, it } from "vitest";
import type { JobMatchesResponse } from "@/lib/api/types";
import {
  FRESH_MS,
  forgetMatchesExcept,
  forgetMatchesForTests,
  isFreshMatch,
  matchCacheKey,
  recallMatches,
  rememberMatches,
} from "./match-cache";

const answer = (requestId: string) => ({ requestId }) as unknown as JobMatchesResponse;

beforeEach(() => forgetMatchesForTests());

describe("match cache", () => {
  it("keys answers by account and request, never across accounts", () => {
    const body = { view: "matches", page: 1 };
    const mine = matchCacheKey("user-1", body);
    const theirs = matchCacheKey("user-2", body);
    expect(mine).not.toBe(theirs);
    expect(matchCacheKey(null, body)).toBeNull();
    expect(matchCacheKey("user-1", null)).toBeNull();

    rememberMatches(mine ?? "", answer("a"), 1_000);
    expect(recallMatches(mine)?.data).toEqual(answer("a"));
    expect(recallMatches(theirs)).toBeNull();
  });

  it("counts an answer as fresh for five minutes from when it arrived", () => {
    rememberMatches("k", answer("a"), 10_000);
    const entry = recallMatches("k");
    expect(isFreshMatch(entry, 10_000 + FRESH_MS - 1)).toBe(true);
    expect(isFreshMatch(entry, 10_000 + FRESH_MS)).toBe(false);
    expect(isFreshMatch(null, 10_000)).toBe(false);
  });

  it("keeps only the newest answers", () => {
    for (let i = 0; i < 20; i++) rememberMatches(`k${i}`, answer(String(i)), i);
    expect(recallMatches("k0")).toBeNull();
    expect(recallMatches("k19")?.data).toEqual(answer("19"));
    // Writing one again makes it the newest, so it outlives older ones.
    rememberMatches("k8", answer("8b"), 8);
    for (let i = 20; i < 31; i++) rememberMatches(`k${i}`, answer(String(i)), i);
    expect(recallMatches("k8")?.data).toEqual(answer("8b"));
    expect(recallMatches("k9")).toBeNull();
  });

  it("drops every other answer after a save", () => {
    rememberMatches("matches", answer("a"), 1);
    rememberMatches("saved", answer("b"), 2);
    forgetMatchesExcept("matches");
    expect(recallMatches("matches")?.data).toEqual(answer("a"));
    expect(recallMatches("saved")).toBeNull();
  });
});
