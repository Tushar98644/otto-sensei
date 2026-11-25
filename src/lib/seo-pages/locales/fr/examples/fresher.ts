import type { ExampleWords } from "../../../examples";

export const fresher: ExampleWords<"fresher"> = {
  role: "Jeune diplômé",
  card: "Un diplômé en informatique avec un stage et deux projets, sur une seule page.",
  description:
    "Exemple de CV de jeune diplômé sur une page : projets, stages et GPA bien présentés, les compétences à lister et les erreurs à éviter.",
  intro:
    "Sans emploi à temps plein pour l'instant, un CV de jeune diplômé repose sur les projets, les stages, les notes et la preuve que tu termines ce que tu commences. Cet exemple est celui d'un diplômé en informatique qui postule à des postes d'ingénieur logiciel débutant (trainee ou associate), et la même structure marche pour tout jeune diplômé.",
  person:
    "Noah est inventé : un diplômé en informatique de la promotion 2026, à Raleigh, avec un stage et deux projets. Les noms, les universités, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV de jeune diplômé",
    basics: {
      headline: "Diplômé en informatique",
      links: [{ label: "Portfolio" }],
    },
    summary:
      "Diplômé en informatique (2026) à la recherche d'un poste d'ingénieur logiciel débutant (trainee ou associate). A construit et mis en ligne deux projets full-stack, et passé un été à corriger de vrais bugs dans une startup.",
    education: [
      {
        degree: "B.S.",
        field: "Informatique",
        bullets: ["GPA 3,7/4,0. Projet de fin d'études : suivi des bus du campus (voir plus bas)."],
      },
      {
        degree: "Diplôme de fin d'études secondaires",
        field: "",
        bullets: ["GPA 3,9/4,0"],
      },
    ],
    experience: [
      {
        title: "Stagiaire ingénieur logiciel",
        bullets: [
          "Corrigé 14 bugs dans le tableau de bord React, dont un bug de date qui affichait de mauvais jours de livraison à 3 000 utilisateurs.",
          "Écrit 40 tests unitaires avec Jest pour le formulaire de réservation, en faisant passer sa couverture de 20 % à 75 %.",
        ],
      },
    ],
    projects: [
      {
        name: "Suivi des bus du campus",
        tech: "React, Node.js, MongoDB",
        bullets: [
          "Créé un suivi en temps réel des 6 bus du campus dans une équipe de 3, utilisé aujourd'hui par environ 900 étudiants chaque matin.",
          "Réduit l'intervalle de mise à jour de la carte de 30 à 5 secondes en envoyant les points GPS par WebSockets plutôt que par polling.",
        ],
      },
      {
        name: "Partage de dépenses",
        tech: "Python, Django, PostgreSQL",
        bullets: [
          "Créé une application web pour partager les dépenses de résidence étudiante et de voyage, avec des liens de paiement Venmo, utilisée par 120 amis et camarades.",
        ],
      },
    ],
    skills: [
      { label: "Langages", items: ["Java", "Python", "JavaScript", "SQL"] },
      { label: "Web", items: ["React", "Node.js", "Django", "HTML", "CSS"] },
      { label: "Outils", items: ["Git", "Linux", "MongoDB", "PostgreSQL"] },
    ],
    certifications: [{ name: "freeCodeCamp: JavaScript Algorithms and Data Structures" }],
  },
  lines: [
    {
      weak: "Fait un projet sur le suivi de bus.",
      strong:
        "Créé un suivi en temps réel des 6 bus du campus dans une équipe de 3, utilisé aujourd'hui par environ 900 étudiants chaque matin.",
    },
    {
      weak: "Jeune diplômé travailleur et passionné par l'informatique, désireux d'apprendre.",
      strong:
        "Corrigé 14 bugs dans le tableau de bord React, dont un bug de date qui affichait de mauvais jours de livraison à 3 000 utilisateurs.",
    },
    {
      weak: "Appris React et Node.js pendant le stage.",
      strong:
        "Écrit 40 tests unitaires avec Jest pour le formulaire de réservation, en faisant passer sa couverture de 20 % à 75 %.",
    },
  ],
  skills: [{ label: "Langages" }, { label: "Web" }, { label: "Outils" }],
  tips: [
    {
      title: "La formation passe en premier",
      text: "Tant que tu n'as pas d'emploi à temps plein, ton diplôme, ton université et ton GPA sont tes faits les plus solides. Place la Formation au-dessus de l'Expérience, et garde tes résultats du lycée tant que les offres sur campus les demandent encore.",
    },
    {
      title: "Traite tes projets comme des emplois",
      text: "Chaque projet a droit au même type de ligne qu'un emploi : ce que tu as construit, qui l'a utilisé, et un chiffre. Un projet avec 10 vrais utilisateurs vaut mieux qu'un clone de tutoriel qui n'en a aucun.",
    },
    {
      title: "Une page, sans exception",
      text: "Les recruteurs des recrutements sur campus et des embauches en masse lisent des centaines de CV de jeunes diplômés. Tiens-toi à une page ; Compact y fait tenir plus de contenu sans réduire le texte.",
    },
  ],
  mistakes: [
    {
      title: "Un objectif rempli d'adjectifs",
      text: "« Jeune diplômé travailleur et passionné par l'informatique, désireux d'apprendre » figure sur des milliers de CV. La vérification des lignes d'Otto signale les formules toutes faites comme « passionné par ». Dis le poste que tu vises et une chose que tu as construite.",
    },
    {
      title: "Des données personnelles et une déclaration",
      text: "Le nom du père, la date de naissance, une photo et « Je déclare par la présente que les informations ci-dessus sont exactes » viennent de vieux modèles. Les employeurs n'en ont pas besoin, et ils prennent la place de tes projets.",
    },
    {
      title: "Lister des cours comme compétences",
      text: "« Systèmes d'exploitation, SGBD, Réseaux informatiques » sont des matières, pas des compétences. Liste les langages et les outils que tu as utilisés dans un projet ou un stage.",
    },
  ],
  faq: [
    {
      question: "Quel est le meilleur format de CV pour un jeune diplômé ?",
      answer:
        "Une page, une colonne, avec la Formation en premier, puis les stages, les projets, les compétences et les certifications. Classic et Compact conviennent tous les deux et se téléchargent gratuitement en PDF.",
    },
    {
      question: "Un jeune diplômé doit-il mettre son CGPA sur son CV ?",
      answer:
        "Oui, si ça t'aide. Beaucoup d'offres sur campus et de postes de trainee fixent une note minimale, et l'omettre peut donner l'impression que tu la caches. Écris-la comme ton université, par exemple 3,7/4,0 ou 8,4/10.",
    },
    {
      question: "Puis-je faire un CV de jeune diplômé sans stage ?",
      answer:
        "Oui. Commence par deux ou trois projets rédigés comme des emplois, ajoute des hackathons, des clubs étudiants ou des missions en freelance avec des chiffres, et garde la Formation en haut.",
    },
  ],
};
