import { describe, expect, it } from "vitest";
import { foldCase, termTokens, textTokens } from "./tokens";

const spans = (text: string) =>
  textTokens(text).map(({ value, start, end }) => [value, text.slice(start, end)]);

describe("termTokens", () => {
  it.each([
    ["Node.js", ["nodejs"]],
    ["CI/CD", ["ci", "cd"]],
    ["A/B testing", ["a", "b", "testing"]],
    ["C++ and C#", ["c++", "and", "c#"]],
    ["ASP.NET Core", ["asp", ".net", "core"]],
    ["AWS", ["amazon", "web", "service"]],
    ["Google Cloud Platform", ["google", "cloud"]],
    ["Go", ["golang"]],
    ["go-to-market", ["go", "to", "market"]],
    ["R&D", ["r&d"]],
    ["libraries", ["library"]],
    ["processes", ["process"]],
    ["APIs", ["api"]],
    ["apis", ["api"]],
    ["GPUs", ["gpu"]],
    ["gpus", ["gpu"]],
    ["VMs", ["vm"]],
    ["repos", ["repo"]],
    ["videos", ["video"]],
    ["analytics", ["analytics"]],
    ["status", ["status"]],
    ["Redis", ["redis"]],
    ["classes", ["class"]],
    ["iOS", ["ios"]],
    ["Kubernetes", ["kubernetes"]],
    ["Google's", ["google"]],
  ])("%s", (term, expected) => {
    expect(termTokens(term)).toEqual(expected);
  });
});

describe("textTokens", () => {
  it("keeps every token's span in the original text", () => {
    expect(spans("Built ASP.NET and Node.js apps")).toEqual([
      ["built", "Built"],
      ["asp", "ASP"],
      [".net", ".NET"],
      ["and", "and"],
      ["nodejs", "Node.js"],
      ["app", "apps"],
    ]);
  });

  it("gives every token of an alias the alias's span", () => {
    expect(spans("on AWS")).toEqual([
      ["on", "on"],
      ["amazon", "AWS"],
      ["web", "AWS"],
      ["service", "AWS"],
    ]);
    expect(spans("Google Cloud Platform")).toEqual([
      ["google", "Google Cloud Platform"],
      ["cloud", "Google Cloud Platform"],
    ]);
  });

  it("joins tokens across spaces, hyphens and slashes, but not commas or lines", () => {
    const joined = textTokens("front-end CI/CD x, y\nz").map((token) => token.joined);
    expect(joined).toEqual([false, true, true, true, true, false, false]);
  });

  it("only reads Go and Node as tech names when capitalized and not hyphenated", () => {
    expect(textTokens("Go").map((t) => t.value)).toEqual(["golang"]);
    expect(textTokens("go").map((t) => t.value)).toEqual(["go"]);
    expect(textTokens("GO").map((t) => t.value)).toEqual(["go"]);
    expect(textTokens("Go-live").map((t) => t.value)).toEqual(["go", "live"]);
    expect(textTokens("Node").map((t) => t.value)).toEqual(["nodejs"]);
    expect(textTokens("a node").map((t) => t.value)).toEqual(["a", "node"]);
  });

  it("returns nothing for text without words", () => {
    expect(textTokens("")).toEqual([]);
    expect(textTokens(" - , ; ")).toEqual([]);
  });
});

describe("foldCase", () => {
  it("lowercases and drops accents", () => {
    expect(foldCase("Crème BRÛLÉE")).toBe("creme brulee");
    expect(foldCase("Renée")).toBe("renee");
  });
});
