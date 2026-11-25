import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  gone: "Diese Zeilen sind nicht mehr da",
  goneNote: "Schreib sie nochmal aus deinem Karrieretagebuch.",
  noResume: "Dieser Lebenslauf ist nicht mehr in deiner Liste",
  alreadyOn: "Diese Zeilen stehen schon bei diesem Job",
  added: {
    one: "{count} Zeile aus deinem Karrieretagebuch hinzugefügt",
    other: "{count} Zeilen aus deinem Karrieretagebuch hinzugefügt",
  },
  changed: "Du hast es seitdem geändert",
  useUndo: "Nutz Rückgängig oben im Editor.",
  title: "Aus deinem Karrieretagebuch",
  description: "Nimm die Zeilen an, die stimmen. Nichts kommt in deinen Lebenslauf, bevor du es tust.",
  notNow: "Jetzt nicht",
  addCount: {
    one: "{count} Zeile hinzufügen",
    other: "{count} Zeilen hinzufügen",
  },
  addLines: "Zeilen hinzufügen",
  fromNotes: {
    one: "{count} Zeile aus deinen Notizen",
    other: "{count} Zeilen aus deinen Notizen",
  },
  note: "Jede Zeile kommt aus dem, was du geschrieben hast. Wo eine Zahl helfen würde und du keine genannt hast, habe ich eine Lücke für dich gelassen.",
  addTo: "Hinzufügen zu",
  addingTo: "Wird hinzugefügt zu <b>{job}</b>",
  noJob: "Füg den Job zuerst zu diesem Lebenslauf hinzu und versuch es dann nochmal.",
  fromMonths: "Aus deinen Notizen von {months}: „{quote}“",
  needsFact: "Otto braucht eine Angabe: {blank}",
  onlyIfKnown: "Nur wenn du es weißt",
  accepted: "Angenommen",
  accept: "Annehmen",
  pressAgain: "Nochmal drücken, um sie wegzulassen.",
  fillBlank: "Füll die Lücke aus, um sie anzunehmen, oder lass sie weg.",
  jobNumber: "Job {number}",
} satisfies Translation<Messages["careerLogLines"]>;
