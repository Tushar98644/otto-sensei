import account from "./account";
import accountMenu from "./account-menu";
import api from "./api";
import app from "./app";
import applications from "./applications";
import ats from "./ats";
import common from "./common";
import compare from "./compare";
import dashboard from "./dashboard";
import email from "./email";
import emails from "./emails";
import home from "./home";
import interview from "./interview";
import jobForm from "./job-form";
import jobMatch from "./job-match";
import jobs from "./jobs";
import legal from "./legal";
import letters from "./letters";
import lint from "./lint";
import login from "./login";
import matchCheck from "./match-check";
import onboarding from "./onboarding";
import portfolio from "./portfolio";
import prep from "./prep";
import pricing from "./pricing";
import product from "./product";
import resumeExamples from "./resume-examples";
import resumeTemplates from "./resume-templates";
import seo from "./seo";
import site from "./site";
import studio from "./studio";
import studioDownload from "./studio-download";
import studioEditor from "./studio-editor";
import studioSections from "./studio-sections";
import studioTailor from "./studio-tailor";

// The source of truth: every other locale is checked against these, key by key.
const en = {
  account,
  accountMenu,
  api,
  app,
  applications,
  ats,
  common,
  compare,
  dashboard,
  email,
  emails,
  home,
  interview,
  jobForm,
  jobMatch,
  jobs,
  legal,
  letters,
  lint,
  login,
  matchCheck,
  onboarding,
  portfolio,
  prep,
  pricing,
  product,
  resumeExamples,
  resumeTemplates,
  seo,
  site,
  studio,
  studioDownload,
  studioEditor,
  studioSections,
  studioTailor,
} as const;

export default en;
