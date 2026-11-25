import type { Messages } from "..";
import type { Translation } from "../../types";

// The sign-in form, dialog and terms line, in German.
export default {
  google: "Weiter mit Google",
  googleOff: "Die Anmeldung mit Google funktioniert, sobald Supabase eingerichtet ist.",
  or: "oder",
  email: "E-Mail",
  emailPlaceholder: "du@beispiel.de",
  emailMe: "Code per E-Mail senden",
  badEmail: "Gib deine E-Mail-Adresse ein, z. B. name@beispiel.de.",
  badCode: "Gib den {length}-stelligen Code aus der E-Mail ein.",
  sent: "Wir haben einen {length}-stelligen Code an {email} geschickt.",
  sentNew: "Wir haben einen neuen Code an {email} geschickt.",
  codeSent: "Wir haben einen {length}-stelligen Code an <b>{email}</b> geschickt.",
  codeSentNew:
    "Wir haben einen neuen Code an <b>{email}</b> geschickt. Nur der neueste funktioniert.",
  devCode: "Entwicklermodus: Dein Code ist <b>{code}</b>",
  codeLabel: "{length}-stelliger Code",
  codeHint:
    "Tipp ihn ein oder füg ihn ein. Du bist angemeldet, sobald alle {length} Ziffern drin sind.",
  signIn: "Anmelden",
  sending: "Wird gesendet…",
  resendIn: "Erneut senden in {seconds} s",
  resend: "Code erneut senden",
  otherEmail: "Andere E-Mail verwenden",
  done: "Du bist angemeldet.",
  terms:
    "Neu hier? Damit erstellst du dein kostenloses Konto. Wenn du fortfährst, stimmst du den <link>Nutzungsbedingungen</link> und der <link>Datenschutzerklärung</link> zu.",
  newTab: "(öffnet in neuem Tab)",
  dialog: {
    reason:
      "Mit einem kostenlosen Konto kann Otto Zeilen korrigieren und deinen Lebenslauf anpassen.",
    otto: "Nutze Google oder einen 6-stelligen Code per E-Mail, dann geht's da weiter, wo du warst.",
  },
  upgrade: {
    trial: "Melde dich an, um deine Testphase zu starten",
    upgrade: "Melde dich für dein Upgrade an",
    otto: "Melde dich zuerst an. Dann bringe ich dich direkt zur Kasse.",
    description: "Nutze Google oder einen 6-stelligen Code per E-Mail. Kein Passwort.",
  },
  account: "Melde dich an, um deinen Tarif und deine Nutzung in diesem Monat zu sehen.",
  signedOut: {
    safe: "Deine Lebensläufe sind sicher in deinem Konto. Melde dich erneut an, um sie hier zu sehen.",
    kept: {
      one: "1 Lebenslauf ist noch nicht fertig gesichert und deshalb noch in diesem Browser.",
      other:
        "{count} Lebensläufe sind noch nicht fertig gesichert und deshalb noch in diesem Browser.",
    },
  },
  gate: {
    sessionEnded: "Du wurdest abgemeldet. Melde dich erneut an, um weiterzumachen.",
    tryAgain: "Versuch es jetzt noch mal.",
    backIn: "Du bist drin. Machen wir da weiter, wo du warst.",
    reasons: {
      fix: "Melde dich an, um mit mir Zeilen zu korrigieren. Mit Free hast du {limit} pro Monat.",
      tailor: "Melde dich an und teste {plan} {days} Tage lang, um mit mir anzupassen.",
      letter:
        "Melde dich an und teste {plan} {days} Tage lang für Anschreiben, Nachrichten und Antworten.",
      import: "Melde dich an und teste {plan} {days} Tage lang für KI-Lesungen.",
      draft: "Melde dich an und teste {plan} {days} Tage lang, um mit mir Entwürfe zu erstellen.",
      github: "Melde dich an und teste {plan} {days} Tage lang für Entwürfe aus GitHub.",
    },
  },
} satisfies Translation<Messages["signIn"]>;
