import type { Translations } from "..";
import api from "./api";
import app from "./app";
import applications from "./applications";
import dashboard from "./dashboard";
import email from "./email";
import interview from "./interview";
import jobs from "./jobs";
import letters from "./letters";
import lint from "./lint";
import prep from "./prep";

// German (du): list each namespace here as its file lands.
const de: Translations = {
  api,
  app,
  applications,
  dashboard,
  email,
  interview,
  jobs,
  letters,
  lint,
  prep,
};

export default de;
