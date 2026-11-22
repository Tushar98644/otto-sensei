import type { Resume } from "@/lib/resume/schema";
import { buildResume } from "./build";
import { backendDeveloper } from "./roles/backend-developer";
import { businessDevelopment } from "./roles/business-development";
import { customerSupport } from "./roles/customer-support";
import { dataAnalyst } from "./roles/data-analyst";
import { dataScientist } from "./roles/data-scientist";
import { digitalMarketing } from "./roles/digital-marketing";
import { fresher } from "./roles/fresher";
import { frontendDeveloper } from "./roles/frontend-developer";
import { hr } from "./roles/hr";
import { productManager } from "./roles/product-manager";
import { softwareEngineer } from "./roles/software-engineer";
import { uiUxDesigner } from "./roles/ui-ux-designer";
import type { RoleExample } from "./types";

export type {
  ExampleLine,
  ExampleNote,
  ExampleQuestion,
  ExampleSkills,
  RoleExample,
} from "./types";

// A new role is one file in ./roles plus a line here; the tests hold it to the same bar.
export const ROLE_EXAMPLES: readonly RoleExample[] = [
  softwareEngineer,
  fresher,
  dataAnalyst,
  frontendDeveloper,
  backendDeveloper,
  dataScientist,
  productManager,
  uiUxDesigner,
  digitalMarketing,
  businessDevelopment,
  hr,
  customerSupport,
];

export function exampleBySlug(slug: string): RoleExample | undefined {
  return ROLE_EXAMPLES.find((example) => example.slug === slug);
}

export function exampleResume(example: RoleExample, now = Date.now()): Resume {
  return buildResume(example.resume, now);
}

export function relatedExamples(example: RoleExample): RoleExample[] {
  return example.related.flatMap((slug) => exampleBySlug(slug) ?? []);
}

export function latestExampleUpdate(): string {
  return (
    ROLE_EXAMPLES.map((example) => example.updated)
      .sort()
      .at(-1) ?? ""
  );
}
