import account from "./account";
import accountMenu from "./account-menu";
import api from "./api";
import app from "./app";
import applications from "./applications";
import calendar from "./calendar";
import common from "./common";
import dashboard from "./dashboard";
import email from "./email";
import emails from "./emails";
import fileChecks from "./file-checks";
import formats from "./formats";
import github from "./github";
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
import otto from "./otto";
import portfolio from "./portfolio";
import portfolioContent from "./portfolio-content";
import prep from "./prep";
import pricing from "./pricing";
import product from "./product";
import seo from "./seo";
import share from "./share";
import shareLinks from "./share-links";
import signIn from "./sign-in";
import site from "./site";
import studio from "./studio";
import studioDownload from "./studio-download";
import studioEditor from "./studio-editor";
import studioSections from "./studio-sections";
import studioTailor from "./studio-tailor";
import ui from "./ui";
import upgrade from "./upgrade";

// The source of truth: every other locale is checked against these, key by key.
const en = {
  account,
  accountMenu,
  api,
  app,
  applications,
  calendar,
  common,
  dashboard,
  email,
  emails,
  fileChecks,
  formats,
  github,
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
  otto,
  portfolio,
  portfolioContent,
  prep,
  pricing,
  product,
  seo,
  share,
  shareLinks,
  signIn,
  site,
  studio,
  studioDownload,
  studioEditor,
  studioSections,
  studioTailor,
  ui,
  upgrade,
} as const;

export default en;
