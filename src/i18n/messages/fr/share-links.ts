import type { Messages } from "..";
import type { Translation } from "../../types";

// Share links and the invite prompt, in French.
export default {
  dialog: {
    title: "Partager ce CV",
    description:
      "« {title} » en page web que toute personne ayant le lien peut lire, avec un téléchargement PDF. Aucun compte nécessaire pour l'ouvrir.",
    turnOff: "Désactiver le lien",
    cancel: "Annuler",
    make: "Créer le lien",
    checking: "Recherche d'un lien que tu as déjà créé",
    checkFailed: "Impossible de vérifier tes liens",
    tryAgain: "Réessayer",
    checkConnection: "Vérifie ta connexion, puis réessaie.",
    madeCopied: "Lien créé et copié. Colle-le où tu veux.",
    made: "Lien créé. Copie-le et envoie-le à qui tu veux.",
    updated: "Lien mis à jour vers cette version.",
    link: "Lien",
    behindTitle: "Ce lien affiche une ancienne version",
    update: "Mettre à jour le lien",
    behind: "Tu as modifié ce CV après l'avoir partagé. La mise à jour garde le même lien.",
  },
  list: {
    title: "Liens partagés",
    intro:
      "Toute personne ayant l'un de ces liens peut lire ce CV. Les vues ne comptent pas les aperçus de liens, les moteurs de recherche ni toi quand tu es connecté.",
    untitled: "CV",
    shown: "E-mail et téléphone visibles",
    hidden: "E-mail et téléphone masqués",
    indexed: "Dans les résultats de recherche",
    older: "Ancienne version",
    copyFor: "Copier le lien de {name}",
    openFor: "Ouvrir la page de {name} (s'ouvre dans un nouvel onglet)",
    turnOffFor: "Désactiver le lien de {name}",
    turnOff: "Désactiver",
  },
  copy: {
    copied: "Copié",
    copyLink: "Copier le lien",
    linkCopied: "Lien copié",
    cantCopy: "Impossible de copier",
    selectLink: "Sélectionne le lien et copie-le toi-même.",
    open: "Ouvrir la page",
    newTab: "(s'ouvre dans un nouvel onglet)",
  },
  actions: {
    signIn: "Connecte-toi pour partager un lien vers ton CV.",
    checkFailed:
      "Impossible de vérifier les liens que tu as déjà créés. Vérifie ta connexion, puis réessaie.",
    copied: "Copié",
    ready: "Lien prêt",
    onClipboard:
      "Ton lien de partage est dans le presse-papiers. Toute personne qui l'a peut lire ce CV.",
    fromSettings: "Copie-le depuis les réglages du lien.",
    settings: "Réglages",
    makeFailed: "Impossible de créer le lien",
    turnedOff: "Lien désactivé",
    turnedOffNote: "Quiconque l'ouvre maintenant voit qu'il ne fonctionne plus.",
    turnOffFailed: "Impossible de désactiver le lien",
    undo: "Annuler",
    fallback: "Un problème est survenu. Réessaie.",
  },
  invite: {
    text: "Partage ton lien : quand la personne s'inscrit et vérifie un CV, vous recevez tous les deux {fix} corrections de ligne en plus, et {tailor} versions adaptées sur Pro ou Max.",
    announcement:
      "Invite un ami et vous recevez tous les deux des extras. L'invitation est juste sous le bouton de téléchargement.",
    label: "Inviter un ami",
    heading: "Tu connais quelqu'un qui cherche un emploi ?",
    copied: "Copié",
    copy: "Copier le lien d'invitation",
    announced: "Lien d'invitation copié.",
    dismiss: "Fermer l'invitation",
    copyFailed: "Impossible de copier le lien",
    copyFailedNote: "Ton lien d'invitation est aussi sur la page de ton compte.",
  },
} satisfies Translation<Messages["shareLinks"]>;
