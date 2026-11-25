import type { ExampleTranslation } from "../../../examples";
import { accountExecutive } from "./account-executive";
import { accountant } from "./accountant";
import { administrativeAssistant } from "./administrative-assistant";
import { backendDeveloper } from "./backend-developer";
import { businessAnalyst } from "./business-analyst";
import { businessDevelopment } from "./business-development";
import { customerSupport } from "./customer-support";
import { dataAnalyst } from "./data-analyst";
import { dataEngineer } from "./data-engineer";
import { dataScientist } from "./data-scientist";
import { devopsEngineer } from "./devops-engineer";
import { digitalMarketing } from "./digital-marketing";
import { financialAnalyst } from "./financial-analyst";
import { fresher } from "./fresher";
import { frontendDeveloper } from "./frontend-developer";
import { graphicDesigner } from "./graphic-designer";
import { hr } from "./hr";
import { marketingManager } from "./marketing-manager";
import { operationsManager } from "./operations-manager";
import { productManager } from "./product-manager";
import { projectManager } from "./project-manager";
import { qaEngineer } from "./qa-engineer";
import { softwareEngineer } from "./software-engineer";
import { uiUxDesigner } from "./ui-ux-designer";

// The resume examples in Spanish, by slug.
const examples: ExampleTranslation = {
  "account-executive": accountExecutive,
  accountant,
  "administrative-assistant": administrativeAssistant,
  "backend-developer": backendDeveloper,
  "business-analyst": businessAnalyst,
  "business-development": businessDevelopment,
  "customer-support": customerSupport,
  "data-analyst": dataAnalyst,
  "data-engineer": dataEngineer,
  "data-scientist": dataScientist,
  "devops-engineer": devopsEngineer,
  "digital-marketing": digitalMarketing,
  "financial-analyst": financialAnalyst,
  fresher,
  "frontend-developer": frontendDeveloper,
  "graphic-designer": graphicDesigner,
  hr,
  "marketing-manager": marketingManager,
  "operations-manager": operationsManager,
  "product-manager": productManager,
  "project-manager": projectManager,
  "qa-engineer": qaEngineer,
  "software-engineer": softwareEngineer,
  "ui-ux-designer": uiUxDesigner,
};

export default examples;
