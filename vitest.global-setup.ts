import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TestProject } from "vitest/node";
import { buildDatabase } from "./src/db/test-template";

declare module "vitest" {
  export interface ProvidedContext {
    pgliteTemplate: string;
  }
}

// Booting Postgres and running the migrations takes seconds; restoring the finished data
// directory takes well under one. So it's built once per run and every test file loads a copy.
export default async function setup(project: TestProject) {
  const dir = mkdtempSync(path.join(tmpdir(), "otto-pglite-"));
  const file = path.join(dir, "template.tar");
  const client = await buildDatabase();
  const dump = await client.dumpDataDir("none");
  await client.close();
  writeFileSync(file, Buffer.from(await dump.arrayBuffer()));
  project.provide("pgliteTemplate", file);
  return () => rmSync(dir, { recursive: true, force: true });
}
