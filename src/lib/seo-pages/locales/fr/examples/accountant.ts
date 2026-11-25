import type { ExampleWords } from "../../../examples";

export const accountant: ExampleWords<"accountant"> = {
  role: "Comptable",
  card: "Une clôture plus rapide et plus propre : rapprochements, audits et les contrôles qui les encadrent.",
  description:
    "Exemple de CV de comptable : clôture mensuelle, rapprochements et audits chiffrés, plus les compétences GAAP, ERP et Excel demandées par les offres.",
  intro:
    "La plupart des CV de comptable listent les mêmes tâches : écritures, rapprochements, clôture mensuelle. Ce qui fait la différence, c'est la qualité du résultat. Cet exemple mesure la clôture en jours, les rapprochements en comptes et en dollars, et l'audit en ajustements.",
  person:
    "Megan est inventée : une comptable CPA avec 6 ans d'expérience, d'abord en audit dans un petit cabinet, puis chez un industriel d'Indianapolis. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV de comptable",
    basics: {
      headline: "Comptable senior, CPA",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "CPA avec 6 ans en audit et en comptabilité d'entreprise, qui gère aujourd'hui la clôture mensuelle d'un industriel de 240 M$ de chiffre d'affaires. Tient des rapprochements propres, des dossiers d'audit clairs et une clôture dans les délais.",
    experience: [
      {
        title: "Comptable senior",
        bullets: [
          "Réduit la clôture mensuelle de 9 à 5 jours ouvrés en passant 120 écritures récurrentes sur des modèles NetSuite et en fixant un calendrier de clôture quotidien.",
          "Rapproché 65 comptes de bilan chaque mois, en soldant 410 000 $ d'éléments anciens restés inexpliqués pendant plus d'un an.",
          "Piloté l'audit de fin d'exercice avec un cabinet externe, en livrant 180 demandes dans les délais, sans aucun ajustement d'audit.",
          "Construit un modèle de coût des stocks sous Excel pour 3 usines, en repérant 260 000 $ d'en-cours surévalués avant l'audit.",
        ],
      },
      {
        title: "Comptable",
        bullets: [
          "Comptabilisé les acquisitions d'immobilisations et les amortissements de 1 400 actifs, et corrigé une erreur de 95 000 $ dans un échéancier de location ASC 842.",
          "Rédigé des guides pas à pas pour 14 tâches de clôture, si bien que 2 nouvelles recrues clôturaient seules leurs comptes dès leur deuxième mois.",
        ],
      },
      {
        title: "Auditrice junior",
        bullets: [
          "Audité 11 clients industriels et associatifs de 5 M$ à 90 M$ de chiffre d'affaires, en testant les ventes, les stocks et la paie.",
          "Détecté un double paiement fournisseur de 70 000 $ chez un client associatif, ce qui a conduit à un nouveau contrôle d'approbation des paiements de plus de 10 000 $.",
        ],
      },
    ],
    education: [
      { degree: "M.Acc.", field: "Comptabilité" },
      { degree: "B.S.", field: "Comptabilité" },
    ],
    skills: [
      {
        label: "Comptabilité",
        items: [
          "GAAP",
          "Clôture mensuelle",
          "Rapprochements de comptes",
          "Écritures comptables",
          "Support aux audits",
          "ASC 842",
        ],
      },
      { label: "Systèmes", items: ["NetSuite", "Excel", "BlackLine", "QuickBooks"] },
    ],
    certifications: [{ name: "Certified Public Accountant (CPA)" }],
  },
  lines: [
    {
      weak: "Responsable de la clôture mensuelle.",
      strong:
        "Réduit la clôture mensuelle de 9 à 5 jours ouvrés en passant 120 écritures récurrentes sur des modèles NetSuite et en fixant un calendrier de clôture quotidien.",
    },
    {
      weak: "Effectué les rapprochements de comptes.",
      strong:
        "Rapproché 65 comptes de bilan chaque mois, en soldant 410 000 $ d'éléments anciens restés inexpliqués pendant plus d'un an.",
    },
    {
      weak: "Aidé à préparer l'audit annuel.",
      strong:
        "Piloté l'audit de fin d'exercice avec un cabinet externe, en livrant 180 demandes dans les délais, sans aucun ajustement d'audit.",
    },
  ],
  skills: [
    { label: "Comptabilité" },
    { label: "Systèmes" },
    { label: "Tableurs et certifications" },
  ],
  tips: [
    {
      title: "Mesure la clôture",
      text: "Jours de clôture, comptes rapprochés, écritures automatisées. La clôture est le cœur du métier : donne-lui un chiffre avant et un chiffre après.",
    },
    {
      title: "Nomme les normes et le système",
      text: "Précise quels sujets GAAP tu as traités, comme les revenus selon l'ASC 606 ou les contrats de location selon l'ASC 842, et l'ERP dans lequel tu clôturais. Les offres citent souvent les deux, et une correspondance aide un recruteur à te situer.",
    },
    {
      title: "Mets le CPA bien en vue",
      text: "Ajoute CPA après ton nom ou dans ton titre, et indique la licence avec son État et son année. Si tu passes encore les examens, dis quelles sections tu as réussies.",
    },
  ],
  mistakes: [
    {
      title: "Recopier la fiche de poste",
      text: "« Préparation des écritures et des rapprochements », l'offre le dit déjà. Ajoute combien, à quelle vitesse, et ce que tu as repéré en chemin.",
    },
    {
      title: "Oublier les résultats d'audit",
      text: "C'est à l'audit que le travail d'un comptable est noté. Si le tien s'est conclu sans ajustement, ou avec moins de constats que l'année précédente, dis-le avec les chiffres.",
    },
    {
      title: "Chaque logiciel que tu as déjà touché",
      text: "Une longue liste de logiciels comptables repousse celui qui compte vers le bas de la page. Commence par l'ERP que cite l'offre, et résume les anciens systèmes ou retire-les.",
    },
  ],
  faq: [
    {
      question: "Que doit contenir un CV de comptable ?",
      answer:
        "Ton statut de CPA, la taille des comptes que tu tenais, la clôture et les rapprochements dont tu avais la charge, les résultats d'audit, et tes compétences ERP et Excel. Donne des chiffres en jours, en comptes et en dollars.",
    },
    {
      question: "Dois-je indiquer les sections de l'examen CPA que j'ai réussies ?",
      answer:
        "Oui. Écris « Candidat au CPA » avec les sections réussies, comme AUD et FAR, et l'année, pour que les recruteurs voient que tu es en bonne voie. Une fois la licence obtenue, indique plutôt la licence.",
    },
    {
      question: "Comment passer d'un cabinet d'audit à l'entreprise ?",
      answer:
        "Garde le poste en audit et montre le travail pour tes clients en chiffres : combien de clients, de quelle taille, ce que tu as testé. Ajoute ensuite tout travail de clôture, de rapprochement ou sur les systèmes, pour qu'un responsable comptable voie que tu sais tenir les comptes.",
    },
  ],
};
