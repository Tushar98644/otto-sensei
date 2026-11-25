import type { ExampleWords } from "../../../examples";

export const accountExecutive: ExampleWords<"account-executive"> = {
  role: "Account executive",
  card: "Quota, taux de closing, taille des affaires et cycle de vente, pour la vente de logiciels.",
  description:
    "Exemple de CV d'account executive : lignes de vente SaaS avec quota, taux de closing, taille des affaires et cycle, et les compétences CRM demandées.",
  intro:
    "Un account executive est recruté pour signer : un responsable commercial lit donc d'abord le quota et le taux d'atteinte. Viennent ensuite la taille des affaires, le taux de closing et la durée du cycle, car ils montrent comment tu signes. Cet exemple les place tous là où on les trouve en quelques secondes.",
  person:
    "Megan est inventée : une account executive avec 5 ans de vente de logiciels de finance et d'analyse de données, basée à Chicago. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV d'account executive",
    basics: {
      headline: "Account Executive grands comptes",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Account executive avec 5 ans de vente de logiciels aux équipes finance des ETI et des grands comptes. A signé 2,4 M$ de nouveau revenu annuel l'an dernier, à 120 % du quota, en menant les affaires du premier appel au contrat signé.",
    experience: [
      {
        title: "Account Executive grands comptes",
        bullets: [
          "Signé 2,4 M$ de nouveau revenu récurrent annuel en 2025 pour un quota de 2,0 M$, à la 2e place sur 14 account executives.",
          "Augmenté le taux de closing des opportunités qualifiées de 22 % à 31 % grâce à des revues MEDDICC sur chaque affaire de plus de 50 000 $.",
          "Raccourci le cycle de vente moyen de 120 à 84 jours en intégrant les revues sécurité et juridique dès le premier mois.",
          "Généré 40 % du pipeline par la prospection téléphonique et sur LinkedIn, en décrochant environ 25 premiers rendez-vous par mois.",
        ],
      },
      {
        title: "Account Executive Mid-Market",
        bullets: [
          "Dépassé le quota sur 8 trimestres sur 10, avec une atteinte moyenne de 112 % d'un objectif annuel de 780 000 $.",
          "Augmenté la taille moyenne des affaires de 18 000 $ à 29 000 $ en présentant le module de paie à chaque première démo.",
          "Maintenu les prévisions trimestrielles dans Salesforce à moins de 10 % d'écart des ventes réelles pendant 8 trimestres d'affilée.",
        ],
      },
    ],
    education: [{ degree: "B.A.", field: "Communication" }],
    skills: [
      {
        label: "Vente",
        items: [
          "Négociation",
          "Gestion du pipeline",
          "Prévisions des ventes",
          "Prospection téléphonique",
          "MEDDICC",
        ],
      },
      { label: "Outils", items: ["Salesforce", "Gong", "Salesloft", "HubSpot", "Excel"] },
    ],
  },
  lines: [
    {
      weak: "Atteint et dépassé régulièrement les objectifs de vente.",
      strong:
        "Dépassé le quota sur 8 trimestres sur 10, avec une atteinte moyenne de 112 % d'un objectif annuel de 780 000 $.",
    },
    {
      weak: "Traité les affaires grands comptes de bout en bout.",
      strong:
        "Signé 2,4 M$ de nouveau revenu récurrent annuel en 2025 pour un quota de 2,0 M$, à la 2e place sur 14 account executives.",
    },
    {
      weak: "Fait partie d'une équipe qui a amélioré les taux de closing.",
      strong:
        "Augmenté le taux de closing des opportunités qualifiées de 22 % à 31 % grâce à des revues MEDDICC sur chaque affaire de plus de 50 000 $.",
    },
  ],
  skills: [{ label: "Vente" }, { label: "Affaires et comptes" }, { label: "Outils de vente" }],
  tips: [
    {
      title: "Mets le quota et le résultat dans la même ligne",
      text: "« 2,4 M$ pour un quota de 2,0 M$ » permet à un responsable commercial de voir d'un coup d'œil ton taux d'atteinte et la taille de ton objectif. Un pourcentage seul cache la taille de l'objectif.",
    },
    {
      title: "Montre la taille de tes affaires et ton cycle",
      text: "Vendre des contrats de 8 000 $ en deux semaines et des contrats de 200 000 $ sur six mois, ce sont deux métiers différents. Donne les deux chiffres pour que le manager qui recrute sache quel type de vente tu connais.",
    },
    {
      title: "Dis quelle part du pipeline tu as générée",
      text: "La plupart des postes d'AE attendent que tu trouves une partie de ton propre pipeline. Une ligne sur les rendez-vous obtenus en prospection ou le pipeline créé montre que tu n'attends pas que le marketing t'envoie des leads.",
    },
  ],
  mistakes: [
    {
      title: "Une récompense sans chiffres",
      text: "Le President's Club dit au lecteur que tu as réussi ; le quota et le taux d'atteinte qui l'expliquent disent à quel point. Garde la récompense, et mets les chiffres sur la même ligne.",
    },
    {
      title: "Un classement sans la taille du groupe",
      text: "« Meilleur commercial » pèse plus quand le lecteur sait que c'était 2e sur 14. Donne la taille de l'équipe à laquelle tu étais comparé, et la période.",
    },
    {
      title: "Chaque fonctionnalité montrée en démo",
      text: "Les fonctionnalités du produit ont leur place dans le deck commercial. Le CV doit dire qui a acheté, combien il a payé et ce qui l'a fait signer.",
    },
  ],
  faq: [
    {
      question: "Que doit contenir un CV d'account executive ?",
      answer:
        "Le quota et le taux d'atteinte de chaque année, la taille moyenne des affaires, le cycle de vente, le taux de closing, le segment auquel tu vendais et le CRM que tu utilisais. Les responsables commerciaux veulent deux ou trois ans de chiffres, pas un seul bon trimestre.",
    },
    {
      question: "Comment passer de SDR à account executive sur mon CV ?",
      answer:
        "Commence par les chiffres qui annoncent ta capacité à signer : rendez-vous obtenus, pipeline créé et part de ce pipeline devenue du chiffre d'affaires. Ajoute les affaires que tu as menées toi-même, même petites, et montre ta promotion si tu en as eu une.",
    },
    {
      question: "Dois-je indiquer mon quota si je ne l'ai pas atteint ?",
      answer:
        "Oui, avec le contexte qui le rend juste : un nouveau territoire, une période de montée en charge ou un marché qui s'est réduit. Sans le quota, les lecteurs imaginent le pire, et ils te poseront la question en entretien de toute façon.",
    },
  ],
};
