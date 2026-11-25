import type { ExampleWords } from "../../../examples";

export const customerSupport: ExampleWords<"customer-support"> = {
  role: "Support client",
  card: "Volume, temps de réponse et CSAT, de conseiller à chef d'équipe.",
  description:
    "Exemple de CV de support client : lignes avec délai de résolution, CSAT et volume, plus les outils de helpdesk et compétences demandés.",
  intro:
    "Les équipes support fonctionnent avec des chiffres : tickets par jour, délai de première réponse, CSAT, escalades. Un CV de support qui les utilise se lit comme celui de quelqu'un qui connaît déjà le métier. Cet exemple va du support téléphonique à un poste de chef d'équipe.",
  person:
    "Luis est inventé : un chef d'équipe support client avec 5 ans de support par téléphone et par chat pour une boutique en ligne, basé à San Antonio. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV de support client",
    basics: {
      headline: "Chef d'équipe support client",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Chef d'équipe support client avec 5 ans de support par téléphone, chat et e-mail pour une boutique en ligne de 2 millions de clients. Garde des files d'attente courtes et des réponses aimables, et corrige les causes des tickets récurrents.",
    experience: [
      {
        title: "Chef d'équipe support client",
        bullets: [
          "Encadre une équipe de 12 conseillers sur le chat et l'e-mail, avec une première réponse sous 2 minutes et un CSAT de 92 % pendant les soldes des fêtes.",
          "Rédigé 45 articles d'aide dans Zendesk sur les principales questions de remboursement et de livraison, réduisant ces tickets de 25 %.",
          "Mis en place une revue hebdomadaire des tickets récurrents avec l'équipe livraison, qui a corrigé un bug de code postal à l'origine de 1 500 tickets par mois.",
        ],
      },
      {
        title: "Conseiller support client",
        bullets: [
          "Répondu à 70 à 90 chats et appels par jour en espagnol et en anglais, avec un CSAT de 94 % sur 2 ans.",
          "Formé 20 nouvelles recrues aux remboursements et aux escalades, réduisant leur délai de pleine autonomie de 6 à 4 semaines.",
          "Remporté 2 fois le prix trimestriel de la qualité parmi 80 conseillers, pour les audits d'appels et le délai de résolution.",
        ],
      },
    ],
    education: [{ degree: "B.A.", field: "Anglais" }],
    skills: [
      {
        label: "Support",
        items: ["Support client", "Service client", "Helpdesk", "Gestion des escalades"],
      },
      { label: "Outils", items: ["Zendesk", "Freshdesk", "Google Sheets", "Excel"] },
      { label: "Langues", items: ["Espagnol", "Anglais"] },
    ],
  },
  lines: [
    {
      weak: "Traité les demandes des clients par chat et par téléphone.",
      strong:
        "Répondu à 70 à 90 chats et appels par jour en espagnol et en anglais, avec un CSAT de 94 % sur 2 ans.",
    },
    {
      weak: "Esprit d'équipe, à l'aise dans un environnement dynamique.",
      strong:
        "Encadre une équipe de 12 conseillers sur le chat et l'e-mail, avec une première réponse sous 2 minutes et un CSAT de 92 % pendant les soldes des fêtes.",
    },
    {
      weak: "Aidé les nouvelles recrues à apprendre le processus.",
      strong:
        "Formé 20 nouvelles recrues aux remboursements et aux escalades, réduisant leur délai de pleine autonomie de 6 à 4 semaines.",
    },
  ],
  skills: [{ label: "Support" }, { label: "Outils" }, { label: "Bureautique" }],
  tips: [
    {
      title: "Cite les indicateurs que suit ton équipe",
      text: "Tickets ou appels par jour, délai de première réponse, délai de résolution, CSAT et notes qualité. Si tu ne connais pas le chiffre exact, utilise une fourchette que tu peux défendre.",
    },
    {
      title: "Montre que tu corriges des causes, pas seulement des tickets",
      text: "Des articles d'aide qui font baisser un type de ticket, un bug que tu as fait corriger, un processus que tu as changé. C'est ce qui te fait passer de conseiller à chef d'équipe.",
    },
    {
      title: "Liste tes langues",
      text: "Beaucoup de postes de support en Inde et à l'étranger recrutent pour une langue. Cite chaque langue dans laquelle tu peux aider les clients, dans une ligne de compétences ou une section Langues.",
    },
  ],
  mistakes: [
    {
      title: "« Esprit d'équipe dans un environnement dynamique »",
      text: "La vérification des lignes d'Otto les signale comme des formules toutes faites : tous les CV de support en contiennent. Un score CSAT tenu sous pression dit la même chose, et le prouve.",
    },
    {
      title: "Des noms de processus inconnus à l'extérieur",
      text: "Les noms internes des files et des outils ne disent rien à un nouvel employeur. Décris le processus avec des mots simples.",
    },
    {
      title: "Cacher un passage en BPO",
      text: "Une expérience de support téléphonique dans un BPO (centre d'appels externalisé) est une vraie expérience de support. Cite le secteur du client si tu peux, et montre les chiffres.",
    },
  ],
  faq: [
    {
      question: "Quelles compétences montrer sur un CV de support client ?",
      answer:
        "Les canaux que tu as gérés (téléphone, chat, e-mail), les outils de helpdesk que tu as utilisés, tes langues, et des chiffres de volume, de temps de réponse et de CSAT.",
    },
    {
      question: "Comment passer du support client à un poste de chef d'équipe ?",
      answer:
        "Montre le travail de chef d'équipe que tu fais déjà : former les nouveaux arrivants, mener des audits qualité, rédiger des articles d'aide, prendre la file en charge. Donne un chiffre pour chacun, et dis dans ton résumé le poste que tu vises.",
    },
    {
      question: "Dois-je mentionner le travail de nuit ou en horaires tournants ?",
      answer:
        "Seulement si le poste le demande. Si une offre parle d'horaires tournants, une ligne qui dit que tu les as déjà pratiqués répond à la question avant qu'on la pose.",
    },
  ],
};
