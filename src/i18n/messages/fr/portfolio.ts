import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  title: "Portfolio",
  about: "Un site portfolio créé à partir de ton CV, hébergé pour toi à ton propre lien.",
  loadFailed: "Ton portfolio ne s'est pas chargé",
  tryAgain: "Réessayer",
  checkConnection: "Vérifie ta connexion, puis réessaie.",
  otto: {
    pick: "Choisis un design et je le remplis avec ton CV. Ouvre-en un pour le voir avec le tien.",
    pickThin:
      "Ces aperçus montrent un exemple entièrement rempli. Choisis-en un et je le remplis avec le tien.",
    draft: "J'ai rempli ceci avec ton CV. Rien n'est en ligne tant que tu ne publies pas.",
    live: {
      one: "Ta page est en ligne, avec {count} visite pour l'instant.",
      other: "Ta page est en ligne, avec {count} visites pour l'instant.",
    },
    liveNoViews: "Ta page est en ligne. Envoie le lien à quelqu'un et les visites s'affichent ici.",
    behind: "Ton CV a changé depuis cette copie. Mets la page à jour quand tu veux.",
    noResume:
      "Le CV derrière cette page n'est pas dans ce navigateur. La page garde sa propre copie.",
    noResumes: "Ajoute d'abord un CV, et j'en ferai une page.",
    previews:
      "Chaque design ci-dessous montre ton propre CV. Ouvre-en un en pleine page pour le voir comme tes visiteurs.",
    previewsSample:
      "Ces aperçus montrent une page exemple. Ajoute un CV et je dessine chaque design avec le tien.",
    previewsThin:
      "Ces aperçus montrent une page exemple entièrement remplie. Passe à la tienne quand tu veux.",
  },
  facts: {
    projects: { one: "{count} projet", other: "{count} projets" },
    jobs: { one: "{count} poste", other: "{count} postes" },
    skills: { one: "{count} compétence", other: "{count} compétences" },
  },
  resumeLink: {
    linked: "Ta page renvoie vers ton CV partagé, pour que tes visiteurs le lisent en entier.",
    hidden:
      "Ton CV partagé affiche des coordonnées que cette page masque, donc la page n'inclut pas le lien.",
    share:
      "Partage ce CV et ta page renverra vers lui, pour que tes visiteurs le lisent en entier.",
  },
  views: {
    none: "Pas encore de visites",
    count: { one: "{count} visite", other: "{count} visites" },
  },
  saving: "Enregistrement…",
  savedLive: "Enregistré sur ta page en ligne",
  saved: "Toutes les modifications sont enregistrées",
  publishNote:
    "La publication est incluse dans Pro, et nous hébergeons la page pour toi. D'ici là, toi seul peux la voir.",
  store: {
    makeFailed: "Impossible de créer ton portfolio",
    saveFailed: "Impossible d'enregistrer",
    notLoaded: "Ton portfolio n'est pas encore chargé. Réessaie dans un instant.",
    live: "Ta page est en ligne",
    liveDetail: "Toute personne qui a l'adresse peut l'ouvrir maintenant.",
    down: "Ta page est hors ligne",
    downDetail: "Quiconque ouvre l'adresse voit maintenant qu'elle ne fonctionne pas.",
    undo: "Annuler",
    failed: "Un problème est survenu. Réessaie.",
  },
  tabs: { design: "Design", content: "Contenu", sections: "Sections", settings: "Réglages" },
  editLabel: "Modifier ton portfolio",
  offer: {
    title: "Afficher « {name} » à la place ?",
    use: "Utiliser ce CV",
    keep: "Garder l'actuel",
    shows: "Tu as un portfolio. Il affiche maintenant {current}.",
    quoted: "« {name} »",
    another: "un autre CV",
  },
  inUseNote: "Utilisé sur ta page.",
  notYetNote: "Pas encore sur ta page.",
  useDesign: "Utiliser ce design",
  useDesignNamed: "Utiliser ce design : {name}",
  bar: {
    copied: "Copié",
    copyLink: "Copier le lien",
    publish: "Publier",
    live: "En ligne",
    draft: "Brouillon",
    newTab: "(s'ouvre dans un nouvel onglet)",
    openPage: "Ouvrir la page",
    pageActions: "Actions de la page",
    moreActions: "Plus d'actions pour la page",
    takeDown: "Mettre hors ligne",
    takeDownHint: "Les visiteurs voient que la page est hors ligne. Tu peux annuler.",
    linkCopied: "Lien copié",
    preview: "Aperçu",
  },
  start: {
    noResume: "Pas encore de CV",
    waving: "Otto la loutre, qui fait coucou",
    title: "Choisis un design",
    intro:
      "Tu peux changer de design à tout moment. Rien n'est en ligne tant que tu ne publies pas.",
    makeFrom: "Créer à partir de",
  },
  upgrade: {
    eyebrow: "Hébergé pour toi, rien à configurer",
    offlineTitle: "Ta page est hors ligne pour le moment",
    title: "Un vrai portfolio, en ligne à ton propre lien",
    offline:
      "Les portfolios sont inclus dans Pro et Max. Ta page et ses réglages sont conservés, elle reviendra telle quelle.",
    pitch:
      "Tes projets, ton parcours, tes écrits et tes liens dans l'un des {count} designs, remplis à partir de ton CV.",
    liveAt: "En ligne à <b>{url}</b>",
    hosted: "On l'héberge : aucun domaine, serveur ou code à configurer.",
    flows:
      "Les modifications de ton CV arrivent toutes seules, et tu peux changer de design à tout moment.",
    comesWith: "Les portfolios sont inclus dans Pro et Max.",
    trial:
      "{price} pour {days} jours, puis {plan} par mois. Annule quand tu veux avant la fin de l'essai.",
    fullPage: "Pleine page",
  },
  previewFull: "Voir {name} en pleine page",
  settings: {
    madeFrom: "Créé à partir de",
    resume: "CV",
    notHere: "Un CV qui n'est pas dans ce navigateur",
    upToDate: "Garder la page à jour",
    sync: "Synchroniser avec mon CV",
    syncHint: "Activé : les modifications du CV apparaissent toutes seules sur la page.",
    update: "Mettre la page à jour avec mon dernier CV",
    search: "Moteurs de recherche",
    indexing: "Laisser les moteurs de recherche la trouver",
    indexingHint:
      "Désactivé : on demande à Google et aux autres de la garder hors des résultats de recherche.",
    views: "Visites",
    viewsNote:
      "{views}. Le compte n'inclut pas tes visites, les aperçus de liens ni les moteurs de recherche.",
  },
  address: {
    title: "Adresse",
    livesAt: "Ta page se trouve à /p/",
    keepsOld: "Si tu la changes, l'ancienne adresse fonctionne encore pendant {days} jours.",
    rules: "Lettres minuscules, chiffres et tirets.",
    free: "/p/{slug} est disponible.",
    checking: "Vérification…",
    save: "Enregistrer",
    problems: {
      too_short: "Utilise au moins {min} lettres ou chiffres.",
      too_long: "Pas plus de {max} caractères.",
      characters: "Utilise des lettres, des chiffres et des tirets simples.",
      reserved: "Cette adresse est réservée à l'app. Essaie-en une autre.",
    },
  },
  delete: {
    done: "Ta page est supprimée",
    doneDetail: "Son adresse et son contenu n'existent plus. Ton CV n'est pas touché.",
    failed: "Impossible de supprimer ta page",
    confirm:
      "Cela supprime la page, son adresse et tout ce que tu as ajouté pour elle. C'est irréversible.",
    delete: "Supprimer la page",
    keep: "La garder",
    start: "Supprimer cette page",
  },
  picker: {
    title: "Design",
    intro: "Tous les designs utilisent le même contenu. Change quand tu veux, rien n'est perdu.",
    inUse: "Utilisé",
    groups: { picks: "Nos favoris", more: "Plus de designs" },
  },
  full: {
    previewOnly: "Aperçu seulement : pas encore en ligne.",
    previous: "Design précédent",
    next: "Design suivant",
    position: "{at} sur {count}",
    width: "Largeur de page",
    close: "Fermer l'aperçu",
  },
  preview: {
    label: "Aperçu",
    width: "Largeur de l'aperçu",
    desktop: "Ordinateur",
    phone: "Téléphone",
    asVisitors: "{name} · tel que tes visiteurs le voient",
    fullScreen: "Plein écran",
    region: "Aperçu de ta page avec {name}. Fais défiler pour tout voir.",
  },
  source: {
    yours: "Ta page",
    sample: "Page exemple",
    group: "Page affichée dans les aperçus",
    own: "Ta page, avec ton propre contenu",
    sampleShort: "Exemple :",
    sampleLong: "Page exemple :",
    madeUpShort: "une personne fictive",
    madeUpLong: "{name}, une personne fictive",
  },
  visibility: {
    linkSettings: "Réglages du lien",
    shareResume: "Partager ce CV",
    onPage: "Sur ta page",
    shown:
      "{shown} sur {total} affichées. Une section masquée garde son contenu, prête à être réactivée.",
    legend: "Sections de ta page",
    hidden: "Masquée sur ta page",
    contact: "Coordonnées",
    contactIntro:
      "Les deux sont désactivées au départ, pour qu'une page publique ne les donne jamais sans que tu le demandes.",
    showEmail: "Afficher mon e-mail",
    noEmail: "Ton CV n'a pas d'e-mail.",
    emailOn: "Activé : les visiteurs voient {email}.",
    emailOff: "Désactivé : {email} n'apparaît pas sur la page.",
    showPhone: "Afficher mon téléphone",
    noPhone: "Ton CV n'a pas de numéro de téléphone.",
    phoneOn: "Activé : les visiteurs voient {phone}.",
    phoneOff: "Désactivé : {phone} n'apparaît pas sur la page.",
    resumeLink: "Lien vers le CV",
  },
  sections: {
    about: "À propos",
    projects: "Projets",
    experience: "Expérience",
    skills: "Compétences",
    education: "Formation",
    certifications: "Certifications",
    extras: "Autres sections",
    links: "Liens",
  },
  templates: {
    navy: "Une page bleu marine foncé avec des sections numérotées, des onglets par poste et de grands projets à la une.",
    dock: "Une colonne calme qui apparaît en fondu, avec des lignes d'expérience, des cartes de projets et un dock flottant.",
    reel: "Un immense titre qui tourne au-dessus d'une sphère 3D, puis chaque projet dans le cadre d'un appareil.",
    bento: "Tout en tuiles : présentation, technos, heure locale en direct, GitHub et projets.",
    cv: "Un CV dessiné à l'échelle : panneaux quadrillés, tes initiales en 3D, postes regroupés par entreprise.",
    prose:
      "Les mots d'abord, avec des pastilles de couleur, des projets regroupés par type, puis tes conférences et tes écrits.",
    folio:
      "Ta page en app de notes : une note épinglée sur toi et des liens rapides, puis une note pour chaque partie de ton travail.",
    paper:
      "Dessiné à la main : ton nom au feutre au-dessus d'un renard au bord de la mer, des cartes à l'encre et des soulignés ondulés, de jour comme de nuit.",
    gazette:
      "Ta page en grand journal de 1926 : un titre en gothique, ta manchette, des colonnes filetées et un bandeau d'infos.",
    terminal:
      "Un terminal qui affiche ton résumé à l'ouverture, puis laisse les visiteurs taper help, work ou contact.",
    brutal:
      "Des blocs de couleur criards aux épaisses bordures noires, des ombres dures qui s'enfoncent et des étiquettes en pilule.",
    card: "Une carte sur fond anthracite : un profil en barre latérale à côté d'onglets à propos, CV et projets, rehaussés d'or.",
    retro:
      "Un poste de travail rétro : des fenêtres à déplacer, enrouler et agrandir, une barre de menus et trois époques au choix.",
    starring:
      "Ta carrière comme un film : ton nom en lettres géantes sur une scène noire, puis un acte pour chaque partie de ton travail.",
    bubble:
      "Criard et mignon : des lettres gonflées à rayures sur un ciel à carreaux, des cartes autocollants, des petites mascottes et un bandeau défilant.",
  },
  page: {
    title: "{name} - Portfolio",
    untitled: "Portfolio",
    description: "Un portfolio créé avec {brand}.",
    imageLabel: "PORTFOLIO",
  },
} satisfies Translation<Messages["portfolio"]>;
