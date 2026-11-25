import type { Messages } from "..";
import type { Translation } from "../../types";

// The home page, in French.
export default {
  meta: {
    title: "Vérificateur et créateur de CV ATS gratuit, avec IA",
    description:
      "Vérifie et crée ton CV ATS gratuitement avec l'aide de l'IA d'Otto, plus des offres classées selon ton CV, le suivi de tes candidatures, la préparation aux entretiens et un site portfolio.",
  },
  cta: {
    check: "Vérifier mon CV",
    continueWith: "Continuer avec {title}",
  },
  hero: {
    eyebrow: "Gratuit pour commencer",
    title: "Toute ta recherche d'emploi,",
    titleEm: "au <b>même endroit</b>.",
    lead: {
      check: "Vérifie et corrige ton CV, puis trouve des offres classées selon ton profil.",
      track: "Suis tes candidatures, prépare tes entretiens, partage un portfolio.",
    },
    featuresLabel: "Ce que fait Otto",
    features: {
      checker: "Vérification de CV",
      jobs: "{count} offres ouvertes",
      jobsNoCount: "Offres ouvertes",
      emailTracking: "Suivi par e-mail",
      interviewPrep: "Préparation aux entretiens",
      portfolio: "Site portfolio",
      extension: "Extension Chrome",
      extensionSoon: "Extension Chrome, bientôt",
    },
    noSignup: "Pas besoin de t'inscrire. Ton fichier est lu, puis supprimé.",
    another: "Ou <link>vérifie un autre fichier</link>. Il est lu, puis supprimé.",
    jobPost: "Tu as une offre d'emploi ? <link>Teste ta compatibilité</link>.",
  },
  demo: {
    see: "Ce que tu vois",
    reads: "Ce que lit le logiciel de recrutement",
    views: { label: "Exemple de CV", see: "Ce que tu vois", reads: "Ce que lit le logiciel" },
    otto: "Otto la loutre, qui jette un œil par-dessus la fenêtre",
    plainText: "Texte brut",
    mixed: "Compétences mêlées aux expériences",
    captionTitle: "Exemple de CV",
    caption:
      "Les colonnes ont fière allure pour un humain. Le logiciel, lui, les lit tout droit, d'un bord à l'autre.",
  },
  resume: {
    label:
      "Exemple de CV de {name}, designer produit. Les compétences et les langues sont dans une colonne à gauche, l'expérience professionnelle dans une colonne à droite, avec de petites icônes à côté de son e-mail et de son téléphone.",
    role: "Designer produit",
    headings: { skills: "Compétences", languages: "Langues", experience: "Expérience" },
    skills: { research: "Recherche utilisateur", prototyping: "Prototypage" },
    languages: { english: "Anglais", spanish: "Espagnol" },
    jobs: {
      senior: {
        title: "Designer produit senior",
        dates: "2021 – aujourd'hui",
        bullet: "Refonte du tunnel de paiement. Commandes en hausse de 18 %.",
      },
      designer: {
        title: "Designer produit",
        dates: "2018 – 2021",
        bullet: "Création du design system de l'équipe.",
      },
    },
  },
  upload: {
    opening: "Ouverture de {name} dans le studio.",
    oneFile: "Choisis un seul fichier à la fois.",
    problems: {
      unsupported: "Ce type de fichier n'est pas pris en charge.",
      unsupportedKinds: "Ce type de fichier n'est pas pris en charge. Choisis un fichier {kinds}.",
      kinds: "{first} ou {last}",
      empty: "Ce fichier est vide. Choisis-en un autre.",
      tooBig: "Ce fichier est trop lourd. La limite est de {limit}.",
    },
    drop: "Dépose ton CV pour le vérifier",
    formats: "PDF ou Word (.docx), jusqu'à {size}",
  },
  how: {
    eyebrow: "Comment ça marche",
    title: "De l'ancien fichier au PDF propre",
    intro: "Cinq étapes. Arrête-toi après n'importe laquelle.",
    step: "Étape {number} · {name}",
    steps: {
      upload: {
        name: "Importer",
        caption: "Dépose ton fichier PDF ou Word, ou pars de zéro.",
      },
      recruiterView: {
        name: "Vue recruteur",
        caption:
          "Vois le texte qu'extrait le logiciel de recrutement, avec des vérifications claires et la raison de chacune.",
      },
      fix: {
        name: "Corriger les lignes avec Otto",
        caption:
          "Otto te demande l'info qui manque, puis écrit la ligne à partir de ta réponse. Tape-la ou dis-la à voix haute. Il n'invente jamais de chiffres, et tu gardes, modifies ou ignores chaque suggestion.",
      },
      tailor: {
        name: "Adapter à une offre",
        caption: "Colle une offre d'emploi pour voir quels mots-clés tu as et lesquels manquent.",
      },
      download: {
        name: "PDF gratuit",
        caption:
          "Télécharge gratuitement un PDF propre, puis vérifie-le à nouveau. Chaque format se lit de haut en bas, avec les titres sur leur propre ligne, au format Lettre US ou A4.",
      },
    },
    upload: { meta: "PDF · une page", reading: "Lecture de ton fichier" },
    checks: {
      meta: { one: "{count} vérification", other: "{count} vérifications" },
      items: {
        columns: {
          title: "Mise en page sur deux colonnes",
          detail: "Tes compétences se sont mélangées à ton parcours professionnel.",
        },
        icons: {
          title: "Icônes dans ta ligne de contact",
          detail: "Elles deviennent des symboles parasites. Des mots simples fonctionnent mieux.",
        },
        contact: {
          title: "E-mail et téléphone trouvés",
          detail: "Les recruteurs peuvent te contacter.",
        },
      },
    },
    fixer: {
      addNumber: "Ajoute un chiffre",
      before: "Avant : ",
      line: "Responsable de la gestion des comptes sur les réseaux sociaux",
      questions: "Une question",
      question: "De combien tes abonnés ont-ils augmenté ?",
      you: "Toi",
      saidOutLoud: "Dit à voix haute",
      answer: "Ils ont triplé en 6 mois. Je publiais des vidéos courtes tous les jours.",
      looksGood: "C'est bon",
      after: "Après : ",
      fixed:
        "Abonnés sur les réseaux sociaux multipliés par 3 en 6 mois grâce à des vidéos courtes publiées chaque jour",
      updated: "Ligne mise à jour",
    },
    tailor: {
      jobPost: "Offre d'emploi",
      jobTitle: "Designer produit senior",
      onResume: "Dans ton CV",
      missing: "Manquant",
      onlyIfTrue: "· à ajouter seulement si c'est vrai",
      terms: { accessibility: "Accessibilité", abTesting: "Tests A/B" },
    },
    download: {
      before: "Avant",
      beforeText: "problèmes dans l'ancien fichier",
      after: "Après",
      afterText: "problème dans ton nouveau PDF",
    },
  },
  jobs: {
    eyebrow: "Emplois · nouveaux chaque jour",
    title: "{count} offres ouvertes, classées selon ton CV",
    titleNoCount: "Des offres ouvertes, classées selon ton CV",
    intro:
      "Otto lit chaque jour les pages carrières des entreprises et ne te montre que des offres dans ton domaine, les plus pertinentes d'abord, avec une raison claire pour chacune. Free affiche tes {free} meilleures offres ; Pro te compare à toutes.",
    caption:
      "La vraie page Emplois : un commercial avec un stage en marketing digital choisit « Tout poste en marketing », et Otto classe des offres de marketing de niveau débutant selon le SEO, Google Ads et HubSpot de son CV.",
    points: {
      matched: {
        title: "Ton type de poste, comparé à ton CV",
        text: "Otto comprend ce que veut dire un intitulé de poste : un ingénieur logiciel voit les offres de développeur backend, mais pas celles du support ou de la vente. Chaque offre montre ce que ton CV a et ce qui lui manque.",
      },
      visa: {
        title: "Visa et autorisation de travail, vérifiés",
        text: "Avec Pro, dis à Otto où tu as le droit de travailler : les offres qui disent ne pas pouvoir t'embaucher sont marquées, et un seul bouton les masque. Les entreprises inscrites au registre public H-1B des États-Unis ou au registre public des sponsors du Royaume-Uni sont signalées comme telles.",
      },
      role: {
        title: "Le poste, le niveau et le lieu que tu veux",
        text: "Choisis un poste, un niveau et un lieu, ou le télétravail uniquement. Pour commencer, Otto les devine à partir de ton CV.",
      },
      direct: {
        title: "En direct de l'entreprise",
        text: "Les offres viennent des pages carrières des entreprises elles-mêmes et de flux d'offres publics aux États-Unis, au Royaume-Uni, en Australie, en Amérique latine, en Europe et ailleurs, lus chaque jour. Chacune renvoie vers l'offre d'origine.",
      },
    },
    link: "Trouver mes offres",
  },
  emailTracking: {
    eyebrow: "Suivi par e-mail · Pro",
    title: "Tes candidatures se mettent à jour toutes seules",
    intro:
      "Les e-mails de recrutement disent déjà où en est chaque candidature. Transfère-les à Otto une fois pour toutes, et ton tableau suit le rythme sans que tu déplaces une seule carte.",
    caption:
      "Le vrai tableau à l'arrivée de trois e-mails : le remerciement de Northwind ajoute l'offre, l'invitation de Brightloop la passe en Entretien avec la date, et la mise à jour d'Acme la clôture.",
    points: {
      setup: {
        title: "Une seule configuration, dans Gmail",
        text: "Tu reçois ta propre adresse Otto et un filtre Gmail qui n'y transfère que les e-mails liés à tes candidatures. Trois étapes, quelques minutes, avec un test à la fin.",
      },
      board: {
        title: "Le tableau avance tout seul",
        text: "Un remerciement ajoute l'offre à la colonne Postulé, une invitation à un entretien ou à un test la passe en Entretien avec la date, et les offres d'embauche comme les refus vont à leur place. Une carte ne recule jamais.",
      },
      rules: {
        title: "Des règles fixes, un minimum de données",
        text: "Otto lit chaque e-mail avec des règles fixes, sans IA, et ne garde que le domaine de l'expéditeur, l'objet et ce qu'il y a trouvé. Les e-mails qu'il ne peut pas vérifier t'attendent dans une liste « À vérifier ».",
      },
    },
  },
  interviewPrep: {
    eyebrow: "Préparation aux entretiens · Pro",
    title: "Sache ce qu'on va te demander,",
    titleEm: "et ce que tu vas répondre.",
    intro:
      "Pour chaque entretien, Otto lit l'offre d'emploi et ton CV, et rédige un dossier de préparation pour ce poste précis. Ensuite, tu t'entraînes à voix haute, avec Otto qui pose les questions.",
    caption:
      "Un vrai dossier de préparation pour un entretien de designer produit chez Northwind : les questions probables, une histoire tirée du CV, l'entretien métier en design et le mode entraînement.",
    points: {
      questions: {
        title: "Les questions probables, étape par étape",
        text: "De l'ouverture à la conclusion, chaque question indique ce que le recruteur cherche à évaluer, les points à aborder et la relance à prévoir. Viennent ensuite des questions à lui poser.",
      },
      stories: {
        title: "Des histoires tirées de tes propres lignes",
        text: "Chaque histoire part d'une ligne de ton CV, racontée en situation, tâche, action et résultat. Ce que ton CV ne dit pas reste un blanc à compléter, jamais inventé.",
      },
      craft: {
        title: "Un entretien métier, puis l'entraînement",
        text: "Les postes techniques ont droit à un entretien technique sur tes projets, les concepts clés et la conception de systèmes. Les designers et les product managers en ont un sur leur métier. Puis Otto joue le recruteur, une question à la fois.",
      },
    },
    also: {
      title: "Aussi dans Otto",
      letters: {
        label: "Lettres",
        text: "Lettres de motivation, messages de prise de contact et réponses aux questions de candidature, rédigés uniquement à partir de ton CV et de l'offre d'emploi.",
      },
      careerLog: {
        label: "Journal de carrière",
        text: "Une note d'une minute sur ton travail chaque mois, gratuite avec tous les forfaits. Avec Pro, Otto transforme ces notes en lignes de CV avec tes propres chiffres.",
      },
    },
  },
  extension: {
    eyebrow: "Otto pour Chrome",
    eyebrowSoon: "Otto pour Chrome · bientôt disponible",
    title: "Postule plus vite, directement depuis l'offre",
    intro:
      "Vois à quel point ton profil correspond avant même de lire toute l'offre, enregistre-la dans ton tableau en un clic, et laisse Otto remplir les longs formulaires de candidature à partir de ton CV. Tu vérifies chaque réponse et tu cliques toi-même sur Envoyer.",
    onPost: "Sur l'offre d'emploi",
    onForm: "Sur le formulaire de candidature",
    points: {
      badge: {
        title: "Un badge de compatibilité sur l'offre",
        text: "Sur LinkedIn, Naukri et les pages carrières des entreprises, le badge d'Otto montre quelles compétences de l'offre ton CV contient et lesquelles lui manquent. Le test se fait dans ton navigateur et n'envoie l'offre nulle part.",
      },
      save: {
        title: "Enregistre-la dans ton suivi",
        text: "Enregistrer place l'offre dans la colonne À postuler de ton tableau Candidatures, avec une copie de l'annonce au cas où elle serait retirée.",
      },
      tailor: {
        title: "Adapter et Lettre depuis l'offre",
        text: "Avec {plans}, Adapter ouvre Otto avec ton CV adapté à cette offre, et Lettre avec une lettre de motivation pour elle.",
      },
      fill: {
        title: "Remplir avec Otto sur les formulaires de candidature",
        text: "Avec {plans}, Otto remplit les formulaires Greenhouse, Lever, Ashby et Workday à partir de ton CV et de tes réponses enregistrées. Tu vérifies et tu cliques sur Envoyer. Otto ne remplit jamais les questions d'auto-identification ou de consentement.",
      },
    },
    post: {
      label:
        "Exemple : le badge d'Otto dans le coin d'une offre de {title}, avec {found} compétences sur {total} trouvées, et il manque {missing}.",
      title: "Designer produit senior",
      where: "Télétravail, Europe",
      careers: "Carrières chez {company}",
      meta: "Offre d'emploi",
      about: "À propos du poste",
      bring: "Ce que tu apporteras",
      found: "sur <b>{total}</b> compétences trouvées",
      missing: "Manquante : <b>{skill}</b>",
      skill: "accessibilité",
      actions: { save: "Enregistrer", tailor: "Adapter", letter: "Lettre" },
    },
    form: {
      label:
        "Exemple : Remplir avec Otto sur le formulaire de candidature de {company}, avec {filled} champs remplis, le CV joint, une réponse rédigée à « {question} » et la question sur le genre laissée vide pour toi.",
      window: "{company} · Postuler",
      meta: "Formulaire de candidature",
      heading: "Postuler à cette offre",
      fields: {
        firstName: "Prénom",
        lastName: "Nom",
        email: "E-mail",
        company: "Entreprise actuelle",
        portfolio: "Lien du portfolio",
      },
      resume: "CV",
      question: "Pourquoi {company} ?",
      answer:
        "J'aime la façon dont {company} rend les données complexes faciles à lire, et j'apporterais le même soin à son produit, de la recherche aux prototypes.",
      draft: "Rédiger avec Otto",
      selfId: "Auto-identification volontaire",
      gender: "Genre",
      select: "Sélectionner…",
      submit: "Envoyer ma candidature",
      filled: "{count} champs remplis et <b>{file}</b> joint.",
      leftForYou:
        "À toi de répondre : 1 question d'auto-identification ou de consentement. Otto n'y répond jamais.",
      checkEvery:
        "Vérifie chaque réponse, puis clique toi-même sur Envoyer. Otto n'envoie jamais de formulaire.",
    },
    addToChrome: "Ajouter à Chrome",
    newTab: "(s'ouvre dans un nouvel onglet)",
    comingSoon: "Bientôt disponible",
    notInStore: "Pas encore sur le Chrome Web Store.",
  },
  portfolio: {
    eyebrow: "Portfolio · hébergé pour toi",
    title: "Un vrai portfolio,",
    titleEm: "en ligne, avec ton propre lien.",
    intro:
      "Pas ton CV transformé en page web. Choisis l'un des {count} modèles et Otto le remplit avec tes projets, ton expérience, tes écrits et tes liens. On l'héberge pour toi, donc tu n'as rien à configurer. {offer}",
    offer: "Il est inclus avec Pro.",
    offerTrial: "Il est inclus avec Pro, et tu peux commencer par un essai de {days} jours.",
    templates: {
      paper:
        "Dessiné à la main : ton nom au marqueur au-dessus d'un renard au bord de la mer, des cartes à l'encre et des soulignements ondulés, de jour comme de nuit.",
      gazette:
        "Ta page façon journal grand format de 1926 : un titre en lettres gothiques, ton accroche, des colonnes séparées par des filets et un bandeau défilant.",
      reel: "Un immense titre qui tourne au-dessus d'une sphère 3D, puis chaque projet dans un cadre d'appareil.",
    },
    link: "Créer mon portfolio",
  },
  wontDo: {
    title: "Ce qu'Otto ne fera pas",
    pledges: {
      score: {
        claim: "Inventer un score.",
        reason: "Tu as des vérifications claires avec leurs raisons, pas une note mystère sur 100.",
      },
      numbers: {
        claim: "Inventer tes chiffres.",
        reason:
          "Otto te demande tes vrais chiffres et résultats, et tu valides chaque modification.",
      },
      download: {
        claim: "Te faire payer le téléchargement.",
        reason:
          "Modifie et télécharge autant de PDF que tu veux. Aucun mur payant à la dernière étape.",
      },
      file: {
        claim: "Garder ton fichier.",
        reason:
          "On lit ton fichier pour en extraire le texte, puis on s'en débarrasse. Tes CV restent dans ton navigateur, sauf si tu te connectes pour les sauvegarder. <link>Notre gestion des données</link>",
      },
    },
  },
  pricingTeaser: {
    eyebrow: "Tarifs",
    title: "Gratuit pour l'essentiel.",
    titleEm: "Plus d'aide quand la recherche s'intensifie.",
    free: "<b>{plan} :</b> vérifie, corrige et télécharge {resumes} en PDF, avec {fixes} corrections de ligne d'Otto par mois.",
    pro: "<b>{plan}, {price} par mois :</b> adaptation, lettres de motivation, toutes les offres compatibles, jusqu'à {resumes} et {applications}. {close}",
    resumes: { one: "{count} CV", other: "{count} CV" },
    trackedApplications: {
      one: "{count} candidature suivie",
      other: "{count} candidatures suivies",
    },
    trial: "Essaie {days} jours pour {price}.",
    link: "Voir les tarifs",
  },
  faq: {
    title: "Avant de commencer",
    applications: { one: "{count} candidature", other: "{count} candidatures" },
    items: {
      free: {
        question: "Le téléchargement est-il vraiment gratuit ?",
        answer:
          "Oui. La modification, les vérifications de la vue recruteur et les téléchargements PDF sont gratuits, sans mur payant à la dernière étape, et Free inclut {fixes} corrections de ligne par mois avec Otto. Pro et Max ajoutent le reste de l'aide IA d'Otto, plus de formats, plus de CV et les téléchargements Word.",
      },
      ats: {
        question: "Qu'est-ce qu'un ATS ?",
        answer:
          "Un système de suivi des candidatures (applicant tracking system) : le logiciel que la plupart des employeurs utilisent pour recevoir et trier les candidatures. Il lit le texte de ton fichier, et les mises en page trop élaborées peuvent le brouiller. Otto te montre exactement ce qu'il lit.",
      },
      invent: {
        question: "Otto va-t-il inventer des choses sur mon CV ?",
        answer:
          "Non. Otto te demande des faits, comme des chiffres et des résultats, et n'utilise que ce que tu lui dis. Tu relis chaque modification avant qu'elle n'arrive sur ton CV.",
      },
      talk: {
        question: "Je peux parler au lieu de taper ?",
        answer:
          "Oui. Les champs où tu écris pour Otto ont un micro, y compris les questions d'Otto quand il corrige une ligne. Appuie dessus et parle, puis appuie à nouveau quand tu as fini. Ça marche dans tous les navigateurs récents. Dans certains, comme Brave et Firefox, il faut te connecter à ton compte. Otto ne garde que le texte.",
      },
      account: {
        question: "Ai-je besoin d'un compte ?",
        answer:
          "Pas pour vérifier, modifier ou télécharger. Les sauvegardes et les {fixes} corrections de ligne d'Otto par mois demandent un compte gratuit : connecte-toi avec Google ou avec un code à 6 chiffres reçu par e-mail, sans mot de passe. Le reste de l'aide IA d'Otto, la liste complète des offres compatibles (Free affiche tes {matches} plus proches) et le suivi de plus de {applications} sont inclus avec {pro}. {trialHeadline} : {trialSentence}",
      },
      data: {
        question: "Où sont stockées mes données ?",
        answer:
          "Tes CV sont enregistrés dans ton navigateur. Si tu te connectes, on en garde aussi une sauvegarde pour que tu puisses les ouvrir sur n'importe quel appareil. On lit les fichiers importés pour en extraire le texte, puis on s'en débarrasse. Tous les détails sont dans notre <link>politique de confidentialité</link>.",
      },
      cancel: {
        question: "Puis-je annuler à tout moment ?",
        answer:
          "Oui. Annule ton forfait depuis la page de ton compte quand tu veux. Tu le gardes jusqu'à la fin de la période payée, et on ne te prélève plus rien.",
      },
      anyJob: {
        question: "Ça marche pour tous les métiers ?",
        answer:
          "Oui, du premier emploi aux postes seniors, dans tous les domaines. L'adaptation fonctionne avec n'importe quelle offre d'emploi que tu colles. Otto lit le mieux les CV rédigés en anglais. Les <link>exemples de CV</link> couvrent {count} métiers, des jeunes diplômés à la vente.",
      },
    },
  },
  finalCta: {
    otto: "Otto la loutre, en train de lire un CV",
    title: "Vois ce que voit le logiciel.",
    note: "La vérification et les PDF sont gratuits. Pro et Max ajoutent plus d'aide d'Otto.",
  },
} satisfies Translation<Messages["home"]>;
