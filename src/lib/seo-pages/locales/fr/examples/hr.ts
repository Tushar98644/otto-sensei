import type { ExampleWords } from "../../../examples";

export const hr: ExampleWords<"hr"> = {
  role: "RH",
  card: "Recrutement et RH généraliste en chiffres : délai de recrutement, rétention, dossiers clos.",
  description:
    "Exemple de CV RH pour postes de généraliste et de recrutement : lignes sur délais d'embauche, rétention et process, compétences et outils RH.",
  intro:
    "Les professionnels RH lisent des CV toute la journée, alors ils repèrent tout de suite un CV vague. Le leur doit offrir ce qu'ils cherchent chez les autres : des chiffres sur le recrutement et la rétention, les systèmes qu'ils ont gérés et les problèmes qu'ils ont réglés. Cet exemple couvre le recrutement et le travail de généraliste.",
  person:
    "Nadia est inventée : une généraliste RH avec 5 ans dans les services informatiques et la distribution à Phoenix, issue du recrutement. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV RH",
    basics: {
      headline: "Généraliste RH",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Généraliste RH avec 5 ans en recrutement, intégration et relations avec les salariés, pour des effectifs de 300 à 1 200 personnes. Corrige les processus lents avec des outils simples et des politiques claires.",
    experience: [
      {
        title: "Généraliste RH",
        bullets: [
          "Réduit le délai de recrutement des postes d'ingénieurs de 52 à 34 jours en instaurant des entretiens structurés et une règle de retour sous 48 heures.",
          "Refondu l'intégration de 220 nouvelles recrues par an, en faisant passer la rétention à 90 jours de 81 % à 90 %.",
          "Regroupé les congés, les présences et les éléments de paie dans un seul SIRH, en supprimant 3 tableurs et les erreurs de paie mensuelles.",
          "Mené l'enquête et clôturé 40 dossiers de relations avec les salariés par an, chacun avec des conclusions écrites.",
        ],
      },
      {
        title: "Chargée de recrutement",
        bullets: [
          "Recruté 180 employés de magasin et 25 managers en 2022 pour 30 magasins, surtout par cooptation et recrutement sur campus.",
          "Lancé une prime de cooptation qui a apporté 35 % des recrutements, pour un tiers du coût par recrutement d'un cabinet.",
          "Organisé 6 événements de recrutement par an dans des universités de l'Arizona et du Nouveau-Mexique, en pourvoyant 60 postes de trainee.",
        ],
      },
    ],
    education: [{ degree: "MBA", field: "Ressources humaines" }],
    skills: [
      {
        label: "RH",
        items: [
          "Acquisition de talents",
          "Relations avec les salariés",
          "Gestion de la performance",
          "Intégration",
          "Paie",
        ],
      },
      { label: "Outils", items: ["Workday", "Excel", "Google Workspace", "LinkedIn Recruiter"] },
    ],
  },
  lines: [
    {
      weak: "Responsable du recrutement de bout en bout.",
      strong:
        "Réduit le délai de recrutement des postes d'ingénieurs de 52 à 34 jours en instaurant des entretiens structurés et une règle de retour sous 48 heures.",
    },
    {
      weak: "Géré l'intégration des salariés.",
      strong:
        "Refondu l'intégration de 220 nouvelles recrues par an, en faisant passer la rétention à 90 jours de 81 % à 90 %.",
    },
    {
      weak: "Professionnelle RH rigoureuse, avec le souci du détail.",
      strong:
        "Regroupé les congés, les présences et les éléments de paie dans un seul SIRH, en supprimant 3 tableurs et les erreurs de paie mensuelles.",
    },
  ],
  skills: [{ label: "Gestion des personnes" }, { label: "Opérations" }, { label: "Outils" }],
  tips: [
    {
      title: "Utilise les chiffres que tu suis déjà",
      text: "Délai de recrutement, taux d'acceptation des offres, rétention à 90 jours, turnover, dossiers clos. Les équipes RH les suivent de toute façon ; un par ligne transforme les tâches en résultats.",
    },
    {
      title: "Nomme les systèmes",
      text: "Workday, SAP SuccessFactors, Darwinbox, Keka, Greenhouse : les offres citent souvent le SIRH ou le logiciel de recrutement, alors dis lesquels tu as utilisés.",
    },
    {
      title: "Garde le confidentiel confidentiel",
      text: "Compte les dossiers et dis comment ils se sont terminés, mais ne nomme jamais personne et ne décris jamais un dossier en détail. Les recruteurs le remarquent, et ça joue en ta faveur.",
    },
  ],
  mistakes: [
    {
      title: "« Recrutement de bout en bout »",
      text: "Ça dit que tu as fait tout le travail, mais pas à quel point tu l'as bien fait. La vérification des lignes d'Otto signale les débuts en « Responsable du » comme celui-ci ; ajoute combien de postes, à quelle vitesse, et par quels canaux.",
    },
    {
      title: "Des données personnelles d'un ancien format",
      text: "La date de naissance, la situation familiale et une photo figurent encore sur beaucoup de modèles de CV indiens. La plupart des employeurs n'en ont pas besoin, et elles ouvrent la porte aux biais. Retire-les.",
    },
    {
      title: "Un mur de soft skills",
      text: "« Bon relationnel, à l'écoute, travailleuse », c'est ce que tout le monde écrit. Montre la même chose avec une ligne sur un dossier que tu as clos ou une politique que tu as corrigée.",
    },
  ],
  faq: [
    {
      question: "Que doit contenir un CV RH ?",
      answer:
        "Tes domaines RH (recrutement, généraliste, paie ou formation), la taille des effectifs que tu accompagnais, et des chiffres comme le délai de recrutement ou la rétention. Ajoute les systèmes RH que tu as utilisés.",
    },
    {
      question: "Dois-je indiquer ma connaissance du droit du travail sur mon CV RH ?",
      answer:
        "Si le poste l'exige, montre-la dans une ligne : des politiques que tu as rédigées ou des audits que tu as réussis. Une simple liste de lois compte moins qu'un seul exemple où tu les as appliquées.",
    },
    {
      question: "Comment passer du recrutement à un poste de généraliste RH ?",
      answer:
        "Garde tes résultats en recrutement et ajoute tout travail de généraliste que tu as fait : intégration, politiques RH, relations avec les salariés ou éléments de paie. Une ligne de résumé peut nommer l'évolution que tu vises.",
    },
  ],
};
