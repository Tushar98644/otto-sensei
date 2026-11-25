import type { ExampleWords } from "../../../examples";

export const businessDevelopment: ExampleWords<"business-development"> = {
  role: "Développement commercial et vente",
  card: "Quota, pipeline et taille des contrats, tels que les lisent les responsables commerciaux.",
  description:
    "Exemple de CV en développement commercial et vente : lignes avec quota, pipeline et taille des contrats, compétences CRM demandées et erreurs à éviter.",
  intro:
    "La vente est le métier le plus facile à chiffrer, et celui où l'on oublie le plus souvent les chiffres. Un responsable commercial veut ton quota, la fréquence à laquelle tu l'atteins, la taille de tes contrats et la façon dont tu les as trouvés. Cet exemple donne les quatre.",
  person:
    "Andre est inventé : un responsable développement commercial avec 5 ans de vente de logiciels aux entreprises de taille moyenne, basé à Atlanta. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV en développement commercial",
    basics: {
      headline: "Responsable développement commercial",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Responsable développement commercial avec 5 ans de vente de logiciels RH et paie à des entreprises de 50 à 1 000 salariés. Construit son pipeline par la prospection à froid et signe avec les directions financières et RH.",
    experience: [
      {
        title: "Responsable développement commercial",
        bullets: [
          "Réalisé 128 % d'un quota annuel de nouveaux clients sur l'exercice 2025, avec 31 nouveaux comptes à 10 500 $ par an en moyenne.",
          "Généré 60 % du pipeline via LinkedIn et la prospection téléphonique, avec 2 SDR qui décrochaient des démos à partir d'une liste de cibles partagée.",
          "Réduit le cycle de vente des contrats ETI de 74 à 52 jours en ajoutant un essai de paie sur les propres données du client.",
          "Tenu à jour les notes et prochaines étapes dans Salesforce, faisant passer les points de prévision de 45 à 20 minutes.",
        ],
      },
      {
        title: "Chargé de développement commercial",
        bullets: [
          "Signé 22 nouveaux comptes chargeurs en 2022, pour 360 000 $ de chiffre d'affaires fret annuel.",
          "Passé 60 appels par jour à de nouveaux chargeurs et converti 8 % des premiers rendez-vous en essais.",
          "Reconquis 9 comptes perdus en proposant une revue de service de 30 jours avec leur équipe opérations.",
        ],
      },
    ],
    education: [
      { degree: "MBA", field: "Marketing" },
      { degree: "B.S.", field: "Administration des entreprises" },
    ],
    skills: [
      {
        label: "Vente",
        items: [
          "Développement commercial",
          "Génération de leads",
          "Prospection téléphonique",
          "Négociation",
          "Gestion de comptes",
        ],
      },
      { label: "Outils", items: ["Salesforce", "HubSpot", "LinkedIn Sales Navigator", "Excel"] },
    ],
  },
  lines: [
    {
      weak: "Généré des leads et signé des contrats.",
      strong:
        "Réalisé 128 % d'un quota annuel de nouveaux clients sur l'exercice 2025, avec 31 nouveaux comptes à 10 500 $ par an en moyenne.",
    },
    {
      weak: "Excellentes compétences en communication et solides résultats commerciaux.",
      strong:
        "Réduit le cycle de vente des contrats ETI de 74 à 52 jours en ajoutant un essai de paie sur les propres données du client.",
    },
    {
      weak: "Passé des appels de prospection à des clients potentiels.",
      strong:
        "Passé 60 appels par jour à de nouveaux chargeurs et converti 8 % des premiers rendez-vous en essais.",
    },
  ],
  skills: [{ label: "Vente" }, { label: "Pipeline" }, { label: "Méthodes" }],
  tips: [
    {
      title: "D'abord le quota, ensuite le comment",
      text: "Pourcentage du quota, période, nombre de contrats et taille moyenne. Puis une ou deux lignes sur la façon dont tu as construit le pipeline. Cet ordre suit la façon dont lisent les responsables commerciaux.",
    },
    {
      title: "Écris les montants pour le marché que tu vises",
      text: "Les lakhs et les crores parlent naturellement aux employeurs indiens. Pour les postes à l'étranger, convertis en dollars américains ou dans la devise locale, pour que la taille de tes contrats soit claire d'un coup d'œil.",
    },
    {
      title: "Dis à qui tu vendais",
      text: "Taille de l'entreprise, secteur et poste de l'acheteur. Vendre aux DRH d'entreprises de 200 personnes, ce n'est pas le même métier que vendre aux achats d'une banque.",
    },
  ],
  mistakes: [
    {
      title: "Des qualités au lieu de résultats",
      text: "« Excellentes compétences en communication », tout le monde le dit. La vérification des lignes d'Otto le signale comme une formule toute faite ; un contrat signé le prouve.",
    },
    {
      title: "Du chiffre d'affaires sans quota",
      text: "« Rapporté 2 crores » peut être excellent ou sous l'objectif. Donne le quota ou ton rang dans l'équipe pour que le chiffre ait une échelle.",
    },
    {
      title: "Cacher les parties difficiles",
      text: "La prospection à froid, les cycles longs et les comptes perdus puis reconquis, c'est sur eux que portent les questions en entretien. Montre que tu sais trouver des affaires, pas seulement les prendre.",
    },
  ],
  faq: [
    {
      question: "Que doit montrer un CV de vente ou de développement commercial ?",
      answer:
        "L'atteinte du quota, le nombre et la taille des contrats, le cycle de vente, et la façon dont tu as construit ton pipeline. Ajoute le CRM que tu utilisais et le type de clients à qui tu vendais.",
    },
    {
      question: "Dois-je indiquer mes objectifs en lakhs ou en dollars ?",
      answer:
        "Utilise la devise de l'employeur. Les lakhs et les crores conviennent aux employeurs en Inde ; pour les postes à l'étranger, convertis en dollars ou indique des pourcentages du quota.",
    },
    {
      question: "Puis-je ajouter des récompenses comme « meilleur vendeur » ?",
      answer:
        "Oui, avec l'échelle : « Top 3 sur 40 account executives en 2024 » en dit plus que « Vendeur star ». Laisse de côté les récompenses que tu ne peux pas expliquer en une phrase.",
    },
  ],
};
