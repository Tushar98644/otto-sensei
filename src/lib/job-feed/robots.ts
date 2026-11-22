// robots.txt as RFC 9309 reads it: our own group, else "*"; the longest matching rule wins, Allow on a tie.

type Rule = { allow: boolean; pattern: string };

function groups(body: string): Map<string, Rule[]> {
  const out = new Map<string, Rule[]>();
  let agents: string[] = [];
  let inRules = false;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (inRules) agents = [];
      inRules = false;
      const agent = value.toLowerCase();
      agents.push(agent);
      if (!out.has(agent)) out.set(agent, []);
    } else if (key === "allow" || key === "disallow") {
      inRules = true;
      if (value === "") continue;
      for (const agent of agents) out.get(agent)!.push({ allow: key === "allow", pattern: value });
    }
  }
  return out;
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}${anchored ? "$" : ""}`).test(path);
}

export function robotsAllows(body: string, agent: string, path: string): boolean {
  const all = groups(body);
  const rules = all.get(agent.toLowerCase()) ?? all.get("*") ?? [];
  let best: Rule | null = null;
  for (const rule of rules) {
    if (!matches(rule.pattern, path)) continue;
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow)
    )
      best = rule;
  }
  return best?.allow ?? true;
}
