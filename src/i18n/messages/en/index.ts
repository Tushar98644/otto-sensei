import account from "./account";
import accountMenu from "./account-menu";
import api from "./api";
import app from "./app";
import applications from "./applications";
import common from "./common";
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
import upgrade from "./upgrade";

// The source of truth: every other locale is checked against these, key by key.
const en = {
  account,
  accountMenu,
  api,
  app,
  applications,
  common,
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
  upgrade,
} as const;

export default en;
