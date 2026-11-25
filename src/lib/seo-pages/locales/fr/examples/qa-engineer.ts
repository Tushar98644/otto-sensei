import type { ExampleWords } from "../../../examples";

export const qaEngineer: ExampleWords<"qa-engineer"> = {
  role: "Ingénieur QA",
  card: "Des bugs repérés avant la mise en production, des tests plus rapides et une couverture en hausse.",
  description:
    "Exemple de CV d'ingénieur QA : tests Playwright, Selenium et API avec bugs en production, durée des tests et couverture, plus compétences et erreurs.",
  intro:
    "Un bon travail de test se mesure à ce qui n'arrive jamais jusqu'aux clients. Un CV QA doit le montrer : les bugs repérés avant la mise en production, les campagnes de tests raccourcies, et la part du produit que tes tests couvrent aujourd'hui. Cet exemple donne un chiffre à chacun de ces points.",
  person:
    "Kevin est inventé : un ingénieur QA avec 5 ans à tester des applis de paiement et de réservation de voyages, basé à Austin, au Texas. Les noms, les entreprises et les chiffres sont inventés.",
  resume: {
    title: "CV d'ingénieur QA",
    basics: {
      headline: "Ingénieur QA",
      links: [{ label: "GitHub" }],
    },
    summary:
      "Ingénieur QA avec 5 ans à tester des applis web et mobiles de paiement et de voyage. Construit en Playwright et en Java des suites automatisées qui repèrent les bugs avant la mise en production et gardent des campagnes de tests courtes.",
    experience: [
      {
        title: "Ingénieur QA",
        bullets: [
          "Construit une suite Playwright de 640 tests end-to-end pour la réservation et le paiement, ramenant la non-régression de 3 jours de tests manuels à 40 minutes.",
          "Ajouté au pipeline CI/CD des tests d'API pour 85 endpoints REST, en faisant passer les bugs trouvés en production de 14 à 4 par mois.",
          "Suivi les tests instables dans un tableau de bord Jira et corrigé les 30 pires, en faisant passer le taux de réussite des builds sains de 82 % à 99 %.",
        ],
      },
      {
        title: "Analyste QA",
        bullets: [
          "Rédigé 400 cas de test manuels pour une appli de paiement par carte et automatisé les 150 plus utilisés avec Selenium et Java.",
          "Découvert 3 jours avant la mise en production un bug d'arrondi dans la conversion de devises qui aurait surfacturé 2 % des paiements par carte étrangère.",
          "Mené des tests d'accessibilité sur 25 écrans de paiement et signalé 60 problèmes, tous résolus avant l'audit annuel de la banque.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Systèmes d'information" }],
    skills: [
      {
        label: "Automatisation",
        items: ["Playwright", "Selenium", "Cypress", "Java", "TypeScript"],
      },
      {
        label: "Tests",
        items: ["Tests d'API", "Tests de non-régression", "Accessibilité"],
      },
      { label: "Outils", items: ["Jira", "Postman", "Git", "Jenkins"] },
    ],
    certifications: [{ name: "ISTQB Certified Tester Foundation Level" }],
  },
  lines: [
    {
      weak: "Fait des tests manuels et automatisés pour l'appli de réservation.",
      strong:
        "Construit une suite Playwright de 640 tests end-to-end pour la réservation et le paiement, ramenant la non-régression de 3 jours de tests manuels à 40 minutes.",
    },
    {
      weak: "Testé des API et signalé les bugs aux développeurs.",
      strong:
        "Ajouté au pipeline CI/CD des tests d'API pour 85 endpoints REST, en faisant passer les bugs trouvés en production de 14 à 4 par mois.",
    },
    {
      weak: "Travaillé sur la correction des tests instables.",
      strong:
        "Suivi les tests instables dans un tableau de bord Jira et corrigé les 30 pires, en faisant passer le taux de réussite des builds sains de 82 % à 99 %.",
    },
  ],
  skills: [
    { label: "Automatisation" },
    { label: "Langages et API" },
    { label: "Processus et outils" },
  ],
  tips: [
    {
      title: "Compte les bugs échappés, pas les cas de test",
      text: "Rédiger 400 cas de test, c'est un effort ; moins de bugs qui arrivent en production, c'est le résultat. Associe la suite que tu as construite à la baisse des bugs en production ou des tickets de support qui a suivi.",
    },
    {
      title: "Montre la durée d'une campagne de tests",
      text: "Les équipes attendent la fin des campagnes de non-régression avant chaque mise en production. Des jours devenus des minutes, c'est un résultat que tout manager technique ressent : donne l'avant et l'après.",
    },
    {
      title: "Nomme ta plus belle trouvaille",
      text: "Une ligne sur un bug sérieux que tu as repéré, et ce qu'il aurait coûté, montre un jugement qu'un chiffre de couverture ne peut pas montrer.",
    },
  ],
  mistakes: [
    {
      title: "Lister tous les types de tests",
      text: "Smoke, sanity, non-régression, recette, boîte noire, boîte blanche : la liste remplit de la place sans montrer de compétence. Nomme les types de tests dans des lignes qui montrent ce qu'ils ont permis de repérer.",
    },
    {
      title: "Le manuel d'abord sur une offre d'automatisation",
      text: "Si l'offre demande de l'automatisation, mets tes suites automatisées en haut, même petites. Les tests manuels comptent toujours, mais commence par le code que tu as écrit.",
    },
    {
      title: "« Garanti la qualité du produit »",
      text: "Personne ne peut vérifier une telle affirmation. Dis ce que tu as testé, dans quelle proportion, et ce qui a changé : moins de bugs échappés, une campagne plus courte, un meilleur taux de réussite.",
    },
  ],
  faq: [
    {
      question: "Que doit contenir un CV d'ingénieur QA ?",
      answer:
        "Les produits que tu as testés, tes outils et langages d'automatisation, et des chiffres sur les bugs repérés, les bugs échappés en production, la durée des tests ou la couverture. Ajoute une certification ISTQB si tu en as une, mais laisse tes lignes porter l'essentiel.",
    },
    {
      question: "Comment passer des tests manuels à l'automatisation sur mon CV ?",
      answer:
        "Montre l'automatisation que tu as déjà faite, même en tâche annexe : scripts écrits, cas manuels automatisés, étape de pipeline ajoutée. Un petit projet public aide si le code de ton travail est privé.",
    },
    {
      question: "Un SDET, est-ce un métier différent d'un ingénieur QA ?",
      answer:
        "Un SDET écrit plus de code et construit souvent le framework de test lui-même, mais la recherche d'offres compatibles d'Otto classe les deux dans le même type de poste. Si tu postules à des postes de SDET, mets en premier tes lignes les plus orientées code.",
    },
  ],
};
