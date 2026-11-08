// Matching vocabulary for the keyword matcher. Deliberately small, explicit and sorted, so a
// reviewer can check every entry in one pass. Keys are folded (lowercase, no accents).

// One written form -> canonical tokens. Short forms expand to the long form rather than the other
// way round, so "GCP" still matches "Google Cloud Run" and "AWS" matches "Amazon Web Services".
// Values are already singular: the plural rule never runs on alias output.
export const TOKEN_ALIASES: ReadonlyMap<string, readonly string[]> = new Map([
  ["ai", ["artificial", "intelligence"]],
  ["aws", ["amazon", "web", "service"]],
  ["cicd", ["ci", "cd"]],
  ["css3", ["css"]],
  ["dotnet", [".net"]],
  ["gcp", ["google", "cloud"]],
  ["html5", ["html"]],
  ["js", ["javascript"]],
  ["k8s", ["kubernetes"]],
  // Listed so the plural rule can't shorten it to "kubernete" and break the "k8s" alias.
  ["kubernetes", ["kubernetes"]],
  ["ml", ["machine", "learning"]],
  ["postgre", ["postgresql"]],
  ["postgres", ["postgresql"]],
  ["reactjs", ["react"]],
  ["ts", ["typescript"]],
  ["ux", ["user", "experience"]],
  ["vuejs", ["vue"]],
]);

// Multi-word written forms, matched on consecutive words joined by spaces, hyphens or slashes.
// "java script" is here so "Java" can't match it; "node js" so "js" doesn't become "javascript".
export const PHRASE_ALIASES: readonly (readonly [readonly string[], readonly string[]])[] = [
  [["express", "js"], ["expressjs"]],
  [["go", "lang"], ["golang"]],
  [["google", "cloud", "platform"], ["google", "cloud"]],
  [["java", "script"], ["javascript"]],
  [["nest", "js"], ["nestjs"]],
  [["next", "js"], ["nextjs"]],
  [["node", "js"], ["nodejs"]],
  [["react", "js"], ["react"]],
  [["vue", "js"], ["vue"]],
];

// Tech names that are also everyday words. As a job keyword "Go" means the language, but in resume
// prose "go" is usually the verb and "node" a graph or cluster node. So resume text only counts the
// capitalized spelling, and not when it's hyphenated ("Go-to-market", "Go-live"). The trade-off:
// a skills list written in lowercase ("python, go") isn't matched for "Go"; "golang" always is.
export const AMBIGUOUS_WORDS: ReadonlyMap<string, { canonical: string; spelling: string }> =
  new Map([
    ["go", { canonical: "golang", spelling: "Go" }],
    ["node", { canonical: "nodejs", spelling: "Node" }],
  ]);
