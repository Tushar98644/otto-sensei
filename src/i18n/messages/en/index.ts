import account from "./account";
import api from "./api";
import common from "./common";
import dashboard from "./dashboard";
import emails from "./emails";
import home from "./home";
import jobMatch from "./job-match";
import jobs from "./jobs";
import legal from "./legal";
import login from "./login";
import matchCheck from "./match-check";
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
  common,
  dashboard,
  emails,
  home,
  jobMatch,
  jobs,
  legal,
  login,
  matchCheck,
  portfolio,
  pricing,
  product,
  seo,
  site,
  studio,
} as const;

export default en;
