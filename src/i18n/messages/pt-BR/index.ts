import type { Translations } from "..";
import applications from "./applications";
import dashboard from "./dashboard";
import interview from "./interview";
import jobs from "./jobs";
import letters from "./letters";

// Brazilian Portuguese (você): list each namespace here as its file lands.
const ptBR: Translations = { applications, dashboard, interview, jobs, letters };

export default ptBR;
