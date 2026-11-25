import type { ExampleWords } from "../../../examples";

export const softwareEngineer: ExampleWords<"software-engineer"> = {
  role: "Ingénieur logiciel",
  card: "Quatre ans sur des systèmes de paiement, avec la stack et un chiffre dans chaque ligne.",
  description:
    "Exemple complet de CV d'ingénieur logiciel : lignes à impact, compétences des offres, conseils d'intitulé pour tout marché et erreurs à éviter.",
  intro:
    "Les managers qui recrutent lisent un CV d'ingénieur logiciel en cherchant trois choses : ce que tu as livré, à quelle échelle, et avec quelle stack. Cet exemple met les trois dans chaque ligne, pour que les humains comme les logiciels de recrutement les trouvent.",
  person:
    "Imani est inventée : une ingénieure orientée backend avec 4 ans sur des systèmes de paiement à New York. Les noms, les entreprises et les chiffres sont inventés ; copie la structure, pas les faits.",
  resume: {
    title: "CV d'ingénieure logiciel",
    basics: {
      headline: "Ingénieure logiciel",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Ingénieure logiciel avec 4 ans sur des systèmes de paiement en Java, Go et AWS. Prend en main ses services de la revue de conception jusqu'à l'astreinte, et les mesure après le lancement.",
    experience: [
      {
        title: "Ingénieure logiciel II",
        bullets: [
          "Créé en Go une couche d'idempotence pour les callbacks de paiement ACH, en ramenant les remboursements en double de 0,4 % des versements à moins de 0,05 %.",
          "Migré le rapport de règlement d'un batch nocturne vers des flux Kafka, pour que les commerçants voient les montants réglés en 10 minutes.",
          "Piloté avec un autre ingénieur la migration de 14 services d'EC2 vers Kubernetes sur AWS, sans aucune interruption visible pour les clients.",
          "Rédigé le runbook d'astreinte et les règles d'alerte Grafana, en faisant passer les alertes hebdomadaires de 22 à 6 en deux trimestres.",
        ],
      },
      {
        title: "Ingénieure logiciel",
        bullets: [
          "Livré une API REST d'export de factures en Java et Spring Boot, utilisée aujourd'hui par 1 800 petites entreprises chaque mois.",
          "Réduit la latence p95 de l'endpoint de recherche de factures de 1,2 s à 280 ms en ajoutant des index composites et un cache Redis.",
          "Ajouté au pipeline CI/CD des tests de contrat qui ont détecté en un an 9 changements d'API incompatibles avant leur mise en production.",
        ],
      },
    ],
    projects: [
      {
        name: "ledgerlite",
        tech: "Go, PostgreSQL",
        bullets: [
          "Publié une bibliothèque open source de comptabilité en partie double, utilisée aujourd'hui par 3 équipes de Paysprout pour les soldes des portefeuilles.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Informatique" }],
    skills: [
      { label: "Langages", items: ["Java", "Go", "Python", "SQL"] },
      {
        label: "Backend",
        items: ["Spring Boot", "Kafka", "PostgreSQL", "Redis", "REST", "gRPC"],
      },
      { label: "Cloud", items: ["AWS", "Kubernetes", "Docker", "Terraform", "Grafana"] },
    ],
    certifications: [{ name: "AWS Certified Developer – Associate" }],
  },
  lines: [
    {
      weak: "Responsable de la maintenance du backend de paiement.",
      strong:
        "Maintenu le backend de paiement à 99,95 % de disponibilité pendant un an grâce à des health checks, des relances automatiques et un runbook de bascule testé.",
    },
    {
      weak: "Travaillé sur l'amélioration des performances de nos API.",
      strong:
        "Réduit la latence p95 de l'API de recherche de factures de 1,2 s à 280 ms en ajoutant des index composites et un cache Redis.",
    },
    {
      weak: "Nous avons migré nos services vers Kubernetes.",
      strong:
        "Migré avec un autre ingénieur 14 services d'EC2 vers Kubernetes sur AWS, sans aucune interruption visible pour les clients.",
    },
  ],
  skills: [
    { label: "Langages" },
    { label: "Frameworks et données" },
    { label: "Cloud et livraison" },
  ],
  tips: [
    {
      title: "Mets la stack dans la ligne",
      text: "« Réduit la latence avec un cache Redis » montre Redis à l'œuvre. Une compétence qui n'apparaît que dans ta liste de compétences compte moins, pour les recruteurs comme pour le test de compatibilité d'Otto, qui la marque comme listée plutôt que démontrée.",
    },
    {
      title: "Donne une taille à chaque ligne",
      text: "Requêtes par seconde, utilisateurs, services, montants traités, minutes gagnées. Un seul chiffre suffit à transformer une tâche en résultat, et il donne à la personne qui te fait passer l'entretien une question à poser.",
    },
    {
      title: "Écris l'intitulé des deux façons",
      text: "Si ton entreprise dit SDE-2, écris « Software Engineer II (SDE-2) ». Les recruteurs en Inde cherchent les intitulés SDE ; les employeurs à l'étranger cherchent « software engineer », et les deux doivent pouvoir te trouver.",
    },
  ],
  mistakes: [
    {
      title: "Une liste de 40 outils",
      text: "Liste ce sur quoi tu accepterais volontiers qu'on t'interroge en entretien. Les outils que tu as touchés une fois appellent des questions auxquelles tu ne sauras pas répondre, et ils noient ceux qui comptent pour le poste.",
    },
    {
      title: "Des lignes sur l'équipe, pas sur toi",
      text: "« Nous avons migré nos services » cache ton rôle. La vérification des lignes d'Otto signale « nous » pour cette raison : dis ce que tu as fait, même si d'autres ont aidé.",
    },
    {
      title: "Deux colonnes et des barres de compétences",
      text: "Les logiciels de recrutement lisent tout droit à travers les colonnes et ne savent pas lire une barre. Une seule colonne de vrai texte garde tes postes, tes dates et tes compétences dans le bon ordre.",
    },
  ],
  faq: [
    {
      question: "Quelle longueur pour un CV d'ingénieur logiciel ?",
      answer:
        "Une page pour la plupart des gens avec moins de 5 ans d'expérience. Au-delà, deux pages conviennent si chaque ligne mérite sa place. La vue recruteur d'Otto signale tout ce qui dépasse deux pages.",
    },
    {
      question: "Dois-je ajouter le lien vers mon GitHub ou mon portfolio ?",
      answer:
        "Oui, s'il montre un travail dont tu aimerais parler. Un lien vers des dépôts vides ou abandonnés fait plus de mal que pas de lien du tout. Épingle d'abord tes deux ou trois meilleurs projets.",
    },
    {
      question: "Dois-je indiquer mon CTC ou mon préavis sur mon CV ?",
      answer:
        "Non. En Inde, les recruteurs demandent le CTC actuel, le CTC attendu et la durée du préavis dans le formulaire de candidature ou lors du premier appel. Garde le CV pour ton travail ; donne ces chiffres quand on te les demande.",
    },
  ],
};
