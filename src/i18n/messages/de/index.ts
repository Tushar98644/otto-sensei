import type { Translations } from "..";
import accountMenu from "./account-menu";
import api from "./api";
import app from "./app";
import applications from "./applications";
import common from "./common";
import dashboard from "./dashboard";
import email from "./email";
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
import prep from "./prep";
import pricing from "./pricing";
import product from "./product";
import site from "./site";
import studio from "./studio";
import studioDownload from "./studio-download";
import studioEditor from "./studio-editor";
import studioSections from "./studio-sections";
import studioTailor from "./studio-tailor";

// German (du): list each namespace here as its file lands.
const de: Translations = {
  accountMenu,
  api,
  app,
  applications,
  common,
  dashboard,
  email,
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
  prep,
  pricing,
  product,
  site,
  studio,
  studioDownload,
  studioEditor,
  studioSections,
  studioTailor,
};

export default de;
