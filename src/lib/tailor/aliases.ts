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

// "java script" stops "Java" matching it; "node js" stops "js" becoming "javascript".
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

export const AMBIGUOUS_WORDS: ReadonlyMap<string, { canonical: string; spelling: string }> =
  new Map([
    ["go", { canonical: "golang", spelling: "Go" }],
    ["node", { canonical: "nodejs", spelling: "Node" }],
  ]);
