import type { Translations } from "..";
import applications from "./applications";
import dashboard from "./dashboard";
import interview from "./interview";
import jobs from "./jobs";
import letters from "./letters";

// German (du): list each namespace here as its file lands.
const de: Translations = { applications, dashboard, interview, jobs, letters };

export default de;
