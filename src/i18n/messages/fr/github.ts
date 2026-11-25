import type { Messages } from "..";
import type { Translation } from "../../types";

// Adding projects from GitHub, in French.
export default {
  offer: {
    links: "Ton CV renvoie vers github.com/{username}",
    text: "Choisis tes meilleurs dépôts publics et Otto rédige les lignes du projet. Tu les vérifies d'abord.",
    button: "Ajouter des projets de mon GitHub",
  },
  connect: {
    title: "Importer depuis GitHub",
    signInFirst: "Connecte-toi d'abord, puis relie ton compte GitHub.",
    checkFailed: "Impossible de vérifier ton compte GitHub pour l'instant.",
    signIn: "Se connecter",
    tryAgain: "Réessayer",
    connectTitle: "Relie ton GitHub",
    connectDescription:
      "Otto n'ajoute que du travail venant d'un compte GitHub qui t'appartient. Connecte-toi une fois à GitHub pour le relier.",
    connect: "Relier GitHub",
    reads:
      "Otto lit tes dépôts publics et tes pull requests fusionnées. Il ne publie jamais rien sur GitHub.",
    description:
      "Choisis des dépôts publics et des pull requests fusionnées, et Otto en tire des lignes de projet.",
    find: "Trouver mon travail",
    cancel: "Annuler",
    connectedAs: "Connecté en tant que <b>{login}</b>",
    notYou: " · Ce n'est pas toi ? ",
    disconnect: "Déconnecter",
    signInReason: "Connecte-toi pour relier ton compte GitHub.",
    offline: "Impossible de joindre Otto pour l'instant. Vérifie ta connexion.",
    startFailed: "Impossible de commencer à relier GitHub. Réessaie.",
    disconnectFailed: "Impossible de déconnecter GitHub. Réessaie.",
    notConnected: "GitHub n'est pas relié",
    errors: {
      taken: "Ce compte GitHub est déjà relié à un autre compte Otto Sensei.",
      failed: "GitHub ne s'est pas relié. Réessaie.",
    },
  },
  pick: {
    title: "Choisis quoi ajouter",
    description: "Travail public de {username}. Jusqu'à {repos} dépôts et {pulls} pull requests.",
    repoCount: { one: "{count} dépôt", other: "{count} dépôts" },
    pullCount: { one: "{count} pull request", other: "{count} pull requests" },
    otto: "Choisis ton meilleur travail. J'écrirai des lignes uniquement à partir de ce que montre GitHub.",
    nothing: "Je n'ai trouvé ni dépôt public ni pull request fusionnée pour {username}.",
    back: "Retour",
    draft: { one: "Rédiger {count} projet", other: "Rédiger {count} projets" },
    draftNone: "Rédiger les projets",
    tabs: "Quoi importer",
    repos: "Dépôts",
    pulls: "Pull requests",
    picked: "{repos} dépôts sur {reposMax} et {pulls} pull requests sur {pullsMax} choisis",
    search: "Chercher dans tes dépôts",
    searchPlaceholder: "Cherche par nom, langage ou sujet",
    noRepos:
      "Aucun dépôt public à toi sur GitHub. Les forks sont exclus, car ils partent du travail de quelqu'un d'autre.",
    noMatch: "Aucun dépôt ne correspond à « {query} ».",
    pullsBusy:
      "GitHub était trop occupé pour lister les pull requests. Reviens en arrière et réessaie dans une minute.",
    noPulls: "Aucune pull request fusionnée dans les dépôts publics d'autres personnes.",
    onResume: "Sur ton CV",
    stars: { one: "{count} étoile", other: "{count} étoiles" },
    archived: "Archivé",
    merged: "Fusionnée en {month}",
  },
  review: {
    title: "Garde les projets que tu veux",
    description:
      "Otto a choisi ton meilleur travail public. Décoche ce que tu ne veux pas ; rien n'est ajouté tant que tu ne le dis pas.",
    projects: { one: "{count} projet", other: "{count} projets" },
    lines: { one: "{count} ligne", other: "{count} lignes" },
    usedAI:
      "J'ai utilisé uniquement des faits et des chiffres de GitHub. Décoche ce que tu ne veux pas.",
    plain: "Ces lignes reprennent les mots de GitHub. Fais-les tiennes après les avoir ajoutées.",
    pickOther: "Choisir d'autres dépôts",
    add: { one: "Ajouter {count} projet", other: "Ajouter {count} projets" },
    addNone: "Ajouter les projets",
    already: "Déjà sur ton CV",
    noLines: "Pas encore de lignes. Tu pourras les écrire après l'ajout.",
  },
  added: {
    title: {
      one: "{count} projet ajouté depuis GitHub",
      other: "{count} projets ajoutés depuis GitHub",
    },
    skipped: "Un CV contient {max} projets au maximum, donc {skipped} n'ont pas tenu.",
    where: "Ils sont dans Projets. Modifie n'importe quelle ligne pour la faire tienne.",
    full: "Ce CV a déjà {max} projets",
    makeRoom: "Retire-en un pour faire de la place.",
    undo: "Projets ajoutés depuis GitHub",
  },
} satisfies Translation<Messages["github"]>;
