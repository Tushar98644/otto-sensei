import type { Messages } from "..";
import type { Translation } from "../../types";

// Product and tool pages (resume builder, cover letters, tracker, interview prep, portfolio), in French.
export default {
  common: {
    breadcrumb: "Fil d'Ariane",
    home: "Accueil",
    howItWorks: "Comment ça marche",
    questions: "Questions fréquentes",
    keepReading: "À lire aussi",
    seePlan: "Voir ce qu'inclut {pro}",
    trialFor: "{headline} pour {price}.",
    checkButtons: { match: "Comparer mon CV à une offre", check: "Vérifier mon CV" },
  },
  related: {
    examples: {
      title: "Exemples de CV",
      text: "{count} exemples complets par métier, chacun avec des lignes plus percutantes, les compétences et les erreurs courantes.",
    },
    templates: {
      title: "Modèles de CV",
      text: "{count} formats, chacun sur une seule colonne de vrai texte. {free} sont gratuits.",
    },
    jobMatch: {
      title: "Test de compatibilité",
      text: "Colle ton CV et une offre d'emploi pour voir lesquelles de ses compétences tu montres. Gratuit, sans connexion.",
    },
    ats: {
      title: "Guides ATS",
      text: "Des notes sourcées sur {count} logiciels de recrutement : comment ils lisent les fichiers, filtrent les candidats et les classent avec l'IA.",
    },
    compare: {
      title: "Comparer Otto Sensei",
      text: "Ce qui distingue Otto de {names}, d'après les propres pages de chaque produit.",
    },
    coverLetters: {
      title: "Générateur de lettres de motivation par IA",
      text: "Lettres de motivation, messages de prise de contact et réponses aux questions de candidature, à partir de ton CV et de l'offre d'emploi.",
    },
    tracker: {
      title: "Suivi des candidatures",
      text: "Tes candidatures sur un seul tableau, avec le CV envoyé, des rappels de relance et les dates d'entretien.",
    },
    interviewPrep: {
      title: "Préparation aux entretiens par IA",
      text: "Les questions probables, des histoires tirées de tes propres lignes de CV et des questions à poser, pour chaque entretien.",
    },
    portfolio: {
      title: "Créateur de site portfolio",
      text: "Un site portfolio créé à partir de ton CV dans l'un des {count} modèles, hébergé avec ton propre lien.",
    },
  },
  builder: {
    meta: {
      title: "Créateur de CV gratuit avec IA et vérifications ATS",
      description:
        "Crée ton CV gratuitement : pars de zéro ou d'un fichier, vois le texte que lit le logiciel de recrutement, corrige les lignes faibles avec l'aide de l'IA d'Otto et télécharge un PDF propre.",
    },
    crumb: "Créateur de CV",
    eyebrow: "Créateur de CV gratuit",
    title: "Un créateur de CV",
    titleEm: "qui montre ce que lit le logiciel.",
    intro:
      "Pars d'un fichier, d'une page blanche ou d'un exemple. Otto vérifie chaque ligne, montre le texte que le logiciel de recrutement extrait de ton fichier, et le PDF se télécharge gratuitement.",
    action: "Créer mon CV",
    seeExamples: "Voir des exemples de CV",
    stepsTitle: "Comment Otto crée et vérifie un CV",
    stepsIntro:
      "Cinq étapes dans le studio. Arrête-toi après n'importe laquelle ; ton CV est enregistré dans ton navigateur au fur et à mesure.",
    steps: {
      start: {
        title: "Pars de ce que tu as",
        text: "Importe un fichier PDF ou Word, ton export de données LinkedIn ou un fichier JSON Resume, pars d'une page blanche, ou ouvre l'un des <link>exemples de CV</link>. Avec {pro}, Créer avec Otto rédige un premier jet à partir de quelques réponses sur tes postes.",
      },
      read: {
        title: "Vois ce que lit le logiciel de recrutement",
        text: "La vue recruteur montre le texte qu'un logiciel de recrutement extrait de ton fichier, dans l'ordre, avec des vérifications claires des coordonnées, des titres, des colonnes, des tableaux, des icônes, des dates et de la longueur. Chaque problème est accompagné de sa raison.",
      },
      fix: {
        title: "Corrige les lignes faibles avec Otto",
        text: "La vérification des lignes d'Otto signale celles qui ressemblent à une liste de tâches, qui oublient le résultat ou qui s'appuient sur des formules toutes faites. Demande-lui d'en corriger une : il te demande d'abord l'info qui manque, puis écrit la ligne à partir de ta réponse. Tu gardes, modifies ou ignores chaque suggestion. {free} inclut {fixes} corrections de ligne par mois.",
      },
      match: {
        title: "Compare-le à une offre",
        text: "Colle une offre d'emploi ou son lien pour voir quelles compétences elle cite, lesquelles ton CV montre et lesquelles manquent. Le <link>test de compatibilité</link> fonctionne sans connexion. Avec {pro}, Otto adapte une copie de ton CV à l'offre.",
      },
      download: {
        title: "Télécharge un PDF propre",
        text: "Choisis un format et le papier Lettre US ou A4, puis télécharge. Chaque format tient sur une seule colonne de vrai texte, testée en relisant le PDF. {freeFormats} sont gratuits, sans limite de téléchargement ; les {proFormats} autres formats et les téléchargements Word sont inclus avec {pro}.",
      },
    },
    plans: {
      title: "Ce qui est gratuit, et ce qu'ajoute {pro}",
      intro:
        "Prix en dollars américains. Des taxes peuvent s'appliquer. {max} coûte {price} par mois pour encore plus d'aide d'Otto chaque mois.",
      freeCta: "Créer mon CV",
      freeNote: "Sans carte bancaire",
      paidCta: "Voir {pro} et {max}",
      cancelAnytime: "Annule quand tu veux",
    },
    audiencesTitle: "À qui ça s'adresse",
    audiences: {
      freshers: {
        title: "Jeunes diplômés et étudiants",
        text: "Mets la formation en premier, présente tes projets comme des expériences et tiens-toi à une page. L'<link>exemple jeune diplômé</link> montre la structure pour un B.Tech ou tout autre diplôme, et la vérification comme les PDF ne coûtent rien.",
      },
      changing: {
        title: "Changer de poste",
        text: "Importe le CV que tu as. La vue recruteur montre ce qu'il faut corriger en premier, et le test de compatibilité montre quelles compétences demandées par le prochain poste ton CV ne montre pas encore.",
      },
      abroad: {
        title: "Postuler à l'étranger",
        text: "Choisis le papier Lettre US pour les États-Unis et le Canada, et A4 pour la plupart des autres pays. N'ajoute ni photo, ni date de naissance, ni situation familiale, et indique les montants dans la devise de l'employeur.",
      },
      many: {
        title: "Postuler à beaucoup d'offres",
        text: "{pro} garde une copie adaptée pour chaque offre, rédige des lettres de motivation et des réponses aux questions de candidature, et suit jusqu'à {tracked} candidatures avec des rappels de relance.",
      },
    },
    indiaTitle: "CV pour des postes en Inde",
    indiaIntro:
      "Le CTC, le préavis, Naukri et les habitudes « biodata » des vieux modèles : où va chaque élément, et ce qu'il faut laisser de côté.",
    india: {
      ctc: {
        title: "Laisse le CTC hors du CV",
        text: "Les recruteurs demandent ton CTC actuel et attendu dans le formulaire de candidature, sur ton profil Naukri ou lors du premier appel. Laisse-le hors de la page, pour qu'un seul CV serve à toutes tes candidatures. Avec {pro}, quand Otto rédige une réponse à une question sur le salaire, il laisse un blanc à compléter.",
      },
      notice: {
        title: "Indique ton préavis là où on te le demande",
        text: "Mets-le dans le formulaire de candidature ou ton message d'accompagnement, pas sous ton nom. Otto ne le devine jamais : avec {pro}, une réponse rédigée qui a besoin de ton préavis contient un blanc entre crochets à compléter.",
      },
      naukri: {
        title: "Raconte la même histoire sur Naukri",
        text: "Importe sur ton profil Naukri le PDF que tu télécharges ici, et utilise sur le profil le même intitulé de poste et les mêmes compétences clés que sur le CV. Un recruteur qui te trouve là-bas voit ainsi deux fois la même histoire.",
      },
      biodata: {
        title: "Oublie les vieux détails « biodata »",
        text: "Photo, date de naissance, situation familiale, nom du père et déclaration signée viennent des vieux modèles. La plupart des employeurs ne les demandent pas, et les formats d'Otto n'ont pas de place pour une photo.",
      },
      marks: {
        title: "Montre tes notes tant qu'elles comptent",
        text: "Pour les jeunes diplômés, le CGPA et les notes de Class XII comptent encore, car beaucoup d'offres de recrutement sur campus et de postes de trainee fixent une note minimale. Après quelques années d'expérience, le diplôme et l'établissement suffisent.",
      },
    },
    examplesTitle: "Pars d'un exemple",
    examplesIntro:
      "Chacun est un CV complet que tu peux ouvrir dans le studio et personnaliser. <link>Voir les {count} exemples</link>.",
    faq: {
      free: {
        question: "Ce créateur de CV est-il vraiment gratuit ?",
        answer:
          "Oui. Créer, vérifier et télécharger un CV en PDF est gratuit, aux formats {freeFormats}, sans limite de téléchargement et sans carte bancaire. {free} inclut aussi {fixes} corrections de ligne d'Otto par mois. {pro} coûte {price} par mois pour l'adaptation, les lettres de motivation, tous les formats et les téléchargements Word.",
      },
      ai: {
        question: "Est-ce un créateur de CV avec IA ?",
        answer:
          "Oui, avec des limites voulues. L'IA d'Otto corrige des lignes, adapte des CV et rédige des lettres de motivation, mais uniquement à partir des faits que tu lui donnes : il demande des chiffres au lieu de les inventer, et tu valides chaque modification. La vue recruteur et la vérification des lignes reposent sur des règles simples, pas sur l'IA.",
      },
      ats: {
        question: "Mon CV passera-t-il l'ATS ?",
        answer:
          "Personne ne peut le promettre, car chaque employeur configure son logiciel de recrutement à sa manière. Otto te montre le texte qu'un logiciel extrait de ton fichier et signale ce qui pose souvent problème, comme les colonnes, les tableaux, les icônes et les zones de texte. Les <link>guides ATS</link> montrent ce que l'on sait du fonctionnement des logiciels courants.",
      },
      freshers: {
        question: "Est-ce adapté aux jeunes diplômés ?",
        answer:
          "Oui. Pars de l'exemple jeune diplômé ou d'une page blanche, mets la formation en premier et tiens-toi à une page. {freeFormats} sont tous deux gratuits et conviennent à un premier CV.",
      },
      ctc: {
        question: "Dois-je mettre mon CTC et mon préavis sur mon CV ?",
        answer:
          "Non. Donne-les quand un formulaire de candidature, un recruteur ou ton profil Naukri te les demande. Un CV sans eux fonctionne pour toutes les candidatures, et ces chiffres changent plus souvent que ton travail.",
      },
      signUp: {
        question: "Dois-je m'inscrire ?",
        answer:
          "Pas pour créer, vérifier ou télécharger : ton CV est enregistré dans ton navigateur. Un compte gratuit le sauvegarde et active les {fixes} corrections de ligne d'Otto par mois. Connecte-toi avec Google ou un code reçu par e-mail, sans mot de passe.",
      },
      paper: {
        question: "Lettre US ou A4 ?",
        answer:
          "Les deux sont disponibles. Choisis Lettre US pour les postes aux États-Unis et au Canada, et A4 pour l'Inde, le Royaume-Uni, l'Europe et la plupart des autres pays. Ton texte reste le même dans les deux cas.",
      },
      word: {
        question: "Puis-je télécharger mon CV au format Word ?",
        answer:
          "Les téléchargements Word (.docx) sont inclus avec {pro}. Avec {free}, les téléchargements sont en PDF, autant que tu veux. <link>Voir les tarifs</link>.",
      },
    },
    closing: {
      otto: "Otto la loutre, en train de lire un CV",
      title: "Crée-le, vérifie-le, télécharge-le.",
      cta: "Créer mon CV",
      note: "Gratuit, et sans compte.",
    },
  },
  coverLetters: {
    meta: {
      title: "Générateur de lettre de motivation par IA, à partir de ton CV",
      description:
        "Otto rédige des lettres de motivation, des messages de prise de contact et des réponses de candidature à partir de ton CV et de l'offre, et signale toute ligne qu'il ne peut pas justifier. Inclus avec {pro}.",
    },
    crumb: "Générateur de lettres de motivation",
    eyebrow: "Lettres de motivation · {pro}",
    title: "Un générateur de lettres de motivation par IA",
    titleEm: "qui s'en tient à tes faits.",
    action: "Rédiger une lettre de motivation",
    planNote:
      "Inclus avec {pro}, {price} par mois pour {letters} lettres, messages, réponses et préparations d'entretien.",
    check: {
      title: "Vérifie la compatibilité avant d'écrire",
      text: "Une lettre fait plus d'effet quand ton CV montre déjà ce que demande l'offre. Le test de compatibilité et la vue recruteur sont gratuits, sans carte bancaire.",
    },
    closing: {
      title: "Une lettre pour chaque offre, à partir de ton propre CV.",
      art: "Otto la loutre, qui montre une lettre",
    },
    intro:
      "Colle une offre d'emploi ou son lien. Otto rédige la lettre de motivation à partir de cette offre et de ton CV, et signale tout ce que tu devrais vérifier avant de l'envoyer.",
    featuresTitle: "Ce qu'Otto rédige pour toi",
    features: {
      letter: {
        title: "Une lettre de motivation pour chaque offre",
        text: "Trois paragraphes courts : le poste et ton meilleur atout pour lui, deux ou trois résultats qui répondent à ce que l'offre demande le plus, puis pourquoi ce poste. La formule d'appel et la formule de politesse sont ajoutées pour toi.",
      },
      answers: {
        title: "Réponses aux questions de candidature",
        text: "Colle une question comme « Pourquoi voulez-vous travailler chez nous ? » et Otto y répond à partir de ton CV. Tout ce que personne d'autre que toi ne sait, comme une date de début ou un salaire, devient un blanc entre crochets à compléter.",
      },
      outreach: {
        title: "Prises de contact, relances et remerciements",
        text: "Un court e-mail et un message LinkedIn pour quelqu'un dans l'entreprise, une relance quand une candidature reste sans réponse, et un message de remerciement après un entretien.",
      },
      facts: {
        title: "Rien d'inventé",
        text: "Otto écrit uniquement à partir de ton CV et de l'offre d'emploi. Si un brouillon contient un chiffre absent de ton CV, un verbe plus fort que celui de ta ligne ou une formule toute faite, il le signale pour que tu le vérifies.",
      },
      style: {
        title: "Ton style, ton orthographe",
        text: "Choisis un ton ({tones}), une longueur standard ou plus courte, et l'orthographe américaine ou britannique. Règle-le une fois et chaque lettre le suit.",
      },
      send: {
        title: "Prête à envoyer",
        text: "Copie-la, ouvre-la dans un e-mail, ou télécharge-la en PDF ou en Word. Chacune est conservée avec l'offre pour laquelle elle a été écrite.",
      },
    },
    steps: {
      job: {
        title: "Choisis l'offre",
        text: "Choisis une offre enregistrée, une candidature de ton tableau ou une copie adaptée de ton CV. Ou colle une offre d'emploi ou son lien.",
      },
      kind: {
        title: "Choisis quoi écrire",
        text: "Une lettre de motivation, une réponse à une question de candidature ou un message de prise de contact. Otto l'écrit à partir de ton CV et de l'offre.",
      },
      send: {
        title: "Vérifie et envoie",
        text: "Lis le brouillon, corrige ce qu'Otto a signalé, puis copie-le, envoie-le par e-mail ou télécharge-le.",
      },
    },
    faq: {
      free: {
        question: "Le générateur de lettres de motivation par IA est-il gratuit ?",
        answer:
          "Il est inclus avec {pro} et {max}. {pro} coûte {price} par mois et inclut {letters} par mois, à partager entre lettres de motivation, messages de prise de contact, réponses et préparation aux entretiens. Avec {free}, la vérification de ton CV, sa modification et les téléchargements PDF restent gratuits. <link>Voir tous les forfaits</link>.",
      },
      madeUp: {
        question: "Otto va-t-il inventer des choses ?",
        answer:
          "Non. Il écrit uniquement à partir de ton CV et de l'offre d'emploi, puis vérifie le brouillon par rapport aux deux. Un chiffre absent de ton CV, un verbe plus fort que celui de ta ligne ou une formule toute faite est signalé, pour que tu puisses le corriger, ou le garder si c'est vrai.",
      },
      link: {
        question: "Peut-il écrire à partir du lien d'une offre ?",
        answer:
          "Oui. Colle le lien et Otto lit l'offre. Si un site refuse de la partager, colle plutôt le texte de l'offre.",
      },
      tone: {
        question: "Puis-je changer le ton ou la longueur ?",
        answer:
          "Oui. Choisis un ton {tones}, une longueur standard ou plus courte, l'orthographe américaine ou britannique, et ta propre formule de politesse. Tu peux aussi laisser une note à Otto, comme « Mentionne que j'accepte de déménager. »",
      },
      why: {
        question: "Comment répond-il à « Pourquoi voulez-vous travailler chez nous ? »",
        answer:
          "Colle la question et choisis l'offre. Otto répond à partir de ton CV et de l'offre en un ou deux courts paragraphes. Tout ce que personne d'autre que toi ne sait, comme ce qui t'attire dans l'entreprise, devient un blanc entre crochets à compléter.",
      },
    },
    tones: { natural: "naturel", warm: "chaleureux", direct: "direct", formal: "formel" },
  },
  tracker: {
    meta: {
      title: "Suivi des candidatures avec mises à jour par e-mail",
      description:
        "Suis chaque candidature sur un seul tableau, avec le CV envoyé, des rappels de relance et les dates d'entretien. Avec {pro}, il se met à jour à partir de tes e-mails de candidature.",
    },
    crumb: "Suivi des candidatures",
    eyebrow: "Suivi des candidatures",
    title: "Un suivi de candidatures",
    titleEm: "qui suit le rythme de ta boîte mail.",
    action: "Suivre mes candidatures",
    planNote:
      "{free} suit {freeApplications}, {pro} jusqu'à {proApplications} avec mises à jour par e-mail, et {max} jusqu'à {maxApplications}.",
    applications: { one: "{count} candidature", other: "{count} candidatures" },
    check: {
      title: "Envoie un CV qui se lit bien",
      text: "Avant d'enregistrer ta prochaine candidature, vois lesquelles des compétences de l'offre ton CV montre et ce que le logiciel de recrutement lit dans ton fichier. Les deux vérifications sont gratuites.",
    },
    closing: {
      title: "Chaque candidature, sur un seul tableau.",
      art: "Otto la loutre, en train de lire une candidature",
    },
    intro:
      "Enregistre chaque offre à laquelle tu postules sur un seul tableau, avec le CV envoyé, un rappel de relance et la date d'entretien. Avec {pro}, tes e-mails de candidature déplacent chaque carte pour toi.",
    featuresTitle: "Ce que le suivi garde pour toi",
    features: {
      board: {
        title: "Un seul tableau, de À postuler à Offre",
        text: "Les offres que tu enregistres attendent dans À postuler. Fais glisser chaque carte vers Postulé, Entretien et Offre au fil des réponses, puis vers Clôturé quand c'est terminé.",
      },
      resume: {
        title: "Le CV que tu as envoyé",
        text: "Chaque candidature garde le CV ou la copie adaptée que tu as envoyé, pour que tu saches ce qu'ils ont lu. Après quelques envois, vois quelle version te décroche des entretiens.",
      },
      reminders: {
        title: "Des rappels de relance",
        text: "Otto te rappelle de relancer {followUp} jours après ta candidature, ou après le nombre de jours que tu choisis. Reporte un rappel de {snooze} jours ou efface-le. Après un entretien, il en programme un {afterInterview} jours ouvrés plus tard.",
      },
      interviews: {
        title: "Les dates d'entretien",
        text: "Ajoute le jour et l'heure de l'entretien, puis ajoute-le à ton agenda avec un rappel pour t'entraîner la veille au matin.",
      },
      emails: {
        title: "Mises à jour depuis tes e-mails de candidature ({pro})",
        text: "Obtiens ta propre adresse Otto et ajoute un filtre Gmail qui y transfère tes e-mails de candidature. Un e-mail « Merci pour votre candidature » ajoute l'offre à Postulé, et une invitation à un entretien la passe en Entretien avec la date.",
      },
      rules: {
        title: "Des règles fixes, un minimum de données",
        text: "Otto lit chaque e-mail transféré avec des règles fixes, pas avec l'IA. Il garde le domaine de l'expéditeur, l'objet et ce qu'il a trouvé, et supprime le reste. Les e-mails qu'il ne peut pas vérifier attendent que tu les vérifies.",
      },
    },
    steps: {
      add: {
        title: "Ajoute une candidature",
        text: "Saisis l'entreprise, l'intitulé du poste et le lien, ou indique que tu as postulé à une offre enregistrée. Choisis le CV que tu as envoyé.",
      },
      move: {
        title: "Fais-la avancer",
        text: "Fais glisser la carte au fil des réponses, et ajoute la date d'entretien et tes notes. Avec {pro}, tes e-mails de candidature le font pour toi.",
      },
      followUp: {
        title: "Relance au bon moment",
        text: "Quand un rappel arrive à échéance, relance, reporte-le ou marque l'offre comme sans réponse. Avec {pro}, Otto rédige le message de relance à partir de ton CV et de l'offre.",
      },
    },
    faq: {
      free: {
        question: "Le suivi des candidatures est-il gratuit ?",
        answer:
          "{free} suit {freeApplications} avec un rappel de relance, pour que tu puisses l'essayer. {pro} en suit jusqu'à {proApplications} et ajoute les mises à jour depuis tes e-mails de candidature, et {max} jusqu'à {maxApplications}. {pro} coûte {price} par mois.",
      },
      email: {
        question: "Comment se met-il à jour depuis mes e-mails ?",
        answer:
          "Avec {pro}, tu choisis un identifiant pour ta propre adresse Otto, tu l'ajoutes dans les paramètres de transfert de Gmail, tu confirmes qu'il s'agit bien de ton Gmail, puis tu ajoutes un filtre pour tes e-mails de candidature. Ça prend quelques minutes et ça se termine par un e-mail de test. Ensuite, chaque e-mail de candidature déplace sa carte, ou attend que tu le vérifies.",
      },
      privacy: {
        question: "Otto lit-il tous mes e-mails ?",
        answer:
          "Non. Seuls les e-mails que ton filtre Gmail transfère arrivent à Otto. Il lit chacun d'eux avec des règles fixes, pas avec l'IA, garde le domaine de l'expéditeur, l'objet et ce qu'il y a trouvé, comme l'entreprise, l'intitulé du poste et la date d'entretien, et supprime le reste. Ces données sont effacées au bout de six mois. La <link>politique de confidentialité</link> donne tous les détails.",
      },
      wrong: {
        question: "Et si Otto lit mal un e-mail ?",
        answer:
          "Annule n'importe quelle modification depuis la liste des e-mails lus par Otto. Quand il ne peut pas vérifier qui a envoyé un e-mail, rien ne bouge tant que tu ne l'as pas vérifié.",
      },
      versions: {
        question: "Puis-je voir quel CV décroche des entretiens ?",
        answer:
          "Oui. Chaque candidature garde le CV envoyé, donc le tableau compte les entretiens et les offres d'embauche obtenus par chaque version. Dès que deux versions ont chacune {minForRate} candidatures ou plus, Otto compare leurs taux d'entretien.",
      },
    },
  },
  interviewPrep: {
    meta: {
      title: "Préparation aux entretiens par IA, à partir de ton CV et de l'offre",
      description:
        "Prépare chaque entretien avec les questions probables, des histoires tirées de tes propres lignes de CV et des questions à poser. Les postes techniques ont aussi droit à un entretien technique.",
    },
    crumb: "Préparation aux entretiens",
    eyebrow: "Préparation aux entretiens · {pro}",
    title: "Une préparation aux entretiens par IA",
    titleEm: "construite à partir de ton propre CV.",
    action: "Préparer un entretien",
    planNote:
      "Inclus avec {pro}, {price} par mois pour {letters} préparations d'entretien, lettres, messages et réponses.",
    check: {
      title: "Vois ce que demande l'offre",
      text: "Le test de compatibilité liste les compétences citées dans une offre et où ton CV montre chacune d'elles : un bon point de départ pour ta préparation. C'est gratuit, sans connexion.",
    },
    closing: {
      title: "Arrive en sachant ce que tu vas dire.",
      art: "Otto la loutre, qui réfléchit à une question d'entretien",
    },
    intro:
      "Choisis l'offre et le CV que tu as envoyé. Otto construit ta préparation à partir des deux : les questions qu'on va probablement te poser, des histoires tirées de tes propres lignes de CV et des questions à leur poser.",
    featuresTitle: "Ce que contient chaque dossier de préparation",
    features: {
      questions: {
        title: "Les questions probables, étape par étape",
        text: "De l'ouverture à la conclusion, chaque question indique ce que le recruteur cherche à évaluer, les points à aborder et la relance à prévoir.",
      },
      stories: {
        title: "Des histoires tirées de tes propres lignes",
        text: "Chaque histoire part d'une ligne de ton CV, racontée en situation, tâche, action et résultat. Ce que ton CV ne dit pas reste un blanc à compléter, jamais inventé.",
      },
      technical: {
        title: "Un entretien technique pour les postes techniques",
        text: "Pour {roles} types de postes, des ingénieurs et data scientists aux product managers et designers : des questions approfondies sur ton propre travail, les concepts clés du poste, et une question de conception, une étude de cas ou un exercice. Chacun indique ce que couvre une bonne réponse et les erreurs à éviter.",
      },
      ask: {
        title: "Des questions à leur poser",
        text: "Quatre ou cinq questions pour la fin de l'entretien, sur le produit, l'équipe ou les objectifs mentionnés dans l'offre. Aucune sur la rémunération ou les congés.",
      },
      practice: {
        title: "Mode entraînement",
        text: "Otto joue le recruteur, une question à la fois. Réponds à voix haute avec le micro ou par écrit, avec un minuteur de deux minutes et ton plan à portée de main. Puis reprends celles que tu as ratées.",
      },
      day: {
        title: "Le jour J, tout est prêt",
        text: "Ajoute l'entretien à ton agenda avec un rappel pour t'entraîner la veille au matin, ou imprime le dossier pour le relire en chemin.",
      },
    },
    steps: {
      job: {
        title: "Choisis l'offre",
        text: "Une candidature qui arrive dans Entretien t'attend avec un bouton Préparer. Ou pars du lien d'une offre, de son annonce, ou simplement de l'intitulé du poste.",
      },
      setup: {
        title: "Vérifie les réglages",
        text: "Utilise le CV que tu as envoyé. Otto choisit l'entretien technique selon l'offre ; change le type de poste, ou le niveau (de {firstLevel} à {lastLevel}), si tu veux.",
      },
      practice: {
        title: "Lis, complète, entraîne-toi",
        text: "Parcours les questions et les histoires, remplis chaque blanc avec tes propres faits, puis lance le mode entraînement.",
      },
    },
    faq: {
      free: {
        question: "La préparation aux entretiens par IA est-elle gratuite ?",
        answer:
          "Elle est incluse avec {pro} et {max}. Chaque dossier de préparation compte dans le même quota mensuel que les lettres de motivation et les messages : {letters} par mois avec {pro} et {maxLetters} avec {max}. {pro} coûte {price} par mois.",
      },
      backUp: {
        question: "Va-t-elle me donner des réponses que je ne peux pas justifier ?",
        answer:
          "Non. Les faits qui te concernent viennent uniquement de ton CV. Quand une réponse a besoin d'un élément que ton CV ne mentionne pas, Otto laisse une question entre crochets, comme « [Combien de personnes l'ont utilisé ?] », à laquelle tu réponds toi-même. Dans l'entretien technique, les connaissances générales sont présentées comme des conseils, jamais comme quelque chose que tu as fait.",
      },
      roles: {
        question: "Quels postes ont droit à un entretien technique ?",
        answer:
          "{roles} types, des ingénieurs backend, frontend et IA/ML aux data analysts, product managers et designers. Otto en choisit un d'après l'intitulé du poste et l'offre, et tu peux le changer ou le désactiver.",
      },
      aloud: {
        question: "Puis-je m'entraîner à voix haute ?",
        answer:
          "Oui. En mode entraînement, appuie sur le micro et réponds à voix haute : ta réponse s'affiche en texte. Marque chaque question comme faite ou à retravailler ; les notes que tu gardes restent dans ton navigateur.",
      },
      noPost: {
        question: "Puis-je me préparer sans l'offre d'emploi ?",
        answer:
          "Oui. Colle l'offre en entier pour des questions plus précises, ou laisse-la de côté et Otto partira de l'intitulé du poste.",
      },
    },
    levels: { junior: "junior", mid: "confirmé", senior: "senior", staff: "expert" },
  },
  portfolio: {
    meta: {
      title: "Du CV au site portfolio, en {designs} modèles",
      description:
        "Transforme ton CV en site portfolio. Choisis l'un des {designs} modèles, Otto le remplit à partir de ton CV, et on l'héberge avec ton propre lien. Inclus avec {pro}.",
    },
    crumb: "Créateur de site portfolio",
    eyebrow: "Site portfolio · {pro}",
    title: "Du CV au site portfolio,",
    titleEm: "hébergé avec ton propre lien.",
    action: "Créer mon portfolio",
    planNote: "Inclus avec {pro}, {price} par mois, hébergement compris.",
    check: {
      title: "Pars d'un CV qui se lit bien",
      text: "Ton portfolio est construit à partir de ton CV, alors vérifie-le d'abord : vois ce que le logiciel de recrutement lit dans ton fichier, ou compare-le à une offre. Les deux sont gratuits.",
    },
    closing: {
      title: "Ton CV, devenu un site à part entière.",
      art: "Otto la loutre, qui fait coucou",
    },
    intro:
      "Choisis l'un des {designs} modèles et Otto le remplit à partir de ton CV : tes projets, ton expérience, tes compétences et tes liens. On l'héberge avec ton propre lien, donc tu n'as rien à configurer.",
    featuresTitle: "Ce que tu obtiens",
    features: {
      designs: {
        title: "{designs} modèles",
        text: "D'une colonne sobre à une page sombre avec de grands projets mis en avant. Ouvre chacun en plein écran avec ton propre CV dedans avant de choisir.",
      },
      filled: {
        title: "Rempli à partir de ton CV",
        text: "Otto rédige la présentation, les projets, l'expérience, les compétences, la formation et les liens à partir de ton CV. Modifie n'importe quelle partie, ou masque une section dont tu n'as pas besoin.",
      },
      hosted: {
        title: "Hébergé avec ton propre lien",
        text: "La page a un lien qui contient ton nom, et on l'héberge. Si tu changes le nom plus tard, l'ancien lien continue de fonctionner pendant {redirectDays} jours.",
      },
      sync: {
        title: "Synchronisé avec ton CV",
        text: "Avec la synchronisation activée, les modifications de ton CV apparaissent toutes seules sur la page. Désactive-la pour ne mettre à jour la page que quand tu le décides.",
      },
      private: {
        title: "Tes infos privées restent cachées",
        text: "Ton e-mail et ton téléphone sont masqués au départ, et les moteurs de recherche sont priés d'ignorer la page jusqu'à ce que tu les laisses la trouver.",
      },
      views: {
        title: "Vues et GitHub",
        text: "Vois combien de fois ta page a été consultée. Connecte GitHub et la page peut aussi afficher tes chiffres GitHub.",
      },
    },
    steps: {
      pick: {
        title: "Choisis un CV et un modèle",
        text: "Vois chaque modèle avec ton propre CV dedans, puis choisis-en un. Otto le remplit.",
      },
      check: {
        title: "Vérifie ce qu'Otto a écrit",
        text: "Modifie le texte, masque des sections, et choisis d'afficher ou non ton e-mail et ton téléphone.",
      },
      publish: {
        title: "Publie et partage",
        text: "Rien n'est mis en ligne tant que tu ne publies pas. Ensuite, envoie le lien aux recruteurs, ou mets-le sur ton CV et sur LinkedIn.",
      },
    },
    faq: {
      free: {
        question: "Le site portfolio est-il gratuit ?",
        answer:
          "Les portfolios sont inclus avec {pro} et {max}, hébergement compris. {pro} coûte {price} par mois. Si ton forfait prend fin, la page est mise hors ligne, mais elle et ses réglages sont conservés : elle revient telle quelle quand tu reviens.",
      },
      code: {
        question: "Dois-je savoir coder ou acheter un hébergement ?",
        answer:
          "Non. Otto construit la page à partir de ton CV et on l'héberge. Il n'y a rien à installer ni de nom de domaine à acheter.",
      },
      google: {
        question: "Google trouvera-t-il mon portfolio ?",
        answer:
          "Seulement si tu le veux. Tant que tu n'as pas activé « Laisser les moteurs de recherche la trouver », les moteurs de recherche sont priés de garder la page hors de leurs résultats.",
      },
      update: {
        question: "Que se passe-t-il quand je mets à jour mon CV ?",
        answer:
          "Avec la synchronisation activée, la page reprend la modification toute seule. Sans synchronisation, Otto te prévient que le CV a changé, et tu mets à jour la page quand tu veux.",
      },
      design: {
        question: "Puis-je changer de modèle plus tard ?",
        answer:
          "Oui. Passe à n'importe lequel des {designs} modèles quand tu veux. Ta page garde son lien et ses réglages.",
      },
    },
  },
} satisfies Translation<Messages["product"]>;
