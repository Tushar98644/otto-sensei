import type { Messages } from "..";
import type { Translation } from "../../types";

// The pricing page, plan cards and shared price words, in French; plan names stay as they are.
export default {
  meta: {
    title: "Tarifs et forfaits : {free}, {pro} et {max}",
    description:
      "Vérifie, corrige et télécharge un CV en PDF gratuitement. {pro} coûte {proPrice} par mois pour l'adaptation, les lettres de motivation et tous les formats ; {max} coûte {maxPrice}. {close}",
    trialClose: "Essaie {pro} pendant {days} jours pour {trialPrice}.",
  },
  prices: {
    cancelAnytime: "Annule quand tu veux.",
    intervalNames: { month: "Mensuel", year: "Annuel" },
    perInterval: { month: "par mois", year: "par an" },
    eachInterval: { month: "mois", year: "année" },
    priceLabel: { month: "{price}/mois", year: "{price}/an" },
    trialOffer: "{plan} pendant {days} jours",
    trialHeadline: "Essaie {offer}",
    trialSentence:
      "{price} pendant {days} jours, puis {planPrice} {perInterval}. Annule quand tu veux avant la fin de l'essai.",
    endsTrial: "Met fin aujourd'hui à ton essai {trialPlan} et démarre {plan} à {priceLabel}.",
    monthly: "{price} par mois. Annule quand tu veux.",
    yearly:
      "{price} une fois par an, soit environ {perMonth} par mois. {savings} % de moins qu'en payant au mois.",
    yearlyFlat: "{price} une fois par an.",
    perPeriod: { month: "par mois", trial: "pendant l'essai" },
  },
  features: {
    fix: "corrections de ligne",
    tailor: "versions adaptées",
    letter:
      "lettres de motivation, messages de prise de contact, réponses et préparations d'entretien",
    import: "lectures par IA d'un CV importé",
    draft: "brouillons « Créer avec Otto »",
    github: "brouillons de projets GitHub",
  },
  credit: {
    line: "À court ? Ajoute du crédit dès {min} : {buys}.",
    buys: "{usd} = {list}",
    item: "{count} {label}",
    labels: {
      tailor: "versions adaptées",
      letter: "lettres",
      fix: "corrections de ligne",
      import: "lectures de CV par IA",
      draft: "brouillons « Créer avec Otto »",
      github: "brouillons de projets GitHub",
    },
    each: {
      tailor: "{price} par version adaptée",
      letter: "{price} par lettre",
      fix: "{price} par correction de ligne",
      import: "{price} par lecture de CV par IA",
      draft: "{price} par brouillon « Créer avec Otto »",
      github: "{price} par brouillon de projet GitHub",
    },
    cents: "{cents} ¢",
  },
  page: {
    title: "Gratuit pour l'essentiel.",
    titleEm: "Plus d'aide quand la recherche s'intensifie.",
    intro:
      "Vérifier, corriger et télécharger, c'est gratuit. Pro ajoute l'aide IA d'Otto, toutes les offres compatibles et le suivi des candidatures.",
    otto: "Les forfaits changent combien je t'aide chaque mois, jamais ce que j'accepte ou refuse de faire.",
    footnote:
      "Prix en dollars américains. Des taxes peuvent s'appliquer. Les forfaits payants se renouvellent chaque {periods} jusqu'à ce que tu annules.",
    billingQuestions: "Questions de facturation",
    closingStudio: "Ou vérifie ton CV gratuitement",
  },
  plans: {
    howOften: "Fréquence de paiement",
    period: {
      month: { short: "/mois", spoken: "par mois" },
      year: { short: "/an", spoken: "par an" },
    },
    free: "gratuit",
    discount: "{percent} % de réduction",
    yearlySavings: "{percent} % d'économie par rapport au mensuel",
    fairLimits:
      "Des limites raisonnables sur chaque fonction d'IA, toutes détaillées dans les <link>conditions</link>.",
    referencePrice: "Prix de référence ",
    manage: "Gérer ton forfait",
    freeCta: "Vérifier mon CV gratuitement",
    popular: "Populaire",
    trialEmail: "On t'envoie un e-mail la veille du renouvellement.",
    yearlyNote: "Environ {perMonth} par mois, au lieu de {yearly} par an en payant au mois.",
    monthlyOnly: "Uniquement au mois, pour l'instant.",
    wontStart: "{plan} ne démarrera pas, tu ne paieras donc rien de plus.",
    thenPrice: "Puis {priceLabel}, sauf si tu annules.",
    setToEnd: "Fin programmée : tu ne paieras plus rien.",
    yourPlan: "Ton forfait",
    currentPlan: "Forfait actuel",
    currentTrial: "Forfait actuel · essai jusqu'au {day}",
    includedIn: "Inclus dans {plan}.",
    startNow: "Démarrer {plan} maintenant",
    upgradeTo: "Passer à {plan}",
    get: "Choisir {plan}",
    notOnPeriod: "Pas encore disponible pour ta période de facturation.",
  },
  copy: {
    free: {
      summary: "Vérifie, corrige et télécharge un CV.",
      note: "Sans carte bancaire",
      outcomes: {
        upload: "Importe un CV et vois ce que lit le logiciel de recrutement",
        fix: "Corrige chaque ligne à la main, ou avec Otto",
        download: "Télécharge un PDF propre au format {formats}",
        matches: "Tes {count} offres les plus compatibles",
        track: "Suis {applications}, avec un rappel de relance",
      },
    },
    pro: {
      summary: "L'aide d'Otto pour une recherche d'emploi intense.",
      lead: "Tout ce qu'offre Free, plus :",
      note: "Annule quand tu veux depuis ton compte",
      ai: {
        tailor: "Otto adapte ton CV à chaque offre",
        letters: "Lettres de motivation, prises de contact et préparation aux entretiens par Otto",
      },
      tools: {
        formats: "Les {formats} formats, jusqu'à {resumes} CV et les téléchargements Word",
        jobs: "Toutes tes offres compatibles parmi {open} offres ouvertes, avec filtres et offres enregistrées",
        jobsNoCount: "Des offres ouvertes associées à ton CV, avec filtres et offres enregistrées",
        track: "Suis jusqu'à {applications} candidatures, avec des rappels de relance",
        share: "Des liens de partage, et un site portfolio avec les {designs} modèles",
      },
    },
    max: {
      summary: "Pour une longue recherche ou de nombreux postes.",
      lead: "Tout ce qu'offre Pro, et plus encore :",
      note: "Annule quand tu veux depuis ton compte",
      more: {
        tailor: "versions adaptées",
        letter: "lettres de motivation, prises de contact et préparations d'entretien",
        fix: "corrections de ligne",
        import: "fichiers importés lus par l'IA",
        drafts: "brouillons à partir de tes notes et de GitHub",
      },
      ratio: {
        more: "Plus de {noun}",
        twice: "Deux fois plus de {noun}",
        times: "{times} fois plus de {noun}",
        overTwice: "Plus du double de {noun}",
        overTimes: "Plus de {times} fois plus de {noun}",
      },
      keep: "Jusqu'à {resumes} CV et {applications} candidatures suivies",
    },
    resumes: { one: "{count} CV", other: "{count} CV" },
    applications: { one: "{count} candidature", other: "{count} candidatures" },
    trackedApplications: {
      one: "{count} candidature suivie",
      other: "{count} candidatures suivies",
    },
    limit: "{count} {label} {period}",
    quota: {
      free: "{resumes} · {fix} {fixLabel} d'Otto {period}",
      paid: "{items} {period}",
      item: "{count} {label}",
      letters: "lettres et préparations",
    },
  },
  table: {
    title: "Chaque limite, forfait par forfait",
    intro:
      "Les limites de Pro et Max se réinitialisent chaque mois, le jour du mois où ton forfait a commencé. Les corrections de ligne de Free se réinitialisent le 1er du mois.",
    whatYouGet: "Ce que tu obtiens",
    included: "Inclus",
    notIncluded: "Non inclus",
    groups: {
      ai: "L'aide IA d'Otto, chaque mois",
      resumes: "CV et téléchargements",
      jobs: "Offres et candidatures",
    },
    ai: {
      tailor: { label: "Versions adaptées", detail: "Ton CV réécrit pour une offre précise" },
      letter: {
        label: "Lettres et préparation aux entretiens",
        detail:
          "Lettres de motivation, messages de prise de contact, réponses et préparations, comptés ensemble",
      },
      fix: { label: "Corrections de ligne avec Otto" },
      import: {
        label: "Fichiers importés lus par l'IA",
        detail: "Au-delà, et avec Free, c'est le lecteur de base qui les lit",
      },
      draft: { label: "Premiers brouillons à partir de tes notes" },
      github: { label: "Brouillons de projets depuis GitHub" },
    },
    rows: {
      recruiterView: "Vue recruteur et modification à la main",
      resumes: "CV",
      resumesDetail: "Les versions adaptées comptent comme des CV",
      formats: "Formats de CV",
      allFormats: "Les {count}",
      pdf: "Téléchargements PDF",
      word: "Téléchargements Word (.docx)",
      share: "Liens de partage",
      portfolio: "Site portfolio",
      portfolioDetail: "{count} modèles, créés à partir de ton CV",
      matches: "Offres compatibles",
      allMatches: "Toutes",
      closestMatches: "Les {count} plus proches",
      filters: "Filtres et offres enregistrées",
      tracked: "Candidatures suivies",
      reminders: "Rappels de relance",
      hireFrom: "Pays d'où chaque offre peut recruter",
    },
  },
  faq: {
    trial: {
      question: "Comment fonctionne l'essai Pro ?",
      answer:
        "Les nouveaux comptes peuvent essayer Pro pendant {days} jours, une fois par personne. Tu ajoutes une carte au paiement et tu paies {price} (plus les éventuelles taxes) au début de l'essai. À la fin de l'essai, Pro démarre à {priceLabel}. Annule quand tu veux avant la fin de l'essai et tu ne paies rien de plus. Pendant l'essai, tu peux créer et prévisualiser un portfolio ; il est mis en ligne une fois Pro démarré.",
    },
    free: {
      question: "Qu'est-ce qui reste gratuit ?",
      answer:
        "L'import avec le lecteur de base, la vue recruteur, la modification et la correction à la main, {fix} corrections de ligne par mois avec Otto, {resumes}, les formats Classic et Compact, les téléchargements PDF, tes {matches} offres les plus compatibles et {applications} avec son rappel. Sans carte bancaire, sans limite de durée. Plus de corrections de ligne et le reste de l'aide IA d'Otto, les autres formats, jusqu'à {proResumes} CV, les téléchargements Word, la liste complète des offres compatibles avec filtres, le suivi d'un maximum de {proApplications} candidatures, les liens de partage et la vérification de l'autorisation de travail sont inclus avec Pro. Si un forfait payant prend fin, tout ce que tu as créé reste : tu peux toujours l'ouvrir, le modifier et le télécharger.",
    },
    payments: {
      question: "Qui gère les paiements ?",
      answer:
        "{merchant}, notre marchand officiel (merchant of record). Il traite ton paiement sur sa propre page de paiement, t'envoie tes reçus et gère la taxe sur les ventes ou la TVA, et ton relevé bancaire affiche le prélèvement à son nom, commençant par {prefix}. Nous ne voyons jamais ton numéro de carte complet.",
    },
    tax: {
      question: "Vais-je payer des taxes en plus ?",
      answer:
        "Selon l'endroit où tu vis, une taxe sur les ventes ou la TVA peut être ajoutée au paiement. Les prix sont en dollars américains, et ta banque peut les convertir dans ta devise.",
    },
    cancel: {
      question: "Comment annuler ?",
      answer:
        "Depuis la page de ton compte, à tout moment. Tu gardes ton forfait jusqu'à la fin de la période payée, et on ne te prélèvera plus rien.",
    },
    refund: {
      question: "Puis-je obtenir un remboursement ?",
      answer:
        "Les demandes de remboursement sont traitées par {merchant}, notre marchand officiel, selon ses <link>conditions acheteur</link>. Tu peux aussi annuler à tout moment depuis la page de ton compte, et on ne te prélèvera plus rien. Consulte notre <link>politique de remboursement</link>.",
    },
    limits: {
      question: "Quelles sont les limites ?",
      free: "Free inclut {fix} {fixLabel} par mois (l'aide sur le résumé de profil compte pour une), réinitialisées au début de chaque mois, et aucune autre aide IA.",
      monthly:
        "Les limites de Pro et Max se réinitialisent chaque mois, au renouvellement de ton forfait (avec un forfait annuel, le jour du mois où il a commencé) : {list}.",
      monthlyItem: "{label} : {pro} avec Pro, {max} avec Max",
      trial:
        "L'essai Pro de {days} jours a son propre quota pour toute la durée de l'essai : {list}.",
      trialItem: "{count} {label}",
      kept: "CV, versions adaptées comprises : {freeResumes} avec Free, {proResumes} avec Pro et pendant l'essai, {maxResumes} avec Max. Candidatures suivies : {freeApplications} avec Free, {proApplications} avec Pro et pendant l'essai, {maxApplications} avec Max.",
      uploads:
        "L'import fonctionne toujours : avec Free, ou une fois les lectures par IA épuisées, c'est le lecteur de base qui lit tes fichiers.",
    },
    switch: {
      question: "Puis-je passer de Pro à Max, et inversement ?",
      answer:
        "Tu peux passer de Pro à Max depuis la page de ton compte, sur la période de facturation que tu as déjà. Ton abonnement est modifié directement, donc on ne te facture jamais deux fois : tu paies tout de suite la différence pour le reste de la période. Pendant l'essai Pro, démarrer Max met fin à l'essai et prélève immédiatement le prix complet de Max (plus les éventuelles taxes) sur ta carte enregistrée ; le montant de {price} payé pour l'essai n'est pas déduit. Pour passer à Pro, ou entre mensuel et annuel, annule depuis la page de ton compte et choisis le nouveau forfait à la fin de ta période en cours. Passer à Pro conserve tous tes CV et toutes tes candidatures ; au-delà des limites de Pro, tu pourras en ajouter d'autres dès que tu repasses sous ces limites.",
    },
    cancelled: {
      question: "Que deviennent mes CV si j'annule ?",
      answer:
        "Rien ne change. Ils restent à toi, et tu peux continuer à les modifier et à les télécharger gratuitement. Un portfolio publié est mis hors ligne jusqu'à ton retour sur Pro ou Max ; il n'est pas supprimé.",
    },
    credit: {
      question: "Et si j'arrive au bout avant le renouvellement de mon forfait ?",
      answer:
        "Avec {pro} ou {max}, tu peux ajouter du crédit de {min} à {maxUsd} à la fois, en dollars entiers, plus les éventuelles taxes. {buys} : {prices}. Le crédit n'est utilisé qu'une fois épuisé le quota du mois pour la fonction concernée, ou une fois épuisé le budget IA, aux prix affichés au moment de son utilisation. Il est prépayé et non remboursable une fois utilisé, n'expire jamais tant que ton compte existe, ne fonctionne qu'avec un forfait payant (ni Free ni l'essai) et est supprimé si tu supprimes ton compte. Le solde peut atteindre {balance} au maximum.",
    },
  },
} satisfies Translation<Messages["pricing"]>;
