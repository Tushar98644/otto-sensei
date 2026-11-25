import type { ExampleWords } from "../../../examples";

export const projectManager: ExampleWords<"project-manager"> = {
  role: "Chef de projet",
  card: "Des projets livrés dans les délais et le budget, avec le périmètre, l'équipe et les risques derrière.",
  description:
    "Exemple de CV de chef de projet : périmètre, budget, délais et taille d'équipe, plus les compétences PMP et Agile à citer, conseils et erreurs.",
  intro:
    "Les managers qui recrutent lisent un CV de chef de projet avec trois questions en tête : quelle taille avaient les projets, ont-ils été livrés dans les délais et le budget, et qu'as-tu fait quand l'un d'eux a dérapé ? Cet exemple répond aux trois pour chaque poste.",
  person:
    "Nicole est inventée : une cheffe de projet certifiée PMP avec 7 ans à piloter des déploiements de logiciels et des déménagements de bureaux pour un réseau de santé à Chicago. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV de chef de projet",
    basics: {
      headline: "Cheffe de projet, PMP",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Cheffe de projet avec 7 ans à mener des déploiements de logiciels, des ouvertures de cliniques et des déménagements de bureaux pour un réseau de santé. Planifie dans le détail, signale les risques tôt et tient des budgets allant jusqu'à 4 M$.",
    experience: [
      {
        title: "Cheffe de projet senior",
        bullets: [
          "Piloté le déploiement d'un nouvel outil de prise de rendez-vous dans 42 cliniques en 14 mois, livré 3 semaines en avance et 180 000 $ sous un budget de 2,6 M$.",
          "Dirigé une équipe de 11 personnes (IT, opérations cliniques, fournisseur) avec un registre des risques hebdomadaire qui a détecté 2 problèmes de migration de données avant la mise en service.",
          "Réduit les rendez-vous non honorés de 14 % à 9 % en ajoutant des rappels par SMS au périmètre du déploiement après un pilote dans 6 cliniques.",
          "Créé dans Jira et Confluence un processus de demande de projet qui classe 60 demandes par an par coût et valeur, validées par la direction en une réunion.",
        ],
      },
      {
        title: "Cheffe de projet",
        bullets: [
          "Géré le déménagement de 380 salariés vers un nouveau siège en 2 week-ends, sans aucune journée de travail perdue et avec chaque poste opérationnel le lundi matin.",
          "Livré 3 ouvertures de cliniques dans les délais grâce à un plan unique partagé pour les travaux, le recrutement et l'équipement, réutilisé ensuite pour 5 autres sites.",
        ],
      },
      {
        title: "Coordinatrice de projet",
        bullets: [
          "Suivi les plannings et les budgets de 9 projets de construction d'un total de 22 M$, avec un point d'avancement hebdomadaire envoyé aux clients et aux chefs de chantier.",
          "Créé dans Excel un registre des avenants qui a réduit le délai d'approbation de 12 à 5 jours.",
        ],
      },
    ],
    education: [{ degree: "B.A.", field: "Administration des entreprises" }],
    skills: [
      {
        label: "Gestion de projet",
        items: [
          "Gestion de projet",
          "Gestion des risques",
          "Budgétisation",
          "Gestion des parties prenantes",
          "Gestion des fournisseurs",
          "Conduite du changement",
        ],
      },
      {
        label: "Méthodes et outils",
        items: ["Agile", "Scrum", "Jira", "Confluence", "Smartsheet", "Microsoft Project", "Excel"],
      },
    ],
    certifications: [
      { name: "Project Management Professional (PMP)" },
      { name: "Certified ScrumMaster (CSM)" },
    ],
  },
  lines: [
    {
      weak: "En charge de la planification et de l'exécution des projets.",
      strong:
        "Piloté le déploiement d'un nouvel outil de prise de rendez-vous dans 42 cliniques en 14 mois, livré 3 semaines en avance et 180 000 $ sous un budget de 2,6 M$.",
    },
    {
      weak: "Travaillé avec les parties prenantes pour garder les projets sur les rails.",
      strong:
        "Dirigé une équipe de 11 personnes (IT, opérations cliniques, fournisseur) avec un registre des risques hebdomadaire qui a détecté 2 problèmes de migration de données avant la mise en service.",
    },
    {
      weak: "Géré plusieurs projets en même temps.",
      strong:
        "Suivi les plannings et les budgets de 9 projets de construction d'un total de 22 M$, avec un point d'avancement hebdomadaire envoyé aux clients et aux chefs de chantier.",
    },
  ],
  skills: [{ label: "Pilotage de projet" }, { label: "Méthodes" }, { label: "Outils" }],
  tips: [
    {
      title: "Donne une taille à chaque projet",
      text: "Budget, taille de l'équipe, nombre de sites ou d'utilisateurs, et durée. Un lecteur ne distingue pas un projet de 50 000 $ d'un projet de 5 M$ si tu ne le dis pas, et la taille fixe ton niveau.",
    },
    {
      title: "Montre ce qui s'est passé quand ça a mal tourné",
      text: "Chaque projet rencontre un problème. Une ligne sur un risque repéré tôt ou un retard rattrapé en dit plus à un manager qui recrute que n'importe quelle affirmation sur ton sens de l'organisation.",
    },
    {
      title: "Adapte la méthode à l'offre",
      text: "Si l'offre demande de l'Agile, montre un projet mené en sprints. Si elle demande le PMP ou une approche en cascade, montre les phases, les validations et la gestion des changements. Commence par celle que l'offre veut.",
    },
  ],
  mistakes: [
    {
      title: "« Géré des projets du début à la fin »",
      text: "C'est la définition du poste, pas un résultat. Remplace cette ligne par un projet, sa taille, et s'il a été livré dans les délais et le budget.",
    },
    {
      title: "Chaque outil que tu as déjà ouvert",
      text: "Jira, Asana, Trello, Monday, Smartsheet et Wrike dans une seule liste, ça fait remplissage. Nomme les deux ou trois dans lesquels tu as mené de vrais projets, et montre-les dans une ligne.",
    },
    {
      title: "Cacher le PMP",
      text: "Si tu as le PMP ou le CSM, mets-le dans ton titre et à nouveau dans les certifications avec l'année. Les offres américaines l'exigent souvent, et les recruteurs le recherchent.",
    },
  ],
  faq: [
    {
      question: "Dois-je mettre le PMP sur mon CV de chef de projet ?",
      answer:
        "Oui, si tu l'as : dans ton titre et dans une section certifications avec l'année. Si tu le prépares encore, écris que ton examen PMP est programmé et donne le mois, plutôt que de laisser croire que tu l'as.",
    },
    {
      question: "Comment montrer une expérience en gestion de projet sans en avoir eu le titre ?",
      answer:
        "Garde ton vrai intitulé et écris des lignes sur les projets que tu as menés dans ce poste : périmètre, budget, équipe et résultat. Les coordinateurs, les ingénieurs et les analystes mènent souvent des projets sans en avoir le titre.",
    },
    {
      question: "Quels chiffres mettre sur un CV de chef de projet ?",
      answer:
        "Le budget, la taille de l'équipe, les dates prévues face aux dates réelles, le coût face au budget, et le résultat visé par le projet, comme moins de rendez-vous non honorés ou une validation plus rapide.",
    },
    {
      question: "Un CV de responsable de programme est-il différent d'un CV de chef de projet ?",
      answer:
        "Un responsable de programme pilote un ensemble de projets liés vers un même objectif : son CV montre donc le portefeuille, avec le nombre de projets, le budget cumulé et l'objectif qu'ils servaient. Un chef de projet montre chaque projet plus en détail.",
    },
  ],
};
