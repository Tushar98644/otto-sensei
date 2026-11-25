import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  regions: {
    us: "États-Unis",
    uk: "Royaume-Uni",
    eu: "Union européenne",
    ca: "Canada",
  },
  regionNames: {
    us: "les États-Unis",
    uk: "le Royaume-Uni",
    eu: "l’UE",
    ca: "le Canada",
  },
  fields: {
    country: "Pays où tu vis",
    chooseCountry: "Choisis un pays",
    timeZone: "Fuseau horaire",
    chooseZone: "Choisis un fuseau horaire",
    rightsTitle: "Peux-tu y travailler sans parrainage de visa ?",
    rightsHint: "Oui si tu y es citoyen ou résident, ou si ton visa te permet déjà d’y travailler.",
    openTo: "Ouvert à",
    fullTime: "Postes à temps plein",
    contract: "Missions en contrat",
    remoteOnly: "Postes en télétravail seulement",
  },
  rights: {
    yes: "Oui",
    visa: "Visa requis",
    notSet: "Non précisé",
  },
  form: {
    pickType: "Choisis temps plein, contrat ou les deux.",
    saving: "Enregistrement…",
    saved: "Enregistré. Toi seul peux le voir.",
    failed: "Non enregistré : {reason}",
    failedFallback: "un problème est survenu.",
    idle: "S’enregistre au fur et à mesure.",
    looksRight: "C’est bon",
    tryAgain: "Réessayer",
  },
  hints: {
    resume: "Déduit de ton CV.",
    device: "Déduit du fuseau horaire de cet appareil.",
    home: "Oui pour {region}, car tu y vis. Change-le si ton visa dit autre chose.",
  },
  dialog: {
    title: "Où tu peux travailler",
    description: "Où tu vis, ton fuseau horaire et tes besoins de visa. Toi seul peux voir ça.",
    done: "Terminé",
  },
  prompt: {
    guessed:
      "Otto a mis Oui pour {region}, car tu sembles y vivre. Vérifie, et ajoute tes besoins de visa.",
    add: "Ajoute où tu peux travailler, et Offres signalera celles qui disent ne pas pouvoir t’embaucher.",
    check: "Vérifier où tu peux travailler",
    addButton: "Ajouter où tu peux travailler",
  },
  setupHidden: {
    title: "Liste de configuration masquée",
    description: "Tous les réglages restent sur la page Compte.",
  },
  card: {
    eyebrow: "Avant de postuler",
    title: "Peuvent-ils t’embaucher depuis chez toi ?",
    rules: {
      one: "{count} règle dans cette offre",
      other: "{count} règles dans cette offre",
    },
    checked: ", vérifiées avec ton profil de travail",
    none: "Aucune règle trouvée sur le lieu de vie, les visas, les horaires ou le type de poste. Otto ne repère que des phrases simples, alors survole l’offre aussi.",
    loadFailed:
      "Impossible de charger ton profil de travail, donc ceci n’est pas vérifié avec lui.",
    signedOut: "Connecte-toi et ajoute ton profil de travail pour qu’on vérifie pour toi.",
    addProfile: "Ajoute ton profil de travail pour qu’on vérifie pour toi.",
    gaps: "Complète le reste de ton profil de travail pour répondre à celles marquées À vérifier.",
    tryAgain: "Réessayer",
    signIn: "Se connecter",
    edit: "Modifier le profil de travail",
    add: "Ajouter un profil de travail",
    signInReason:
      "Connecte-toi pour enregistrer un profil de travail. Otto vérifie les offres avec.",
    jobLocation: "Lieu du poste : {place}",
    postSays: "L’offre dit : ",
    verdicts: {
      ok: "OK",
      check: "À vérifier",
      blocked: "Sans doute bloqué",
    },
    ruleLabels: {
      location: "Où tu vis",
      authorization: "Droit de travailler",
      sponsorship: "Parrainage de visa",
      time_zone: "Fuseau horaire",
      work_type: "Type de poste",
    },
  },
} satisfies Translation<Messages["workProfile"]>;
