import account from "./account";
import accountMenu from "./account-menu";
import api from "./api";
import app from "./app";
import applications from "./applications";
import ats from "./ats";
import calendar from "./calendar";
import common from "./common";
import compare from "./compare";
import dashboard from "./dashboard";
import email from "./email";
import emails from "./emails";
import formats from "./formats";
import github from "./github";
import home from "./home";
import interview from "./interview";
import jobForm from "./job-form";
import jobMatch from "./job-match";
import jobs from "./jobs";
import jobsShared from "./jobs-shared";
import legal from "./legal";
import letters from "./letters";
import lint from "./lint";
import login from "./login";
import matchCheck from "./match-check";
import matchReasons from "./match-reasons";
import onboarding from "./onboarding";
import otto from "./otto";
import portfolio from "./portfolio";
import portfolioContent from "./portfolio-content";
import portfolioDesigns from "./portfolio-designs";
import prep from "./prep";
import pricing from "./pricing";
import product from "./product";
import resumeExamples from "./resume-examples";
import resumeTemplates from "./resume-templates";
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
  ats,
  calendar,
  common,
  compare,
  dashboard,
  email,
  emails,
  formats,
  github,
  home,
  interview,
  jobForm,
  jobMatch,
  jobs,
  jobsShared,
  legal,
  letters,
  lint,
  login,
  matchCheck,
  matchReasons,
  onboarding,
  otto,
  portfolio,
  portfolioContent,
  portfolioDesigns,
  prep,
  pricing,
  product,
  resumeExamples,
  resumeTemplates,
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
