import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL(".", import.meta.url));

// Imports kept at runtime: not `import type`, all-type braces or import().
const STATEMENT =
  /^(?:import|export)\s+(type\s+)?([^"';]*?)\s*from\s*["']([^"']+)["']|^import\s+["']([^"']+)["']/gm;

function onlyTypes(clause: string): boolean {
  const names = /^\{([^}]*)\}$/
    .exec(clause.trim())?.[1]
    ?.split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  return names !== undefined && names.length > 0 && names.every((name) => name.startsWith("type "));
}

function runtimeImports(source: string): string[] {
  const specs: string[] = [];
  for (const [, typeOnly, clause = "", from, sideEffect] of source.matchAll(STATEMENT)) {
    if (sideEffect) specs.push(sideEffect);
    else if (from && !typeOnly && !onlyTypes(clause)) specs.push(from);
  }
  return specs;
}

function resolve(spec: string, importer: string): string {
  if (!spec.startsWith("@/") && !spec.startsWith(".")) return spec;
  const base = spec.startsWith("@/")
    ? path.join(SRC, spec.slice(2))
    : path.resolve(path.dirname(importer), spec);
  const tries = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
  const found = tries.find((file) => existsSync(file) && statSync(file).isFile());
  if (!found) throw new Error(`Can't resolve ${spec} from ${importer}`);
  return path.relative(SRC, found);
}

// The import chain to every module the entry loads up front, packages included.
function chains(entry: string): Map<string, string[]> {
  const reached = new Map([[entry, [entry]]]);
  const queue = [entry];
  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    if (!/\.tsx?$/.test(file)) continue;
    const chain = reached.get(file) ?? [];
    for (const spec of runtimeImports(readFileSync(path.join(SRC, file), "utf8"))) {
      const target = resolve(spec, path.join(SRC, file));
      if (reached.has(target)) continue;
      reached.set(target, [...chain, target]);
      if (target.endsWith(".ts") || target.endsWith(".tsx")) queue.push(target);
    }
  }
  return reached;
}

function pathsTo(entry: string, wanted: (module: string) => boolean): string[] {
  return [...chains(entry)]
    .filter(([module]) => wanted(module))
    .map(([, chain]) => chain.join(" -> "));
}

const zod = (module: string) => module === "zod" || module.startsWith("zod/");

describe("code a page loads before anyone clicks", () => {
  it("follows real imports: the request schemas do load zod", () => {
    expect(pathsTo("lib/api/types.ts", zod)).toEqual(["lib/api/types.ts -> zod"]);
    expect(
      pathsTo("lib/setup/weak-line.ts", (module) => module.startsWith("lib/lint/")),
    ).not.toEqual([]);
  });

  it.each([
    "components/studio/studio-shell.tsx",
    "components/portfolio/portfolio-page.tsx",
    "components/dashboard/applications/prep/interview-prep-page.tsx",
  ])("%s loads no zod", (entry) => {
    expect(pathsTo(entry, zod)).toEqual([]);
  });

  it("the root error page loads no copy table", () => {
    expect(
      pathsTo("app/global-error.tsx", (module) => module === "components/mascot/lines.ts"),
    ).toEqual([]);
    expect([...chains("components/mascot/error-lines.ts").keys()]).toEqual([
      "components/mascot/error-lines.ts",
    ]);
  });

  it("the setup predicates load no lint rules", () => {
    expect(pathsTo("lib/setup/checklist.ts", (module) => module.startsWith("lib/lint/"))).toEqual(
      [],
    );
  });

  it("the portfolio view loads no PDF font tables", () => {
    const fonts = (module: string) =>
      module === "lib/pdf/text.ts" || module === "lib/pdf/coverage.ts";
    expect(pathsTo("lib/portfolio/view.ts", fonts)).toEqual([]);
  });

  it.each([
    [
      "components/dashboard/letters/letters-page.tsx",
      "components/dashboard/letters/write-dialog.tsx",
    ],
    [
      "components/dashboard/applications/hub/application-hub.tsx",
      "components/dashboard/letters/write-dialog.tsx",
    ],
    [
      "components/dashboard/applications/hub/application-hub.tsx",
      "components/dashboard/applications/application-dialog.tsx",
    ],
    [
      "components/dashboard/applications/applications-page.tsx",
      "components/dashboard/applications/application-dialog.tsx",
    ],
    [
      "components/dashboard/interview/interview-home.tsx",
      "components/dashboard/interview/prepare-dialog.tsx",
    ],
    ["components/dashboard/sidebar.tsx", "components/feedback/feedback-dialog.tsx"],
    ["components/studio/account-menu.tsx", "components/feedback/feedback-dialog.tsx"],
    [
      "app/[lang]/(marketing)/account/_components/account-view.tsx",
      "components/account/upgrade-dialog.tsx",
    ],
    ["components/eligibility/eligibility-card.tsx", "components/account/sign-in-dialog.tsx"],
  ])("%s loads %s only when it opens", (entry, dialog) => {
    expect(pathsTo(entry, (module) => module === dialog)).toEqual([]);
  });
});
