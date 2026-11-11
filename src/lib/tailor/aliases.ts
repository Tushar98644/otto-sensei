// Deliberately small and sorted so a reviewer can check every entry. Keys are folded.

// Short forms expand to the long form, so "GCP" matches "Google Cloud Run". Values are already
// singular: the plural rule never runs on alias output.
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

// "Go" in a job keyword is the language, but in resume prose usually the verb. So resume text
// counts only the capitalized, unhyphenated spelling; a lowercase skills list misses "Go" ("golang"
// always hits).
export const AMBIGUOUS_WORDS: ReadonlyMap<string, { canonical: string; spelling: string }> =
  new Map([
    ["go", { canonical: "golang", spelling: "Go" }],
    ["node", { canonical: "nodejs", spelling: "Node" }],
  ]);
