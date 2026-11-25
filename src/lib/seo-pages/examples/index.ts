import type { Resume } from "@/lib/resume/schema";
import { buildResume } from "./build";
import { accountExecutive } from "./roles/account-executive";
import { accountant } from "./roles/accountant";
import { administrativeAssistant } from "./roles/administrative-assistant";
import { backendDeveloper } from "./roles/backend-developer";
import { businessAnalyst } from "./roles/business-analyst";
import { businessDevelopment } from "./roles/business-development";
import { customerSupport } from "./roles/customer-support";
import { dataAnalyst } from "./roles/data-analyst";
import { dataEngineer } from "./roles/data-engineer";
import { dataScientist } from "./roles/data-scientist";
import { devopsEngineer } from "./roles/devops-engineer";
import { digitalMarketing } from "./roles/digital-marketing";
import { financialAnalyst } from "./roles/financial-analyst";
import { fresher } from "./roles/fresher";
import { frontendDeveloper } from "./roles/frontend-developer";
import { graphicDesigner } from "./roles/graphic-designer";
import { hr } from "./roles/hr";
import { marketingManager } from "./roles/marketing-manager";
import { operationsManager } from "./roles/operations-manager";
import { productManager } from "./roles/product-manager";
import { projectManager } from "./roles/project-manager";
import { qaEngineer } from "./roles/qa-engineer";
import { softwareEngineer } from "./roles/software-engineer";
import { uiUxDesigner } from "./roles/ui-ux-designer";
import type { RoleExample } from "./types";
import type { Words } from "../words";

export type {
  ExampleLine,
  ExampleNote,
  ExampleQuestion,
  ExampleSkills,
  RoleExample,
} from "./types";

// A new role is one file in ./roles plus a line here; the tests hold it to the same bar.
const EXAMPLES = [
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
  dataEngineer,
  devopsEngineer,
  qaEngineer,
  accountExecutive,
  marketingManager,
  graphicDesigner,
  projectManager,
  businessAnalyst,
  financialAnalyst,
  accountant,
  operationsManager,
  administrativeAssistant,
] as const;

export const ROLE_EXAMPLES: readonly RoleExample[] = EXAMPLES;

type Example = (typeof EXAMPLES)[number];
export type ExampleSlug = Example["slug"];

// What stays as written in every language: the made-up person's contacts, employers, schools, dates and links.
type ExampleFixed =
  | "slug"
  | "occupation"
  | "titles"
  | "updated"
  | "related"
  | "template"
  | "sectionOrder"
  | "email"
  | "phone"
  | "location"
  | "url"
  | "company"
  | "school"
  | "startDate"
  | "endDate"
  | "link"
  | "issuer"
  | "date";

// The person's name stays; a project or certification name is written out, kept as is when it's a proper name.
type ResumeText<R> = Omit<R, "basics"> &
  (R extends { basics: infer B } ? { basics: Omit<B, "name"> } : unknown);

// The skills job posts name stay as US posts write them, since Otto's match check reads them in English; their groups are translated.
type Labels<L> = { readonly [I in keyof L]: Omit<L[I], "items"> };

type ExampleOf<S extends ExampleSlug> = Extract<Example, { slug: S }>;

// One example's words in another language, in the English example's shape.
export type ExampleWords<S extends ExampleSlug> = Words<
  Omit<ExampleOf<S>, "resume" | "skills"> & {
    resume: ResumeText<ExampleOf<S>["resume"]>;
    skills: Labels<ExampleOf<S>["skills"]>;
  },
  ExampleFixed
>;

export type ExampleTranslation = { readonly [S in ExampleSlug]: ExampleWords<S> };

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
