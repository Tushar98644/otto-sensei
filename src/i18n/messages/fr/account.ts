import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  meta: { title: "Compte" },
  heading: "Ton compte",
  skeleton: {
    loading: "Chargement de ton compte…",
    stillLoading: "Toujours en chargement ?",
    reload: "Recharge la page",
  },
  tryAgain: "Réessayer",
  checkConnection: "Vérifie ta connexion, puis réessaie.",
  saveFailed: "Impossible d'enregistrer",
  copied: "Copié",
  copyLink: "Copier le lien",
  view: {
    loadFailed: "Ton compte ne s'est pas chargé",
    settingUp: "Activation de ton forfait {plan}",
    settingUpNew: "Activation de ton nouveau forfait",
    checkout: "Direction le paiement pour {plan}",
    signIn: "Se connecter",
  },
  arrival: {
    thanks: "Merci pour ton passage à un forfait supérieur !",
    thanksDetail: "Ton nouveau forfait peut mettre une minute à apparaître.",
    cancelled: "Paiement annulé",
    nothingCharged: "Rien n'a été facturé.",
    credit: "Merci ! Ton crédit arrive.",
    creditDetail: "Il peut mettre une minute à apparaître ici.",
    goBack: "Revenir",
    testMode: "Mode test : tu es de retour sur Free.",
  },
  tabs: {
    label: "Compte",
    plan: "Forfait et facturation",
    preferences: "Préférences",
    profile: "Profil",
  },
  plan: {
    eyebrow: "Ton forfait",
    srTitle: "Ton forfait : ",
    pills: {
      current: "Forfait actuel",
      failed: "Paiement refusé",
      ends: "Se termine le {day}",
      trialLeft: "Essai · {left}",
      trial: "Essai",
      active: "Actif",
      setToEnd: "Fin programmée",
    },
    endsToday: "se termine aujourd'hui",
    daysLeft: { one: "{count} jour restant", other: "{count} jours restants" },
    per: { month: "/mois", year: "/an" },
    nothingMore: "Plus rien à payer",
    from: "à partir du {day}",
    until: "jusqu'au {day}",
    renews: "renouvelé le {day}",
    heldTitle: "Ton dernier paiement n'est pas passé",
    heldDetail: "Tu es sur Free pour l'instant. Mets ta carte à jour pour récupérer ton forfait.",
    held: "{title}. {detail}",
    tracked: {
      one: "une candidature suivie",
      other: "{count} candidatures suivies",
    },
    free: "Free comprend {fixes} corrections de ligne par mois, plus la vue recruteur, l'édition, les téléchargements PDF, quelques offres correspondantes et {tracked}.",
    tryPro: "{base} Essaie {pro} : {trial}",
    trialSentence: {
      month:
        "{price} pour {days} jours, puis {plan} par mois. Annule quand tu veux avant la fin de l'essai.",
      year: "{price} pour {days} jours, puis {plan} par an. Annule quand tu veux avant la fin de l'essai.",
    },
    trialEnding:
      "Ton essai se termine le {day} et {name} ne démarrera pas, donc tu ne paieras rien de plus.",
    trialStarts: {
      month:
        "Tu as payé {trial} pour l'essai. Le {day}, {name} démarre à {price} par mois. On te prévient la veille.",
      year: "Tu as payé {trial} pour l'essai. Le {day}, {name} démarre à {price} par an. On te prévient la veille.",
    },
    endsOn:
      "Ton forfait se termine le {day}, et ton compte passe alors sur Free. Tu ne seras plus facturé.",
    setToEnd:
      "Ton forfait va se terminer, et ton compte passera alors sur Free. Tu ne seras plus facturé.",
    renewsOn: {
      month:
        "Ton forfait est renouvelé le {day} à {price} par mois. Annule quand tu veux d'ici là.",
      year: "Ton forfait est renouvelé le {day} à {price} par an. Annule quand tu veux d'ici là.",
    },
    renewsEach: {
      month: "Ton forfait est renouvelé chaque mois à {price} par mois. Annule quand tu veux.",
      year: "Ton forfait est renouvelé chaque année à {price} par an. Annule quand tu veux.",
    },
    yearly: "Paie à l'année : {price} par an.",
    yearlySaves: "Paie à l'année : {price} par an, {savings} % de moins qu'au mois.",
    how: {
      trial:
        "Un forfait ne peut pas passer du mensuel à l'annuel en cours de période. Annule ton essai, puis choisis l'annuel sur la page des tarifs une fois qu'il est terminé.",
      trialBefore:
        "Un forfait ne peut pas passer du mensuel à l'annuel en cours de période. Annule ton essai avant le {day}, puis choisis l'annuel sur la page des tarifs une fois qu'il est terminé.",
      paid: "Un forfait ne peut pas passer du mensuel à l'annuel en cours de période. Annule le mensuel, puis choisis l'annuel sur la page des tarifs une fois qu'il est terminé.",
      paidBefore:
        "Un forfait ne peut pas passer du mensuel à l'annuel en cours de période. Annule le mensuel avant le {day}, puis choisis l'annuel sur la page des tarifs une fois qu'il est terminé.",
    },
    max: {
      triple:
        "Besoin de plus ? {max} offre au moins le triple de chaque limite de {pro}, pour {price} par mois.",
      double:
        "Besoin de plus ? {max} offre au moins le double de chaque limite de {pro}, pour {price} par mois.",
      more: "Besoin de plus ? {max} dépasse chaque limite de {pro}, pour {price} par mois.",
    },
    updateCard: "Mettre à jour la carte",
    howToSwitch: "Comment changer",
    testMode: "Mode test",
    testModeLine: "Annuler ou mettre à jour ta carte te ramène sur Free.",
    compare: "Comparer les forfaits",
    tryFor: "Essaie {plan} pour {price}",
    upgradeTo: "Passer à {plan}",
    resumeTrial: "Reprendre l'essai",
    resumePlan: "Reprendre le forfait",
    change: "Changer de forfait",
    cancelTrial: "Annuler l'essai",
    cancelPlan: "Annuler le forfait",
  },
  usage: {
    title: "Utilisation",
    meters: {
      tailor: "Versions adaptées",
      letter: "Lettres, réponses et préparation",
      fix: "Corrections de ligne",
      import: "Lectures de CV par l'IA",
      draft: "Brouillons avec Otto",
      github: "Brouillons de projets GitHub",
    },
    trialEnds: "Cet essai · se termine le {day}",
    trial: "Cet essai",
    monthResets: "Ce mois-ci · remis à zéro le {day}",
    month: "Ce mois-ci",
    allUsed: "Tout est utilisé pour l'instant.",
    allUsedTrial: "Tout est utilisé. Tu en auras plus à la fin de l'essai, le {day}.",
    allUsedOn: "Tout est utilisé. Tu en auras plus le {day}.",
    used: "{used} sur {limit} utilisés",
    of: "sur {limit}",
    proOnly:
      "L'adaptation, les lettres, les lectures de CV par l'IA et les portfolios sont inclus dans {pro}.",
    hideRest: "Masquer les autres limites",
    showRest: "Afficher toutes les limites",
    basicReader:
      "Les imports continuent de fonctionner après les lectures par l'IA, avec le lecteur de base.",
  },
  credit: {
    title: "Crédit",
    neverExpires: "N'expire jamais",
    about: {
      one: "environ {count} version adaptée",
      other: "environ {count} versions adaptées",
    },
    none: "Pas encore de crédit",
    usable: "Utilisé seulement quand ce qui est inclus ce mois-ci est épuisé.",
    waits:
      "Le crédit fonctionne sur {pro} et {max}, une fois l'éventuel essai terminé. Ton solde attend jusque-là.",
    add: "Ajouter du crédit",
    buys: "{price} = {list}",
    or: "{list} ou {last}",
    from: "{buys}. À partir de {min}, en dollars entiers.",
    maxHint:
      "Tu as ajouté {added} de crédit ce mois-ci. {max} coûte {extra} de plus que {pro} et offre {more} versions adaptées par mois, contre {less} pour {pro}.",
    hideHistory: "Masquer l'historique du crédit",
    showHistory: "Afficher l'historique du crédit",
    historyFailed: "Ton historique de crédit ne s'est pas chargé",
    nothing: "Rien pour l'instant.",
    added: "Crédit ajouté",
    takenBack: "Crédit repris après un remboursement",
    aiHelp: "Aide de l'IA",
    labels: {
      tailor: { one: "{count} version adaptée", other: "{count} versions adaptées" },
      letter: { one: "{count} lettre", other: "{count} lettres" },
      fix: { one: "{count} correction de ligne", other: "{count} corrections de ligne" },
      import: { one: "{count} lecture de CV par l'IA", other: "{count} lectures de CV par l'IA" },
      draft: { one: "{count} brouillon avec Otto", other: "{count} brouillons avec Otto" },
      github: {
        one: "{count} brouillon de projet GitHub",
        other: "{count} brouillons de projets GitHub",
      },
    },
  },
  payment: {
    title: "Moyen de paiement",
    ending: "{brand} se terminant par {last4}",
    expires: "Expire le {date}",
    lastCard: "La carte de ton dernier paiement",
    keptBy: "Ta carte est conservée par Dodo Payments.",
    merchant:
      "Facturé par Dodo Payments, notre marchand officiel (merchant of record). Les prélèvements apparaissent sous le nom DODOPAY sur ton relevé.",
  },
  history: {
    title: "Historique de facturation",
    loadFailed: "Tes paiements ne se sont pas chargés",
    none: "Pas encore de paiements.",
    date: "Date",
    item: "Article",
    amount: "Montant",
    status: "Statut",
    invoice: "Facture",
    plusTax: "plus taxes éventuelles",
    invoiceFailed: "Impossible de télécharger cette facture",
    download: "Télécharger la facture de {item}, {date}",
    statuses: {
      paid: "Payé",
      processing: "En cours",
      failed: "Échoué",
      refunded: "Remboursé",
      upcoming: "À venir",
    },
  },
  status: {
    pickUp: "Reprendre là où tu en étais",
    dashboard: "Aller au tableau de bord",
    stillShowing: "Toujours {plan} affiché ?",
    checkAgain: "Vérifier à nouveau",
    slowFree:
      "Les paiements peuvent mettre quelques minutes à nous parvenir. Vérifie à nouveau bientôt, ou écris à <link>{email}</link>.",
    slowPaid:
      "Les paiements peuvent mettre quelques minutes à nous parvenir, alors vérifie à nouveau bientôt. Si ta carte a été refusée, tu restes sur {plan} : mets ta carte à jour ci-dessous et réessaie, ou écris à <link>{email}</link>.",
    finishing: "Finalisation de ton changement de forfait",
    finishingDetail:
      "Ton nouveau forfait peut mettre une minute à apparaître. Cette page vérifie à nouveau toute seule.",
  },
  preferences: {
    writingStyle: "Style d'écriture",
    writingStyleIntro:
      "Ton, longueur, orthographe et formule de politesse pour tout ce qu'Otto écrit pour toi.",
    jobSearch: "Recherche d'emploi",
    jobSearchIntro:
      "Où tu peux travailler et ce que tu cherches, pour qu'Emplois affiche d'abord les bonnes offres.",
    reminders: "Rappels",
    remindersIntro:
      "Des rappels pour relancer les offres auxquelles tu postules, dans la cloche ; tes entretiens dans ton agenda ; et ton journal de carrière mensuel.",
  },
  style: {
    loadFailed: "Ton style d'écriture ne s'est pas chargé",
    intro:
      "Utilisé pour tes lettres de motivation, tes réponses de candidature et tes messages de prise de contact. Otto le suit, mais ton parcours vient toujours uniquement de ton CV, et Otto n'invente jamais rien.",
    tone: "Ton",
    length: "Longueur",
    spelling: "Orthographe",
    tones: {
      natural: {
        label: "Naturel",
        hint: "Simple et chaleureux, comme écrit une personne attentive.",
      },
      warm: { label: "Chaleureux", hint: "Amical et personnel, tout en restant professionnel." },
      direct: { label: "Direct", hint: "Des phrases courtes, droit au but." },
      formal: { label: "Soutenu", hint: "Soigné et classique, sans contractions." },
    },
    lengths: {
      standard: {
        label: "Standard",
        hint: "Environ 200 mots pour une lettre, 120 pour un message.",
      },
      shorter: {
        label: "Plus court",
        hint: "Environ 140 mots pour une lettre, 80 pour un message.",
      },
    },
    spellings: {
      us: { label: "Anglais américain", hint: "organize, color, résumé" },
      uk: { label: "Anglais britannique", hint: "organise, colour, CV" },
    },
    signOff: "Formule de politesse",
    signOffHint: "Termine tes lettres de motivation et tes messages.",
    signOffPlaceholder: "Bien cordialement",
    notes: "Notes pour Otto",
    notesHint:
      "Tout autre point à garder en tête, comme « Mentionne que je suis prêt à déménager » ou « Reste modeste, pas de superlatifs ».",
    notesLeft: "Il reste {count} caractères dans tes notes.",
    saveFailed: "Impossible d'enregistrer ton style d'écriture",
    reset: "Rétablir par défaut",
    saving: "Enregistrement…",
    saved: "Enregistré",
    asYouGo: "Les modifications s'enregistrent au fur et à mesure.",
  },
  work: {
    title: "Où tu peux travailler",
    intro:
      "Où tu vis, ton fuseau horaire et tes besoins de visa. Emplois signale les offres qui disent ne pas pouvoir t'embaucher, et peut les masquer. Toi seul peux voir ceci.",
    loadFailed: "Ton profil de travail ne s'est pas chargé",
  },
  lookingFor: {
    title: "Ce que tu cherches",
    intro:
      "Le poste, le niveau et le lieu qu'Emplois met en avant. Déduits de ton CV tant que tu n'as pas choisi.",
    loadFailed: "Ce que tu cherches ne s'est pas chargé",
    change: "Touche une partie pour la modifier. Tout s'enregistre au fur et à mesure.",
    pick: "Touche une partie pour choisir un poste et un niveau. Tout s'enregistre au fur et à mesure.",
  },
  reminders: {
    calendar: "Agenda",
    saved: "Les rappels arrivent maintenant {days} jours après ta candidature.",
    title: "Rappels de relance",
    intro:
      "Quand tu marques une offre comme postulée, Otto programme un rappel de relance et l'affiche dans la cloche de ton tableau de bord, avec Fait et Reporter de {days} jours. La veille d'un entretien et le matin même, Otto te le rappelle aussi là, et le lendemain matin il te demande comment ça s'est passé. Les nouvelles offres correspondantes et les visites de tes liens s'y affichent aussi.",
    loadFailed: "Tes réglages de rappels ne se sont pas chargés",
    after: "Me rappeler de relancer après",
    counted: "Compté à partir du jour de ta candidature.",
    days: "{count} jours",
  },
  careerLog: {
    title: "Journal de carrière",
    intro:
      "Une note d'une minute chaque mois sur ce que tu as accompli, pour que ton prochain CV s'écrive tout seul. Gratuit dans tous les forfaits, même si tu arrêtes de payer.",
    checkinsOn: "Les bilans mensuels sont activés.",
    checkinsOff: "Les bilans mensuels sont désactivés.",
    emailsOn: "Les e-mails de bilan sont activés.",
    emailsOff: "Les e-mails de bilan sont désactivés.",
    resumed: "Les bilans sont réactivés.",
    paused: "Les bilans sont en pause.",
    daySaved: "Jour du bilan enregistré.",
    monthly: "Bilan mensuel",
    monthlyHint:
      "Trois questions rapides une fois par mois, dans la cloche et sur l'Accueil. Désactivé jusqu'à ce que tu l'actives.",
    askOn: "Me demander le",
    next: "Prochain : {day}.",
    onceAMonth: "Une fois par mois.",
    week: "Semaine du mois",
    weekday: "Jour de la semaine",
    weeks: {
      first: "Premier",
      second: "Deuxième",
      third: "Troisième",
      fourth: "Quatrième",
      last: "Dernier",
    },
    pause: "Pause",
    pausedUntil: "En pause jusqu'au {day}.",
    busy: "Mois chargé ? Saute un bilan, ou trois.",
    pausedOption: "En pause jusqu'au {day}",
    resumeNow: "Reprendre maintenant",
    notPaused: "Pas en pause",
    pauseMonth: "Pause d'un mois",
    pauseThree: "Pause de 3 mois",
    email: "E-mail de bilan",
    emailHint:
      "Un court e-mail le jour même, jamais plus d'un par mois. La cloche et l'Accueil te posent la question de toute façon.",
    open: "Ouvrir ton journal de carrière",
    loadFailed: "Les réglages de ton journal de carrière ne se sont pas chargés",
    on: "Activé",
    off: "Désactivé",
  },
  profile: {
    title: "E-mail et connexion",
    google:
      "Tu te connectes avec Google ou avec un code à 6 chiffres envoyé à cet e-mail. Pas de mot de passe.",
    code: "Tu te connectes avec un code à 6 chiffres envoyé à cet e-mail. Pas de mot de passe.",
    signOut: "Se déconnecter",
    signOutFailed: "Impossible de te déconnecter",
    signedOut: "Tu es déconnecté.",
  },
  invite: {
    title: "Invite tes amis",
    intro:
      "Quand un ami s'inscrit avec ton lien et vérifie un CV, vous recevez chacun {fix} corrections de ligne et {tailor} versions adaptées de plus ce mois-là.",
    loadFailed: "Ton lien d'invitation ne s'est pas chargé",
    shareText:
      "J'utilise {brand} pour voir ce que les logiciels de recrutement lisent dans mon CV. Inscris-toi avec mon lien et vérifie le tien, et on reçoit tous les deux {fix} corrections de ligne de plus.",
    copyFailed: "Impossible de copier le lien",
    copyYourself: "Sélectionne-le et copie-le toi-même.",
    yourLink: "Ton lien d'invitation",
    share: "Partager",
    linkCopied: "Lien d'invitation copié.",
    progress: "Amis qui t'ont valu des bonus",
    progressValue: "{done} sur {total}",
    nobody: "Personne ne s'est encore inscrit avec ton lien.",
    joined: {
      one: "{count} ami inscrit ; CV vérifiés : {checked}.",
      other: "{count} amis inscrits ; CV vérifiés : {checked}.",
    },
    full: "Tu as atteint les {max} amis qui te valent des bonus. Les nouveaux amis reçoivent quand même les leurs.",
    upTo: "Des bonus pour {max} amis maximum.",
    extrasTrial:
      "Pendant ton essai, tu as {fix} corrections de ligne et {tailor} versions adaptées de plus grâce à tes invitations.",
    extrasMonth:
      "Ce mois-ci, tu as {fix} corrections de ligne et {tailor} versions adaptées de plus grâce à tes invitations.",
    free: "Sur Free, chaque ami ajoute {fix} corrections de ligne aux {limit} du mois. L'adaptation est incluse dans Pro, donc les {tailor} versions adaptées attendent : commence un essai ou passe à un forfait supérieur ce mois-là et chaque bonus non utilisé te suit.",
    trial:
      "Les bonus s'ajoutent aux limites de ton essai, et ceux que tu n'as pas utilisés passent à ton premier mois payant.",
    paid: "Les bonus s'ajoutent aux limites de ton forfait {plan}.",
  },
  data: {
    title: "Tes données",
    intro:
      "Un fichier ZIP avec les CV enregistrés dans ton compte, tes lettres, réponses et messages, et les offres que tu suis.",
    download: "Télécharger mes données",
    failed: "Impossible de télécharger tes données",
  },
  deleteAccount: {
    title: "Supprimer le compte",
    intro: "Supprime ton compte et tout ce qui y est enregistré. C'est irréversible.",
    alsoCancels: "Cela annule aussi ton forfait.",
    downloadFirst: "Télécharge tes données d'abord si tu veux les garder.",
    failed: "Impossible de supprimer ton compte",
    dialogTitle: "Supprimer ton compte ?",
    dialogIntro:
      "Cela supprime ton compte, les CV sauvegardés dessus et ton historique d'utilisation. C'est irréversible.",
    cancel: "Annuler",
    cancelsPlan: "Cela annule aussi ton forfait",
    endsNow: "Ton forfait payant se termine immédiatement, et tu ne seras plus facturé.",
    credit: "Ton crédit de {credit} est supprimé avec et ne pourra plus être utilisé.",
    browser: "Les CV enregistrés dans ce navigateur sont aussi effacés.",
    word: "SUPPRIMER",
    type: "Tape <b>{word}</b> pour confirmer",
  },
  extension: {
    title: "Extension Chrome",
    connected:
      "Connectée depuis le {date}. Elle compare les offres d'emploi à ton CV directement sur la page, et les enregistre dans ton tableau.",
    connectedIn:
      "Connectée dans {count} navigateurs depuis le {date}. Elle compare les offres d'emploi à ton CV directement sur la page, et les enregistre dans ton tableau.",
    pitch:
      "Vois comment ton CV correspond à n'importe quelle offre d'emploi, enregistre des offres dans ton tableau et remplis tes candidatures en un clic.",
    disconnected: "Otto pour Chrome est déconnecté",
    everyBrowser: "Dans tous les navigateurs où il était.",
    disconnectFailed: "Impossible de le déconnecter",
    disconnect: "Déconnecter",
    soon: "Bientôt",
    soonStore: "Bientôt sur le Chrome Web Store.",
    add: "Ajouter à Chrome",
    connect: {
      meta: "Connecter Otto pour Chrome",
      title: "Connecter Otto pour Chrome",
      doneTitle: "Otto est sur ta recherche d'emploi",
      intro:
        "Un seul geste relie l'extension à ton compte, pour que le badge compare les offres à ton CV.",
      doneIntro:
        "Ouvre n'importe quelle offre d'emploi. Le badge d'Otto montre comment ton CV correspond, et si tu peux accepter le poste, avant même que tu lises un mot.",
      checkingAccount: "Vérification de ton compte",
      looking: "Recherche de l'extension",
      connecting: "Connexion",
      missing: "Otto pour Chrome n'est pas encore dans ce navigateur",
      added: "Je l'ai ajoutée",
      missingStore:
        "Ajoute l'extension à Chrome, puis reviens sur cet onglet. Si tu viens de l'ajouter, recharge cette page.",
      missingSoon:
        "Otto pour Chrome arrive bientôt sur le Chrome Web Store. Si tu l'as déjà, recharge cette page.",
      failed: "La connexion n'a pas abouti",
      tryAgain: "Réessayer",
      connectedAs: "Connecté en tant que {email}",
      tryPost:
        "Essaie avec une offre sur {sites} ou {last}. Sur tout autre site, appuie sur mon bouton dans la barre d'outils.",
      board: "Ouvrir ton tableau",
      close: "Fermer cet onglet",
    },
  },
  reminder: {
    meta: "Rappel",
    title: "Rappels",
    missing: "Il manque une partie à ce lien. Ouvre plutôt tes candidatures.",
    done: {
      message: "Tu as relancé pour celle-ci ? Marque-la comme faite et j'arrête de te le rappeler.",
      label: "Marquer comme fait",
    },
    snooze: {
      message: "Pas encore prêt à relancer ? Je te le rappelle dans {days} jours.",
      label: "Reporter de {days} jours",
    },
    unsubscribe: {
      message:
        "Désactiver les e-mails de rappel ? Tes rappels restent dans la cloche de ton tableau de bord.",
      label: "Désactiver les e-mails de rappel",
    },
    snoozeCompany: "Pas encore prêt à relancer {company} ? Je te le rappelle dans {days} jours.",
    doneRole:
      "Tu as relancé {company} pour le poste de {role} ? Marque-le comme fait et j'arrête de te le rappeler.",
    doneCompany: "Tu as relancé {company} ? Marque-le comme fait et j'arrête de te le rappeler.",
    badUnsubscribe:
      "Ce lien de désinscription n'est pas valide. Désactive les e-mails depuis ta page Compte.",
    unsubscribed:
      "C'est fait. Tu ne recevras plus d'e-mails de rappel. La cloche de ton tableau de bord les garde.",
    failed: "Ça n'a pas fonctionné. Ouvre plutôt tes candidatures.",
    failedShort: "Ça n'a pas fonctionné.",
    thatJob: "cette offre",
    marked: "Marqué comme fait. Plus de rappel pour {name}.",
    movedOn: "{name} n'est plus à l'étape Postulé, il n'y a donc rien à reporter.",
    snoozed: "Reporté de {days} jours. Je te ferai un rappel pour {name} le {day}.",
    applications: "Ouvrir tes candidatures",
  },
} satisfies Translation<Messages["account"]>;
