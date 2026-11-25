import type { Messages } from "..";
import type { Translation } from "../../types";

// The job match page around the tool, in French; the post's cue words stay English because the check reads English posts.
export default {
  meta: {
    title: "Compare ton CV à une offre d'emploi, gratuitement",
    description:
      "Colle ton CV et une offre d'emploi ou son lien : vois quelles compétences et quels outils l'offre cite, lesquels ton CV montre et lesquels manquent. Gratuit, sans connexion.",
  },
  toolName: "Test de compatibilité {brand}",
  eyebrow: "Gratuit, sans connexion",
  title: "Ton CV correspond-il",
  titleEm: "à cette offre ?",
  intro:
    "Vois quelles compétences l'offre cite, où ton CV montre chacune d'elles et ce qui manque. Des comptes, pas un score inventé.",
  faqTitle: "Ce que fait le test",
  faq: {
    looksFor: {
      question: "Que cherche le test ?",
      answer:
        "Les compétences, outils, certifications et langues que cite l'offre, parmi les quelque {known} qu'Otto connaît, comme Python, Figma, Salesforce, BLS ou l'espagnol courant. Il cherche chacun d'eux dans ton CV et te montre la ligne où il se trouve.",
    },
    mustHaves: {
      question: "Comment distingue-t-il l'indispensable du simple atout ?",
      answer:
        "Grâce aux titres et aux mots de l'offre elle-même. Une compétence sous « Requirements » ou « What you'll need », ou à côté de « required » ou « must », est indispensable. Une compétence sous « Nice to have », ou à côté de « a plus » ou « preferred », est un atout. Quand l'offre ne le dit pas, Otto ne devine pas.",
    },
    noScore: {
      question: "Pourquoi n'y a-t-il pas de score de compatibilité ?",
      answer:
        "Un pourcentage prétendrait en savoir plus qu'une simple vérification de mots. Logiciels de recrutement et recruteurs pèsent chaque critère à leur façon, alors Otto te montre les comptes et les lignes, et te laisse juger.",
    },
    meaning: {
      question: "Qu'est-ce qu'il ne vérifie pas ?",
      answer:
        "Le sens. Il compare les mots de l'offre, donc « j'ai dirigé une équipe de cinq personnes » ne comptera pas comme « leadership ». Il ne peut pas non plus juger les années d'expérience, les diplômes ni la qualité de ton travail, alors il te cite ces exigences de l'offre pour que tu les vérifies toi-même. Les vrais recruteurs lisent tout cela.",
    },
    listed: {
      question: "Que veut dire « Listée, pas démontrée » ?",
      answer:
        "La compétence figure dans une liste, comme ta section compétences ou ton titre, mais aucune ligne sur ton travail ne dit où tu l'as utilisée. C'est ce que cherchent les recruteurs : « J'ai reconstruit le service de facturation en Go » en dit plus que « Go » dans une liste.",
    },
    stored: {
      question: "Mon CV est-il conservé ?",
      answer:
        "Non. Le texte collé est vérifié dans ton navigateur et n'en sort jamais. Un fichier importé est envoyé à notre serveur pour que son texte soit lu, comme le lit un logiciel de recrutement, puis il est supprimé. Le lien d'une offre est aussi envoyé à notre serveur, qui ouvre l'offre et renvoie son texte. Tu n'as pas besoin de compte.",
    },
    tailoring: {
      question: "Quelle différence avec l'adaptation ?",
      answer:
        "Ce test montre ce qui est déjà là. L'adaptation avec Pro va plus loin : Otto lit l'offre pour en saisir le sens, place en premier tes meilleures lignes pour ce poste, écrit un résumé de profil sur mesure et t'aide à ajouter des lignes pour ce qui manque, à partir des faits que tu lui donnes, dans une copie adaptée. Vois <link>ce qu'inclut Pro</link>.",
    },
  },
  closing: {
    otto: "Otto la loutre, en train de lire un CV",
    title: "Vois ce que voit le logiciel.",
    cta: "Vérifier mon CV",
    note: "La vérification et les PDF sont gratuits. Pro et Max ajoutent plus d'aide d'Otto.",
  },
} satisfies Translation<Messages["jobMatch"]>;
