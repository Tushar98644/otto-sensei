import type { Translations } from "..";
import applications from "./applications";
import dashboard from "./dashboard";
import interview from "./interview";
import jobs from "./jobs";
import letters from "./letters";
import lint from "./lint";

// French (tu): list each namespace here as its file lands.
const fr: Translations = { applications, dashboard, interview, jobs, letters, lint };

export default fr;
