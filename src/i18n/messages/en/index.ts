import account from "./account";
import api from "./api";
import common from "./common";
import dashboard from "./dashboard";
import emails from "./emails";
import home from "./home";
import jobForm from "./jobForm";
import jobs from "./jobs";
import lint from "./lint";
import login from "./login";
import portfolio from "./portfolio";
import pricing from "./pricing";
import product from "./product";
import seo from "./seo";
import site from "./site";
import studio from "./studio";
import studioEditor from "./studioEditor";
import studioTailor from "./studioTailor";

// The source of truth: every other locale is checked against these, key by key.
const en = {
  account,
  api,
  common,
  dashboard,
  emails,
  home,
  jobForm,
  jobs,
  lint,
  login,
  portfolio,
  pricing,
  product,
  seo,
  site,
  studio,
  studioEditor,
  studioTailor,
} as const;

export default en;
