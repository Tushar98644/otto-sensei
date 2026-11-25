import type { Messages } from "..";
import type { Translation } from "../../types";

// The free job match tool's own words, in French.
export default {
  privacy: {
    pasted: "Le texte collé est vérifié dans ton navigateur et n'en sort jamais.",
    uploaded: "Le test se fait dans ton navigateur. Rien n'est conservé.",
  },
  sample: {
    try: "Essayer avec un exemple",
    putBack: "Remettre mon texte",
    clear: "Effacer l'exemple",
  },
  submit: "Tester la compatibilité",
  failed: {
    title: "Le test n'a pas pu se charger",
    body: "Vérifie ta connexion, puis réessaie.",
  },
  stale: {
    title: "Tu as modifié le texte depuis ce test",
    body: "Relance le test pour le mettre à jour.",
  },
  pasteText: "Coller le texte",
  resume: {
    title: "Ton CV",
    tabs: "Comment ajouter ton CV",
    upload: "Importer un fichier",
    label: "Texte du CV",
    placeholder: "Colle ton CV ici",
    hint: "Copie-le depuis ton fichier ou ton profil, titres compris.",
    problems: {
      reading: "Patiente un instant, Otto lit ton fichier.",
      noFile: "Choisis ton fichier CV, ou colle plutôt le texte.",
      empty: "Colle d'abord ton CV.",
      short: "C'est un peu court. Colle ton CV en entier.",
      long: "C'est plus long qu'un CV. Colle seulement ton CV.",
    },
  },
  upload: {
    label: "Importe ton CV, en PDF ou en Word",
    reading: "Lecture de {name}…",
    read: "{words} mots lus. Choisis un autre fichier pour le remplacer.",
    drop: "Dépose ton CV ici, ou choisis un fichier",
    formats: "PDF ou Word (.docx), jusqu'à {size}",
    kept: "Ton fichier est lu sur notre serveur pour en extraire le texte, puis supprimé. Nous ne le conservons pas.",
    failed:
      "Un problème est survenu à la lecture de ce fichier. Réessaie, ou colle plutôt le texte.",
    pictureOnly:
      "Ce fichier n'est qu'une image, donc le logiciel de recrutement voit une page blanche. Colle plutôt le texte de ton CV.",
  },
  post: {
    title: "L'offre d'emploi",
    tabs: "Comment ajouter l'offre d'emploi",
    link: "Coller un lien",
    label: "Texte de l'offre",
    placeholder: "Colle l'offre d'emploi ici, ou son lien",
    hint: "Colle-la en entier : missions, exigences et atouts.",
    problems: {
      empty: "Colle d'abord l'offre d'emploi.",
      short: "C'est un peu court. Colle l'offre en entier, pas seulement son titre.",
      long: "Ça dépasse {max} caractères. Retire la présentation de l'entreprise ou les avantages.",
    },
  },
  link: {
    label: "Lien de l'offre",
    hint: "Colle le lien et Otto le lit tout de suite. Fonctionne avec la plupart des sites d'emploi, mais pas LinkedIn ni Indeed.",
    reading: "Otto lit l'offre d'emploi…",
    readingStatus: "Otto lit l'offre d'emploi.",
    readStatus: "Offre lue : {title}.",
    untitledStatus: "sans titre",
    from: "Depuis le lien",
    untitled: "Offre sans titre",
    seeText: "Voir le texte lu par Otto",
    pasteInstead: "Coller plutôt le texte de l'offre",
    system: "Cette offre utilise {name}.",
    guide: "Lire le guide {name}",
    newTab: "(s'ouvre dans un nouvel onglet)",
    problems: {
      empty: "Colle d'abord le lien de l'offre.",
      notLink:
        "Ça ne ressemble pas à un lien. Copie-le depuis la barre d'adresse de ton navigateur.",
      tooLong: "Ce lien est trop long. Copie l'adresse de l'offre elle-même.",
      offline: "Tu sembles hors ligne. Vérifie ta connexion, ou colle plutôt le texte de l'offre.",
      failed: "Otto n'a pas pu lire ce lien pour le moment. Colle plutôt le texte de l'offre.",
    },
  },
  result: {
    eyebrow: "Vérification de mots gratuite",
    headline: {
      one: "Trouvée : {found} sur {count} compétence citée dans l'offre",
      other: "Trouvées : {found} sur {count} compétences citées dans l'offre",
    },
    none: "Aucune compétence ni aucun outil connu d'Otto dans cette offre",
    noneBody:
      "Otto cherche les compétences, outils, certifications et langues qu'il connaît, et cette offre n'en cite aucun. Colle l'offre en entier, avec ses exigences, et relance le test.",
    body: "Otto a cherché chaque compétence, outil et certification que cite l'offre, mot pour mot, comme le font les filtres par mots-clés. C'est un compte, pas une note.",
    count: "{label} : {found} sur {total} dans ton CV",
    listed: {
      one: "L'une d'elles n'apparaît que dans une liste, comme ta section compétences. Les recruteurs cherchent une ligne qui dit où tu l'as utilisée.",
      other:
        "{count} n'apparaissent que dans une liste, comme ta section compétences. Les recruteurs cherchent une ligne qui dit où tu les as utilisées.",
    },
    groups: {
      must: "Indispensables",
      nice: "Atouts",
      alsoNamed: "Aussi citées dans l'offre",
      all: "Compétences citées dans l'offre",
    },
    status: { shown: "Dans une ligne", listed: "Listée, pas démontrée", missing: "Absente" },
    missingHint:
      "Si tu l'as déjà utilisée, ajoute une ligne qui dit où et ce que tu as fait. Reprends les mots de l'offre.",
    asks: {
      label: "Aussi dans l'offre",
      title: "L'offre demande aussi",
      note: "Une vérification de mots ne peut pas juger les années d'expérience ni les diplômes. Compare-les toi-même avec tes dates et ta formation.",
    },
  },
  otto: {
    none: "Je n'ai trouvé aucune compétence ni aucun outil que je connais dans cette offre. Une offre qui liste ses exigences fonctionne mieux.",
    all: {
      one: "Ton CV cite la seule compétence que cite cette offre.",
      other: "Ton CV cite les {count} compétences que cite cette offre.",
    },
    mustLeft: {
      one: "{count} des {total} indispensables de l'offre n'est pas encore dans ton CV. Commence par là.",
      other:
        "{count} des {total} indispensables de l'offre ne sont pas encore dans ton CV. Commence par là.",
    },
    some: {
      one: "Ton CV cite {found} sur {count} compétence citée dans cette offre. Voici où.",
      other: "Ton CV cite {found} des {count} compétences citées dans cette offre. Voici où.",
    },
  },
  studio: {
    title: "Emporte les deux dans le studio",
    opens: {
      file: "Le studio gratuit lit ton fichier",
      sample: "Le studio gratuit s'ouvre avec le CV d'exemple",
      pasted: "Le studio gratuit s'ouvre avec le CV que tu as collé",
    },
    body: "{opens} et garde cette offre pour l'adaptation. Corrige les lignes à la main ou avec Otto ({fixes} corrections de ligne gratuites par mois) et télécharge un PDF propre. Avec Pro, Otto adapte ton CV à cette offre.",
    cta: "Corriger ces lignes avec Otto",
    failed: "Le studio ne s'est pas ouvert. Vérifie ta connexion, puis réessaie.",
  },
} satisfies Translation<Messages["matchCheck"]>;
