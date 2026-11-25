import type { Messages } from "..";
import type { Translation } from "../../types";

// The sign-in page around the form, in German.
export default {
  meta: {
    title: "Anmelden",
    description:
      "Melde dich mit Google oder deiner E-Mail an. Kein Passwort nötig: Wir können dir einen 6-stelligen Code schicken.",
  },
  heading: {
    signIn: "Anmelden",
    trial: "Melde dich an, um deine Testphase zu starten",
    upgrade: "Melde dich für dein Upgrade an",
    jobs: "Melde dich an, um deine passenden Jobs zu sehen",
    portfolio: "Melde dich an, um dein Portfolio zu erstellen",
  },
  otto: "Nutze Google, oder ich schicke dir einen 6-stelligen Code per E-Mail. Kein Passwort zum Merken.",
  studio: "Willst du nur einen Lebenslauf prüfen? <link>Öffne das Studio</link>. Kein Konto nötig.",
  googleFailed:
    "Die Anmeldung mit Google wurde nicht abgeschlossen. Versuch es noch einmal oder nutze deine E-Mail.",
  signingIn: "Du wirst angemeldet",
} satisfies Translation<Messages["login"]>;
