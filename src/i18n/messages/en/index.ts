import account from "./account";
import api from "./api";
import app from "./app";
import applications from "./applications";
import common from "./common";
import dashboard from "./dashboard";
import email from "./email";
import emails from "./emails";
import home from "./home";
import interview from "./interview";
import jobs from "./jobs";
import letters from "./letters";
import lint from "./lint";
import login from "./login";
import portfolio from "./portfolio";
import prep from "./prep";
import pricing from "./pricing";
import product from "./product";
import seo from "./seo";
import site from "./site";
import studio from "./studio";

// The source of truth: every other locale is checked against these, key by key.
const en = {
  account,
  api,
  app,
  applications,
  common,
  dashboard,
  email,
  emails,
  home,
  interview,
  jobs,
  letters,
  lint,
  login,
  portfolio,
  prep,
  pricing,
  product,
  seo,
  site,
  studio,
} as const;

export default en;
