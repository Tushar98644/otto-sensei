import type { AtsTranslation } from "../../ats";

const ANSWER_THE_SAME = "Réponds-y honnêtement, et de la même façon à chaque fois.";

const GREENHOUSE_HELP = "Centre d'aide de Greenhouse";
const WORKDAY_DOCS = "Documentation de Workday";
const ORACLE_DOCS = "Documentation d'Oracle Taleo";
const SAP_NOTE = "Note de support SAP";
const SAP_LEARNING = "SAP Learning";
const WORKABLE_HELP = "Centre d'aide de Workable";

// The ATS guides' introductions, sourced notes and general advice, in French.
export default {
  intros: {
    greenhouse: {
      what: "Greenhouse est un logiciel de recrutement (un système de suivi des candidatures, ou ATS) que les employeurs utilisent pour publier des offres, recevoir les candidatures et examiner les candidats.",
      spot: "Le formulaire se trouve souvent sur boards.greenhouse.io ou job-boards.greenhouse.io, ou le lien contient gh_jid= suivi d'un nombre.",
    },
    lever: {
      what: "Lever est un logiciel de recrutement (un système de suivi des candidatures, ou ATS) que les employeurs utilisent pour publier des offres et examiner les candidats.",
      spot: "L'offre se trouve souvent sur jobs.lever.co.",
    },
    ashby: {
      what: "Ashby est un logiciel de recrutement (un système de suivi des candidatures, ou ATS) que les employeurs utilisent pour publier des offres et examiner les candidats.",
      spot: "L'offre se trouve souvent sur jobs.ashbyhq.com, ou le lien contient ashby_jid=.",
    },
    workday: {
      what: "Workday est un logiciel RH. Les employeurs qui utilisent ses outils de recrutement reçoivent les candidatures via Workday.",
      spot: "Le formulaire se trouve souvent sur une adresse qui se termine par myworkdayjobs.com ou myworkdaysite.com.",
    },
    icims: {
      what: "iCIMS est un logiciel de recrutement (un système de suivi des candidatures, ou ATS) que les employeurs utilisent pour publier des offres et filtrer les candidats.",
      spot: "Le formulaire se trouve souvent sur une adresse qui se termine par icims.com.",
    },
    taleo: {
      what: "Taleo est le logiciel de recrutement d'Oracle (un système de suivi des candidatures, ou ATS), qui sert à publier des offres et à filtrer les candidats.",
      spot: "Le formulaire se trouve souvent sur une adresse qui se termine par taleo.net.",
    },
    successfactors: {
      what: "SAP SuccessFactors est le logiciel RH de SAP. Sa partie recrutement reçoit les candidatures et filtre les candidats.",
      spot: "Le formulaire se trouve souvent sur une adresse comme career4.successfactors.com, ou sur une adresse qui se termine par jobs2web.com.",
    },
    smartrecruiters: {
      what: "SmartRecruiters est un logiciel de recrutement (un système de suivi des candidatures, ou ATS) que les employeurs utilisent pour publier des offres et filtrer les candidats. Son IA s'appelle Winston.",
      spot: "L'offre se trouve souvent sur jobs.smartrecruiters.com ou careers.smartrecruiters.com.",
    },
    workable: {
      what: "Workable est un logiciel de recrutement (un système de suivi des candidatures, ou ATS) que les employeurs utilisent pour publier des offres et filtrer les candidats.",
      spot: "Le formulaire se trouve souvent sur apply.workable.com.",
    },
    bamboohr: {
      what: "BambooHR est un logiciel RH pour les entreprises, avec un outil de recrutement pour publier des offres et examiner les candidats.",
      spot: "Le formulaire se trouve souvent sur une adresse qui se termine par bamboohr.com.",
    },
    jobvite: {
      what: "Jobvite est un logiciel de recrutement (un système de suivi des candidatures, ou ATS) que les employeurs utilisent pour publier des offres et examiner les candidats.",
      spot: "L'offre se trouve souvent sur jobs.jobvite.com.",
    },
    recruitee: {
      what: "Recruitee est un logiciel de recrutement (un système de suivi des candidatures, ou ATS) que les employeurs utilisent pour publier des offres et filtrer les candidats.",
      spot: "Le formulaire se trouve souvent sur une adresse qui se termine par recruitee.com.",
    },
    teamtailor: {
      what: "Teamtailor est un logiciel de recrutement (un système de suivi des candidatures, ou ATS) que les employeurs utilisent pour publier des offres et examiner les candidats. Son assistant IA s'appelle Co-pilot.",
      spot: "Le formulaire se trouve souvent sur une adresse qui se termine par teamtailor.com.",
    },
  },
  notes: {
    greenhouse: [
      {
        fact: "Les employeurs peuvent régler le formulaire pour te refuser automatiquement selon certaines réponses aux questions oui/non et aux questions à choix dans une liste.",
        todo: ANSWER_THE_SAME,
        source: { label: GREENHOUSE_HELP },
      },
      {
        fact: "Greenhouse indique que la plupart des recruteurs examinent les candidatures dans l'ordre où elles arrivent.",
        todo: "Postule peu après la mise en ligne de l'offre.",
        source: { label: "Blog de Greenhouse" },
      },
      {
        fact: "Greenhouse ne peut pas lire les CV de plus de 2,5 Mo. Les colonnes, les tableaux et les coordonnées placées dans un en-tête, un pied de page ou une zone de texte le perturbent aussi.",
        todo: "Utilise une seule colonne, moins de 2,5 Mo, et mets tes coordonnées dans le texte principal.",
        source: { label: GREENHOUSE_HELP },
      },
      {
        fact: "Dans le filtre par mots-clés de Greenhouse, un mot de ta candidature ne compte que s'il correspond exactement au mot recherché par le recruteur.",
        todo: "Reprends les mots mêmes de l'offre pour les compétences que tu as, comme « JavaScript ».",
        source: { label: GREENHOUSE_HELP },
      },
      {
        fact: "Quand Talent Matching est activé, l'IA attribue à chaque candidat une étiquette, de Strong match à Limited match. Greenhouse indique qu'elle ne fait jamais avancer ni ne rejette personne d'elle-même.",
        todo: "Fais en sorte que les compétences clés de l'offre soient faciles à trouver dans ton CV.",
        source: { label: GREENHOUSE_HELP },
      },
    ],
    lever: [
      {
        fact: "Lever propose aux recruteurs Talent Fit, un pourcentage qui indique à quel point tes compétences correspondent à l'offre. Lever indique que ce sont les recruteurs qui prennent la décision finale.",
        todo: "Reprends les mots de l'offre pour les compétences que tu as vraiment.",
        source: { label: "Lever" },
      },
      {
        fact: "Lever copie ton nom, ton employeur et tes coordonnées depuis ton CV. Il ne peut pas lire les images, ni sans doute un fichier dont tu ne peux pas sélectionner le texte.",
        todo: "Envoie un PDF ou un fichier Word dont le texte se sélectionne.",
        source: { label: "Centre d'aide de Lever" },
      },
    ],
    ashby: [
      {
        fact: "Quand l'examen par IA est activé, Ashby compare ton CV à chacun des critères de l'équipe : meets (remplit), does not meet (ne remplit pas) ou undecided (indécis).",
        todo: "Rends facile à trouver chaque exigence que tu remplis.",
        source: { label: "Documentation d'Ashby" },
      },
      {
        fact: "L'équipe choisit ces critères : des suggestions de l'IA tirées de l'offre, des critères repris d'autres offres, ou les siens.",
        todo: "Couvre les exigences de l'offre avec tes propres mots, fidèles à la réalité.",
        source: { label: "Documentation d'Ashby" },
      },
      {
        fact: "Les recruteurs peuvent trier les candidats selon la part de critères remplis : les profils les plus proches sont donc lus en premier.",
        todo: "Montre chaque exigence listée que tu remplis vraiment.",
        source: { label: "Documentation d'Ashby" },
      },
      {
        fact: "Les employeurs peuvent définir des règles qui rejettent automatiquement une candidature dès son envoi, selon les réponses au formulaire. L'e-mail peut être retenu pendant des jours.",
        todo: ANSWER_THE_SAME,
        source: { label: "Documentation d'Ashby" },
      },
    ],
    workday: [
      {
        fact: "Le lecteur de CV de Workday ne remplit jamais les champs Skills (compétences) ou Languages (langues).",
        todo: "Saisis toi-même tes compétences et tes langues dans ces champs.",
        source: { label: WORKDAY_DOCS },
      },
      {
        fact: "Workday indique que ce qu'il lit varie selon la mise en page et l'ordre des mots du fichier, et que les fichiers sans images fonctionnent le mieux.",
        todo: "Vérifie chaque champ qu'il remplit avant d'envoyer ta candidature.",
        source: { label: WORKDAY_DOCS },
      },
      {
        fact: "Les employeurs peuvent définir des règles qui refusent automatiquement des candidats, par exemple toute personne qui n'a pas le droit de travailler dans le pays du poste.",
        todo: "Réponds honnêtement aux questions sur l'autorisation de travail, et de la même façon à chaque fois.",
        source: { label: WORKDAY_DOCS },
      },
      {
        fact: "Quand un employeur choisit la notation plus récente de HiredScore, celle-ci compare une à une chaque qualification listée à ton CV. Remplir toutes les qualifications de base vaut un A ou un B.",
        todo: "Appuie chaque exigence indispensable sur une ligne qui la montre clairement.",
        source: { label: "Notes de version de Workday HiredScore" },
      },
    ],
    icims: [
      {
        fact: "Les employeurs sur iCIMS peuvent ajouter des questions éliminatoires (knock-out) qui écartent des candidats au moment où ils postulent.",
        todo: ANSWER_THE_SAME,
        source: { label: "Blog d'iCIMS" },
      },
      {
        fact: "iCIMS propose Candidate Ranking, qui utilise l'IA pour comparer tes compétences et ton expérience à l'offre et afficher d'abord les profils les plus proches.",
        todo: "Décris ton expérience avec les termes de l'offre, quand ils sont vrais pour toi.",
        source: { label: "Blog d'iCIMS" },
      },
    ],
    taleo: [
      {
        fact: "La recherche par mots-clés de Taleo trouve les mots exacts, sauf si le recruteur active Related Terms (termes associés).",
        todo: "Reprends les mots exacts de l'offre, et écris une fois les abréviations sous leurs deux formes : « Kubernetes (K8s) ».",
        source: { label: ORACLE_DOCS },
      },
      {
        fact: "La recherche par mots-clés de Taleo lit les fichiers PDF, Word, RTF, texte et HTML que tu joins.",
        todo: "Joins un fichier PDF ou Word, jamais une photo ni un scan.",
        source: { label: ORACLE_DOCS },
      },
      {
        fact: "Il faut obligatoirement répondre aux questions éliminatoires, et tes réponses peuvent t'éliminer automatiquement.",
        todo: ANSWER_THE_SAME,
        source: { label: ORACLE_DOCS },
      },
      {
        fact: "Les employeurs marquent les compétences et les questions comme Required (obligatoire) ou Asset (atout). Les recruteurs peuvent n'afficher que les personnes qui remplissent tous les critères Required.",
        todo: "Réponds avec précision aux questions sur les compétences : celles marquées Required décident si ta candidature est prise en compte.",
        source: { label: ORACLE_DOCS },
      },
    ],
    successfactors: [
      {
        fact: "Une mauvaise réponse à une question éliminatoire te rejette automatiquement.",
        todo: ANSWER_THE_SAME,
        source: { label: SAP_NOTE },
      },
      {
        fact: "Les employeurs peuvent fixer un score minimum pour les questions notées. Passer en dessous t'élimine automatiquement.",
        todo: "Réponds complètement aux questions notées. Ne minimise pas une expérience réelle.",
        source: { label: SAP_NOTE },
      },
      {
        fact: "Les PDF scannés, ou créés à partir d'images, ne se lisent pas correctement. Les listes déroulantes ne se remplissent jamais à partir de ton CV.",
        todo: "Utilise un PDF avec du vrai texte, et remplis les listes déroulantes à la main.",
        source: { label: SAP_NOTE },
      },
      {
        fact: "La lecture des CV ne fonctionne que dans certaines langues, comme l'anglais, l'allemand, le français, l'espagnol et le néerlandais.",
        todo: "Si le tien est dans une autre langue, vérifie chaque champ qu'il remplit.",
        source: { label: SAP_NOTE },
      },
      {
        fact: "Quand le matching de compétences par IA est activé, SAP extrait les compétences de ton CV et les classe en correspondances exactes et en compétences manquantes.",
        todo: "Cite mot pour mot les compétences de l'offre que tu as.",
        source: { label: SAP_LEARNING },
      },
    ],
    smartrecruiters: [
      {
        fact: "Toute question oui/non ou à liste déroulante peut être éliminatoire. Une réponse éliminatoire te rejette automatiquement, par défaut avec un e-mail une heure plus tard.",
        todo: ANSWER_THE_SAME,
        source: { label: SAP_LEARNING },
      },
      {
        fact: "Winston Match note tes compétences, ton expérience et ta formation par rapport au poste, de 1 à 4 étoiles, pour aider les recruteurs à choisir qui lire en premier.",
        todo: "Rends tes compétences, tes postes et ta formation faciles à trouver.",
        source: { label: SAP_LEARNING },
      },
      {
        fact: "Winston devine des compétences à partir de tes intitulés de poste.",
        todo: "Utilise des intitulés de poste clairs et standard.",
        source: { label: SAP_LEARNING },
      },
    ],
    workable: [
      {
        fact: "Les questions éliminatoires sont uniquement de type oui/non. La réponse éliminatoire te disqualifie, et tu n'en es pas informé.",
        todo: ANSWER_THE_SAME,
        source: { label: WORKABLE_HELP },
      },
      {
        fact: "Le formulaire de candidature de Workable accepte les CV jusqu'à 5 Mo, en PDF, DOC, DOCX, RTF, HTML ou ODT.",
        todo: "Envoie un PDF ou un DOCX de moins de 5 Mo.",
        source: { label: WORKABLE_HELP },
      },
      {
        fact: "Quand un employeur utilise le Workable Agent, celui-ci te note par rapport aux exigences de l'équipe, et les critères indispensables comptent double.",
        todo: "Montre en mots simples chaque critère indispensable que tu remplis.",
        source: { label: WORKABLE_HELP },
      },
      {
        fact: "Quand ton CV et tes réponses n'en disent pas assez sur une exigence, l'Agent la marque Unknown (inconnu).",
        todo: "Énonce clairement chaque exigence que tu remplis.",
        source: { label: WORKABLE_HELP },
      },
    ],
    bamboohr: [
      {
        fact: "Dans l'outil de recrutement de BambooHR, des membres de l'équipe lisent ton CV et tes réponses et te notent eux-mêmes.",
        todo: "Réponds complètement à chaque question : des personnes les lisent.",
        source: { label: "BambooHR" },
      },
      {
        fact: "Les employeurs peuvent régler une question oui/non pour t'écarter automatiquement selon ta réponse.",
        todo: ANSWER_THE_SAME,
        source: { label: "Centre d'aide de BambooHR" },
      },
    ],
    jobvite: [
      {
        fact: "L'IA de Jobvite extrait une liste de compétences de ton CV, et ses résultats de correspondance arrivent aux recruteurs sous forme de notes.",
        todo: "Cite mot pour mot les compétences de l'offre que tu as.",
        source: { label: "Jobvite" },
      },
      {
        fact: "Jobvite indique que son modèle ne tient pas compte de ton nom, de tes coordonnées, de ton âge, de ton origine raciale, de ton genre ni de ton origine ethnique.",
        todo: "Consacre tes mots à tes compétences et à tes résultats.",
        source: { label: "Jobvite" },
      },
    ],
    recruitee: [
      {
        fact: "Les questions éliminatoires (oui/non, choix unique ou multiple) disqualifient automatiquement la mauvaise réponse, et peuvent aussi envoyer l'e-mail de refus.",
        todo: ANSWER_THE_SAME,
        source: { label: "Centre d'aide de Recruitee" },
      },
      {
        fact: "Recruitee copie ton nom, ton e-mail et ton téléphone depuis ton CV. Les colonnes, les graphiques, le texte dans des images ou un e-mail placé seulement dans l'en-tête ou le pied de page le perturbent souvent.",
        todo: "Utilise une seule colonne de vrai texte, avec ton e-mail dans le texte principal.",
        source: { label: "Centre d'aide de Recruitee" },
      },
    ],
    teamtailor: [
      {
        fact: "Quand Co-pilot est activé, l'IA te compare aux critères rédigés par l'équipe : rempli, non rempli, ou un tiret quand il y a trop peu d'éléments pour juger.",
        todo: "Énonce clairement chaque exigence probable.",
        source: { label: "Centre d'aide de Teamtailor" },
      },
      {
        fact: "Co-pilot lit ton CV, ta lettre de motivation, tes réponses et ton adresse, et l'employeur peut faire passer des personnes à une autre étape selon son résultat.",
        todo: "Garde ta lettre et tes réponses cohérentes avec ton CV.",
        source: { label: "Centre d'aide de Teamtailor" },
      },
    ],
  },
  general: [
    {
      title: "Envoie du vrai texte, pas une image de texte",
      text: "Importe un fichier PDF ou Word créé à partir de texte. Un scan ou une photo d'une page risque de ne pas se lire correctement.",
    },
    {
      title: "Garde une seule colonne",
      text: "Mets tes coordonnées dans le texte principal, pas dans un en-tête, un pied de page, un tableau ou une zone de texte.",
    },
    {
      title: "Reprends les mots de l'offre pour les compétences que tu as",
      text: "Certaines recherches ne trouvent que les mots exacts. Écris une fois chaque abréviation sous ses deux formes, comme « Kubernetes (K8s) ».",
    },
    {
      title: "Utilise des intitulés de poste clairs",
      text: "Certaines IA, comme Winston de SmartRecruiters, devinent tes compétences à partir de tes intitulés de poste.",
    },
    {
      title: "Réponds honnêtement aux questions de présélection, de la même façon à chaque fois",
      text: "Beaucoup de logiciels permettent aux employeurs de refuser automatiquement des candidats selon certaines réponses.",
    },
    {
      title: "Vérifie ce que le formulaire remplit",
      text: "Quand un formulaire remplit ses champs à partir de ton CV, relis-les tous avant d'envoyer ta candidature.",
    },
  ],
  screeningTip:
    "Réponds honnêtement aux questions de présélection, et de la même façon à chaque fois.",
} satisfies AtsTranslation;
