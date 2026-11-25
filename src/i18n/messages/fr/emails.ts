import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  signOff: "{mascot}, de {brand}",
  linkLine: "{label} : {url}",
  unsubscribe: "Se désabonner",
  unsubscribeLine: "Désabonne-toi en un clic : {url}",
  emailSettings: "Réglages des e-mails",
  signInCode: {
    subject: "Ton code Otto Sensei : {token}",
    lead: "Ton code Otto Sensei est",
    expires: "Il expire dans 10 minutes.",
    ignore: "Si tu ne l'as pas demandé, tu peux ignorer cet e-mail.",
  },
  trialEnding: {
    subject: "Ton essai {plan} se termine le {day}",
    at: "{day} à {time}",
    price: { month: "{price} par mois", year: "{price} par an" },
    noticeBody:
      "Il se termine le {when}. Ensuite, {plan} coûte {price}. Tu peux annuler à tout moment avant cette date depuis la page de ton compte.",
    lead: "Petit rappel : ton essai {plan} se termine le {when}.",
    charge:
      "Ensuite, {plan} coûte {price} (en dollars américains, plus la taxe sur les ventes ou la TVA de ton pays) jusqu'à ce que tu annules. Si tu veux garder {plan}, tu n'as rien à faire.",
    cancel:
      "Si tu ne veux pas continuer, tu peux annuler à tout moment avant cette date depuis la page de ton compte, et rien de plus ne te sera facturé.",
    account: "Ton compte",
    button: "Aller à ton compte",
    footer:
      "Tu reçois cet e-mail parce que ton essai {plan} se termine bientôt. C'est un avis de facturation, il arrive donc même si les e-mails de rappel sont désactivés.",
  },
  checkin: {
    noticeTitle: "Ton bilan pour {month}",
    noticeBody:
      "Une minute : ce que tu as livré, quelques chiffres et ce que tu as appris ou mené.",
    subject: "Ton bilan pour {month}, en une minute",
    lead: "Une minute pour {month} ? Trois questions rapides, à l'oral ou à l'écrit. Passe celles que tu veux.",
    prompts: {
      shipped: {
        label: "Qu'as-tu livré ou amélioré ?",
        hint: "Une fonctionnalité, un correctif, un processus, une vente.",
      },
      numbers: {
        label: "Des chiffres ?",
        hint: "Utilisateurs, %, argent, temps gagné. Une estimation suffit.",
      },
      learned: {
        label: "Quelque chose que tu as appris ou mené ?",
        hint: "Une compétence, un outil, une personne que tu as aidée.",
      },
    },
    nothingNew: "Rien de nouveau ce mois-ci ? Un seul clic sur la page.",
    free: "Tes notes restent gratuites avec tous les plans. Quand tu chercheras ton prochain emploi, Pro les transforme en lignes de CV qui citent tes propres faits.",
    button: "Écrire mon bilan",
    reason:
      "Tu reçois cet e-mail parce que tu as activé le bilan mensuel du journal de carrière. Une fois par mois.",
  },
  processorNotice: {
    subject: "Dodo Payments encaisse les paiements de {brand} à partir du {day}",
    intro:
      "Un petit avis sur les paiements : Dodo Payments gère désormais le paiement de {brand} à la place de Paddle, et encaisse les paiements réels à partir du {day}.",
    reseller:
      "Dodo Payments est notre revendeur en ligne et marchand officiel (merchant of record). Il encaisse le paiement quand tu achètes un plan, et gère les reçus, la taxe sur les ventes ou la TVA, les remboursements et l'assistance de facturation.",
    data: "Quand tu lances un paiement, nous envoyons à Dodo Payments l'e-mail de ton compte, notre identifiant aléatoire de ton compte et le plan que tu choisis, les mêmes informations que Paddle recevait. Dodo Payments traite tes données de paiement selon sa propre politique de confidentialité.",
    nothing:
      "Tu n'as rien à faire. Tout ce que tu as créé dans {brand} reste tel quel, et nos prix ne changent pas.",
    updated:
      "Nous avons mis à jour nos conditions, notre politique de confidentialité et notre page sur les remboursements en conséquence :",
    terms: "Conditions",
    privacy: "Politique de confidentialité",
    refunds: "Remboursements",
    questions: "Des questions ? Écris à {email}.",
    footer:
      "Tu reçois cet e-mail parce que tu as un compte {brand}. C'est un avis unique sur un changement de nos conditions et de notre politique de confidentialité, il arrive donc même si les autres e-mails sont désactivés.",
  },
  unsubscribePage: {
    title: "Se désabonner",
    invalid:
      "Ce lien n'est plus valide. Otto n'envoie plus ces e-mails ; tes rappels sont dans la cloche de ton tableau de bord.",
    failed: "Impossible de désactiver ces e-mails. Réessaie.",
    lists: {
      reminders: {
        name: "E-mails de rappel de relance",
        ask: "Désactiver les e-mails de rappel de relance ? Tes rappels restent dans la cloche de ton tableau de bord.",
        press: "Désactiver les e-mails de rappel",
        done: "C'est fait. Tu ne recevras plus d'e-mails de rappel de relance. La cloche de ton tableau de bord les garde.",
      },
      jobs: {
        name: "L'e-mail hebdomadaire des emplois",
        ask: "Arrêter l'e-mail hebdomadaire sur les nouveaux emplois qui correspondent à ton CV ? L'onglet Emplois les affiche toujours.",
        press: "Arrêter l'e-mail hebdomadaire",
        done: "C'est fait. Tu ne recevras plus l'e-mail hebdomadaire des emplois. Les nouvelles correspondances s'affichent dans la cloche de ton tableau de bord.",
      },
      tips: {
        name: "Conseils et rappels",
        ask: "Arrêter les e-mails de conseils et de rappels, comme le mot quand les corrections de ligne de Free reviennent ? Les avis de facturation d'un essai arrivent toujours.",
        press: "Arrêter conseils et rappels",
        done: "C'est fait. Tu ne recevras plus d'e-mails de conseils et de rappels.",
      },
      views: {
        name: "E-mails de vues",
        ask: "Arrêter les e-mails quand quelqu'un ouvre les liens de ton CV ou ton portfolio ? La cloche de ton tableau de bord les affiche toujours.",
        press: "Arrêter les e-mails de vues",
        done: "C'est fait. Tu ne recevras plus d'e-mails de vues. La cloche de ton tableau de bord les garde.",
      },
      career: {
        name: "E-mails du bilan du journal de carrière",
        ask: "Arrêter l'e-mail mensuel du journal de carrière ? Ton journal reste, gratuit, et la cloche de ton tableau de bord te le demande toujours une fois par mois.",
        press: "Arrêter les e-mails de bilan",
        done: "C'est fait. Tu ne recevras plus d'e-mails du journal de carrière. Ton journal reste, et tu peux réactiver l'e-mail dans les réglages de ton compte.",
      },
    },
  },
  followUp: {
    title: "C'est le moment de relancer {company} ?",
    titleBlank: "C'est le moment de relancer ?",
    titleMany: {
      one: "{count} candidature est prête à être relancée",
      other: "{count} candidatures sont prêtes à être relancées",
    },
    days: { one: "{count} jour", other: "{count} jours" },
    sinceInterview:
      "Ton entretien avec {company} remonte à {days}. Un petit mot aide à ne pas être oublié.",
    sinceInterviewBlank: "Ton entretien remonte à {days}. Un petit mot aide à ne pas être oublié.",
    sinceApplied: "Ta candidature chez {company} remonte à {days}. Une petite relance peut aider.",
    thatCompany: "cette entreprise",
    many: "Tu peux relancer {who}. Un petit mot peut aider.",
    applications: { one: "{count} candidature", other: "{count} candidatures" },
    andMore: "{names} et {count} autres",
    pair: "{first} et {second}",
  },
  interviewSoon: {
    title: "Ton entretien avec {company} est {day}",
    titleBlank: "Ton entretien est {day}",
    today: "aujourd'hui",
    tomorrow: "demain",
    onDay: "{weekday}",
    role: "Pour le poste de {role}.",
    advice: "Revois les questions probables dans ta préparation avant d'y aller.",
  },
  views: {
    count: { one: "{count} vue", other: "{count} vues" },
    shareTitle: "Quelqu'un a ouvert le lien de ton CV",
    shareBody: "{link} compte {views} jusqu'ici.",
    namedLink: "Ton lien pour « {name} »",
    resumeLink: "Le lien de ton CV",
    portfolioTitle: "Ton portfolio a eu {views} {period}",
    thisWeek: "cette semaine",
    since: "depuis le {day}",
    portfolioBody:
      "Sans compter tes propres visites, les aperçus de liens ni les moteurs de recherche.",
  },
  jobs: {
    title: {
      one: "{count} nouvelle correspondance cette semaine",
      other: "{count} nouvelles correspondances cette semaine",
    },
    job: "{title} chez {company}",
    andMore: "{names} et {count} autres.",
    pair: "{first} et {second}.",
    single: "{name}.",
    free: "Avec Free, Emplois affiche tes correspondances les plus proches.",
    alert: {
      one: "{count} nouvelle offre pour « {name} »",
      other: "{count} nouvelles offres pour « {name} »",
    },
  },
} satisfies Translation<Messages["emails"]>;
