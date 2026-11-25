import account from "./account";
import api from "./api";
import applications from "./applications";
import common from "./common";
import dashboard from "./dashboard";
import emails from "./emails";
import home from "./home";
import interview from "./interview";
import jobs from "./jobs";
import letters from "./letters";
import login from "./login";
import portfolio from "./portfolio";
import pricing from "./pricing";
import product from "./product";
import seo from "./seo";
import site from "./site";
import studio from "./studio";

// The source of truth: every other locale is checked against these, key by key.
const en = {
  account,
  api,
  applications,
  common,
  dashboard,
  emails,
  home,
  interview,
  jobs,
  letters,
  login,
  portfolio,
  pricing,
  product,
  seo,
  site,
  studio,
} as const;

export default en;
