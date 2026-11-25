import type { Messages } from "..";
import type { Translation } from "../../types";

// The upgrade and add-credit dialogs, in French.
export default {
  otto: {
    pitch:
      "Des adaptations, des lettres et des corrections de ligne chaque mois, pour une recherche d'emploi intense.",
    billingOff:
      "Les paiements ne sont pas encore activés, mais tu peux quand même nous écrire au sujet d'un forfait.",
    alreadyMax: "Tu es sur Max, le plus grand forfait. Écris-nous s'il te faut plus.",
    biggest: "Tu es sur {plan}, le plus grand forfait en vente ici. Écris-nous s'il te faut plus.",
    hasMore: "{line} {plan} en a plus.",
    monthCredit:
      "Tu as ajouté {spent} de crédit ce mois-ci, plus que les {extra} que {max} coûte en plus de {pro}.",
  },
  title: {
    reached: {
      month: "Tu as atteint la limite de ce mois-ci",
      trial: "Tu as atteint la limite de cet essai",
    },
    onPlan: "Tu es sur {plan}",
    updateCard: "Mets ta carte à jour",
    upgradeTo: "Passer à {plan}",
    choose: "Choisis ton forfait",
    trial: "Essaie {plan} pendant {days} jours",
  },
  resets: "Elle se renouvelle {when}. Besoin de plus d'ici là ? Écris-nous.",
  resetsCredit:
    "Elle se renouvelle {when}. Besoin de plus d'ici là ? Ajoute du crédit, ou écris-nous.",
  cancelAnytime: "Annule quand tu veux depuis ton compte.",
  inPlace: "Ton abonnement change sur place : tu ne paies que la différence, jamais deux fois.",
  creditFrom: "Ou ajoute du crédit à partir de {min} : {buys}.",
  balance: "Ton solde : {balance}.",
  replace:
    "Ou remplace « {title} » par le nouveau. L'ancien attend dans Récemment supprimés pendant {days} jours, dans ce navigateur seulement.",
  buttons: {
    addCredit: "Ajouter du crédit",
    replace: "Le remplacer",
    notNow: "Pas maintenant",
    close: "Fermer",
    emailUs: "Nous écrire",
    back: "Retour",
    manageBilling: "Gérer le paiement",
  },
  toast: {
    alreadyOn: "Tu es déjà sur {plan}.",
    backOn: "Tu es sur {plan}. On reprend là où tu en étais.",
  },
  trial: {
    notice: "{plan} démarre maintenant et ton essai {trialPlan} se termine. {charge}",
    charge:
      "Tu paies {price} (plus les taxes éventuelles) tout de suite, sur ta carte enregistrée. Les {trial} de l'essai ne sont pas déduits.",
    paymentIssue:
      "Ton dernier paiement n'est pas passé, donc tu es sur Free pour l'instant. Mets ta carte à jour dans Gérer le paiement pour récupérer ton forfait.",
    resumeTrial:
      "Ton essai va se terminer. Reprends-le dans Gérer le paiement, puis démarre {plan}.",
    resumePlan:
      "Ton forfait va se terminer. Reprends-le dans Gérer le paiement pour changer de forfait.",
  },
  offer: {
    howOften: "Fréquence de paiement",
    intervals: { month: "Mensuel", year: "Annuel" },
    spoken: { month: "par mois", year: "par an" },
    per: { month: "/mois", year: "/an" },
    current: "Forfait actuel",
    popular: "Populaire",
    save: "−{percent} %",
    referencePrice: "Prix de référence",
    monthlyOnly: "Vendu au mois uniquement, pour l'instant.",
    aboutMonth: "Environ {price} par mois.",
    everythingInPro: "Tout Pro, et plus encore :",
    highlight: {
      month: "{count} {label} par mois",
      trial: "{count} {label} pendant l'essai",
    },
    labels: {
      fix: "corrections de ligne",
      tailor: "versions adaptées",
      letter:
        "lettres de motivation, messages de prise de contact, réponses et préparations aux entretiens",
      import: "lectures par l'IA d'un CV importé",
      draft: "brouillons Créer avec Otto",
      github: "brouillons de projets GitHub",
    },
    proHighlight:
      "Les {formats} formats, les téléchargements Word et toutes les offres correspondantes",
    limitsHighlight: "Jusqu'à {resumes} CV et {applications} candidatures suivies",
    tryPlan: "Essaie {plan} pendant {days} jours",
    upgradeTo: "Passer à {plan}",
    startNow: "Démarrer {plan} maintenant",
    resetRule: {
      month: "Les limites se renouvellent chaque mois, au renouvellement de ton forfait.",
      year: "Les limites se renouvellent chaque mois, le même jour du mois que le début de ton forfait.",
    },
    promises:
      "Les imports fonctionnent toujours : au-delà des lectures par l'IA, le lecteur de base s'en charge. Les téléchargements PDF restent gratuits avec tous les forfaits.",
    trialSentence:
      "{price} pendant {days} jours, puis {planPrice} {perInterval}. Annule quand tu veux avant la fin de l'essai.",
    perInterval: { month: "par mois", year: "par an" },
    endsTrial: "Met fin aujourd'hui à ton essai {trialPlan} et démarre {plan} à {priceLabel}.",
    monthly: "{price} par mois. Annule quand tu veux.",
    yearly:
      "{price} une fois par an, soit environ {perMonth} par mois. {savings} % de moins qu'en payant au mois.",
    yearlyFlat: "{price} une fois par an.",
  },
  billing: {
    testMode: "Mode test",
    mockPlan: "Aucun vrai paiement. Ton forfait change tout de suite.",
    offTitle: "Les paiements ne sont pas encore actifs",
    off: "Tu veux un forfait payant maintenant ? Écris à <link>{email}</link> et on s'en occupe.",
  },
  credit: {
    title: "Ajouter du crédit",
    description:
      "Utilisé seulement quand ce qui est inclus dans le mois est épuisé. Il n'expire jamais tant que ton compte existe.",
    amount: "Montant",
    other: "Autre",
    amountLabel: "Montant en dollars",
    hint: "En dollars entiers, de {min} à {max}.",
    add: "Ajouter {amount}",
    pick: "Choisis un montant en dollars entiers de {min} à {max}.",
    room: "Ton solde peut aller jusqu'à {cap}, tu peux donc ajouter jusqu'à {room} maintenant.",
    full: "Ton solde peut aller jusqu'à {cap}. Utilises-en une partie, puis ajoutes-en.",
    failed: "Impossible d'ajouter du crédit",
    balanceNow: "Ton solde maintenant : {balance}.",
    mock: "Aucun vrai paiement. Le crédit est ajouté tout de suite.",
    tax: "Plus les taxes éventuelles au paiement. Prépayé, et non remboursable une fois utilisé.",
    buys: "{usd} = {list}",
    item: "{count} {label}",
    labels: {
      tailor: "versions adaptées",
      letter: "lettres",
      fix: "corrections de ligne",
      import: "lectures de CV par l'IA",
      draft: "brouillons Créer avec Otto",
      github: "brouillons de projets GitHub",
    },
  },
} satisfies Translation<Messages["upgrade"]>;
