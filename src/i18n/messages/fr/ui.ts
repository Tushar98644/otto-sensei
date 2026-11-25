import type { Messages } from "..";
import type { Translation } from "../../types";

// Shared controls, voice typing, feedback and notifications, in French.
export default {
  close: "Fermer",
  optional: "(facultatif)",
  dropOne: "Dépose un fichier à la fois.",
  fileCheck: {
    unsupported: "Ce type de fichier n'est pas pris en charge.",
    unsupportedKinds: "Ce type de fichier n'est pas pris en charge. Choisis un fichier {kinds}.",
    kinds: "{first} ou {last}",
    empty: "Ce fichier est vide. Choisis-en un autre.",
    tooBig: "Ce fichier est trop lourd. La limite est de {limit}.",
  },
  voice: {
    start: "Parler au lieu de taper",
    listening: "Arrêter l'écoute",
    recording: "Arrêter l'enregistrement",
    sending: "Transcription en cours…",
    fullTitle: "Ce champ est plein",
    full: "Une partie de ce que tu as dit n'a pas tenu. Retire quelques mots pour en ajouter.",
    problems: {
      micBlocked: {
        title: "Otto ne t'entend pas",
        description: "Autorise le micro dans ton navigateur pour parler à Otto.",
      },
      noMic: {
        title: "Otto ne trouve pas ton micro",
        description:
          "Vérifie qu'il est branché et qu'aucune autre appli ne l'utilise, puis réessaie.",
      },
      noSpeech: {
        title: "Otto n'a rien entendu",
        description: "Réessaie un peu plus près du micro.",
      },
      offline: {
        title: "La dictée a besoin d'internet",
        description: "Vérifie ta connexion et réessaie, ou tape plutôt.",
      },
      signIn: { title: "Connecte-toi d'abord", description: "Connecte-toi pour parler à Otto." },
      tooMany: { title: "Fais une petite pause", description: "Réessaie dans quelques minutes." },
      failed: {
        title: "Impossible de transcrire",
        description: "Réessaie, ou tape plutôt.",
      },
    },
  },
  feedback: {
    button: "Donner ton avis",
    title: "Donner ton avis",
    description:
      "Dis-nous ce qui a cassé ou ce qui t'aiderait. Nous voyons aussi depuis quelle page tu l'as envoyé.",
    cancel: "Annuler",
    send: "Envoyer",
    about: "De quoi s'agit-il ?",
    kinds: { bug: "Problème", idea: "Idée", other: "Autre" },
    placeholders: {
      bug: "Qu'as-tu fait, et que s'est-il passé ?",
      idea: "Qu'est-ce qui rendrait Otto plus utile ?",
      other: "Qu'as-tu en tête ?",
    },
    note: "Ton message",
    tooShort: "Écris quelques mots de plus.",
    sent: "Merci. Ton message a été envoyé.",
  },
  notifications: {
    title: "Notifications",
    unread: "Notifications, {count} non lues",
    loadFailed: "Impossible de charger tes notifications.",
    tryAgain: "Réessayer",
    empty:
      "Rien pour l'instant. Marque une offre comme postulée et je te rappellerai ici de relancer.",
    openApplications: "Ouvrir les candidatures",
    new: "Nouveau : ",
    writeIt: "Rédige-la pour moi",
    done: "Fait",
    snooze: "Reporter",
    snoozeDays: "Reporter de {days} jours",
    markedDone: "Relance marquée comme faite",
    snoozed: "Reporté au {day}",
    reminderFailed: "Impossible de modifier le rappel",
    thankYou: "Écrire un remerciement",
    howItWent: "Comment ça s'est passé",
    outcomes: { next_round: "Tour suivant", waiting: "En attente", rejected: "Refusé" },
    nextRound: "Au tour suivant avec {company}",
    nextRoundNote: "Ajoute la date sur la carte quand tu la connais.",
    closed: "Déplacée dans Clôturées",
    closedNote: "{company}. Elle compte quand même dans ton bilan de ce qui marche.",
    waiting: "En attente de réponse",
    remind: "Je te rappellerai de relancer {company} le {day}.",
    saveFailed: "Impossible d'enregistrer",
  },
} satisfies Translation<Messages["ui"]>;
