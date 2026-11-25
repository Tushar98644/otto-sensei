import type { Translations } from "..";
import account from "./account";
import applications from "./applications";
import dashboard from "./dashboard";
import interview from "./interview";
import jobs from "./jobs";
import letters from "./letters";
import lint from "./lint";
import portfolio from "./portfolio";
import portfolioContent from "./portfolioContent";
import share from "./share";

// Spanish (neutral Latin American, tú): list each namespace here as its file lands.
const es: Translations = {
  account,
  applications,
  dashboard,
  interview,
  jobs,
  letters,
  lint,
  portfolio,
  portfolioContent,
  share,
};

export default es;
