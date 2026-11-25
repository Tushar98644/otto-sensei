import type { CompareTranslation, CompareValues } from "../../compare";

// Comparisons of Otto Sensei with other resume tools, in French.
export default function compare(v: CompareValues): CompareTranslation {
  const OTTO = {
    what: {
      answer: "Toute ta recherche d'emploi",
      detail: `Vérifie et crée ton CV, puis trouve des offres ouvertes classées pour lui. Pro ajoute une copie adaptée, une lettre de motivation et des messages de prise de contact pour chaque offre, jusqu'à ${v.proApplications} candidatures mises à jour depuis tes e-mails, la préparation aux entretiens et un site portfolio.`,
    },
    score: {
      answer: "Pas de score inventé",
      detail:
        "Chaque vérification est validée, ou nomme le problème et la façon de le corriger, en mots simples.",
    },
    free: {
      answer: `${v.plural({ one: "{count} CV", other: "{count} CV" }, v.freeResumes)}, sans carte`,
      detail: `Vérifie-le, corrige-le et télécharge-le en PDF aux formats ${v.freeFormats}, avec ${v.fixes} corrections de ligne d'Otto par mois, tes ${v.freeJobMatches} offres les plus compatibles et ${v.plural({ one: "{count} candidature suivie", other: "{count} candidatures suivies" }, v.freeApplications)}.`,
    },
    paid: {
      answer: `Pro : ${v.proMonthly} par mois`,
      detail: `Max : ${v.maxMonthly} par mois, pour plus d'aide IA, de CV et de candidatures suivies. Annule quand tu veux.`,
    },
    downloads: {
      answer: "PDF gratuits, sans limite",
      detail: `Aux formats ${v.freeFormats}. Tous les formats et les téléchargements Word (.docx) sont inclus avec Pro.`,
    },
    formats: {
      answer: `${v.templateCount} formats, ${v.freeTemplateCount} gratuits`,
      detail: `Chacun reprend une mise en page de CV très répandue : ${v.freeFormats} avec Free, tous avec Pro.`,
    },
    jobs: {
      answer: "Associées à ton CV",
      detail: `Des offres ouvertes issues des pages carrières des entreprises et de flux d'offres publics, lues chaque jour. Free affiche tes ${v.freeJobMatches} plus proches ; Pro les affiche toutes.`,
    },
    systems: {
      answer: `Repère ${v.systemCount} logiciels de recrutement`,
      detail:
        "À partir du lien d'une offre, avec des notes sourcées sur la façon dont chacun traite les candidatures.",
    },
  };

  const NO_SCORE = {
    title: "Pas de score inventé",
    text: "Il n'existe pas de score ATS standard : chaque logiciel de recrutement classe les candidats à sa façon, et aucun ne te montre de chiffre. Otto n'en invente donc pas. Chaque vérification est validée, ou nomme le problème et la façon de le corriger.",
  };

  const FREE_PDFS = {
    title: "Les téléchargements PDF sont gratuits",
    text: "Vérifier, modifier et télécharger un CV en PDF ne coûte rien, sans limite de téléchargements.",
  };

  const EMPLOYER_JOBS = {
    title: "Des offres issues des sites des employeurs",
    text: "Otto lit chaque jour les pages carrières des entreprises et des flux d'offres publics, et classe les offres selon ton CV. Chacune renvoie à l'annonce d'origine.",
  };

  const SOURCED_NOTES = {
    title: "Des notes sourcées sur les logiciels de recrutement",
    text: `Chacune des notes d'Otto sur ${v.systemCount} logiciels de recrutement renvoie à la page d'où elle vient.`,
  };

  const READ_BACK = {
    title: "Des formats testés en les relisant",
    text: "Chaque format tient sur une seule colonne de vrai texte, et chaque PDF est testé en le relisant.",
  };

  return {
    jobscan: {
      rows: [
        {
          label: "Ce que c'est",
          otto: OTTO.what,
          them: {
            answer: "Un scanner de CV",
            detail:
              "Il compare ton CV à une offre d'emploi et donne un taux de correspondance, avec en plus un créateur de CV, un suivi des candidatures, des offres compatibles, l'optimisation LinkedIn, un générateur de lettres de motivation, la candidature automatique et l'entraînement aux entretiens par IA.",
          },
        },
        {
          label: "Score",
          otto: OTTO.score,
          them: {
            answer: "Un taux de correspondance",
            detail:
              "Un par analyse, avec un objectif d'au moins 75 %. Il repose d'abord sur les compétences techniques, puis sur le niveau d'études (seulement quand l'offre demande un diplôme avancé), l'intitulé du poste, les compétences comportementales et d'autres mots-clés.",
          },
        },
        {
          label: "Forfait gratuit",
          otto: OTTO.free,
          them: {
            answer: "Analyses gratuites chaque mois",
            detail:
              "Des analyses de CV chaque mois (cinq, selon le blog de Jobscan), le créateur de CV et un essai Premium de 7 jours.",
          },
        },
        {
          label: "Forfaits payants",
          otto: OTTO.paid,
          them: {
            answer: "Premium, au mois ou au trimestre",
            detail: "Jobscan indique ses prix sur sa page des forfaits.",
          },
        },
        {
          label: "Offres d'emploi",
          otto: OTTO.jobs,
          them: {
            answer: "Offres compatibles et candidature automatique",
            detail:
              "Des offres associées à ton CV. Avec la candidature automatique, tu vérifies chaque candidature avant son envoi.",
          },
        },
        {
          label: "Logiciels de recrutement",
          otto: OTTO.systems,
          them: {
            answer: "Détecte les logiciels connus",
            detail:
              "Il indique le logiciel de recrutement (ATS) utilisé pour une offre quand il reconnaît le logiciel de l'entreprise.",
          },
        },
      ],
      differences: [NO_SCORE],
      extras: [FREE_PDFS, EMPLOYER_JOBS, SOURCED_NOTES],
      sources: [
        { label: "Page d'accueil de Jobscan" },
        { label: "Tutoriel Jobscan" },
        { label: `Blog de Jobscan, « Jobscan vs Rezi » (${v.date("2026-06-18")})` },
        { label: `Blog de Jobscan, « Jobscan vs Huntr » (${v.date("2026-08-07")})` },
      ],
    },
    rezi: {
      rows: [
        {
          label: "Ce que c'est",
          otto: OTTO.what,
          them: {
            answer: "Un créateur de CV par IA",
            detail:
              "Avec un agent IA pour le CV, un vérificateur de CV et un scanner de mots-clés, un générateur de lettres de motivation, l'entraînement aux entretiens par IA et la recherche d'emploi.",
          },
        },
        {
          label: "Score",
          otto: OTTO.score,
          them: {
            answer: "Le Rezi Score",
            detail:
              "Il évalue ton CV selon 23 indicateurs clés, section par section. Limité avec Free, complet avec Pro.",
          },
        },
        {
          label: "Forfait gratuit",
          otto: OTTO.free,
          them: {
            answer: "1 CV, 3 PDF",
            detail:
              "Plus 1 entretien IA. Le Rezi Score et le ciblage des mots-clés par IA sont limités.",
          },
        },
        {
          label: "Forfaits payants",
          otto: OTTO.paid,
          them: {
            answer: `Pro : ${v.reziPro} par mois`,
            detail: `Avec CV, téléchargements PDF et entretiens IA illimités, et une relecture par un expert chaque mois. Lifetime : ${v.usd(149)} en une fois, avec les fonctions de Pro mais sans relecture mensuelle.`,
          },
        },
        {
          label: "Téléchargements",
          otto: OTTO.downloads,
          them: { answer: "3 PDF avec Free", detail: "Illimités avec Pro." },
        },
        {
          label: "Offres d'emploi",
          otto: OTTO.jobs,
          them: { answer: "Un outil de recherche d'emploi" },
        },
      ],
      differences: [
        NO_SCORE,
        {
          ...FREE_PDFS,
          text: `${FREE_PDFS.text} Le forfait Free de Rezi inclut 3 téléchargements PDF.`,
        },
        {
          title: "Un prix mensuel plus bas",
          text: `Otto Pro coûte ${v.proMonthly} par mois ; Rezi Pro coûte ${v.reziPro} par mois.`,
        },
      ],
      extras: [EMPLOYER_JOBS],
      sources: [{ label: "Page des tarifs de Rezi" }, { label: "Page d'accueil de Rezi" }],
    },
    kickresume: {
      rows: [
        {
          label: "Ce que c'est",
          otto: OTTO.what,
          them: {
            answer: "Créateur de CV et de lettres",
            detail:
              "Avec un rédacteur IA, un vérificateur de CV ATS, un créateur de site personnel, un site d'offres d'emploi, et des applis iOS et Android.",
          },
        },
        {
          label: "Forfait gratuit",
          otto: OTTO.free,
          them: {
            answer: "4 modèles de CV basiques",
            detail:
              "Plus 4 modèles de lettre de motivation, 1 modèle de site basique et des téléchargements illimités. Le rédacteur IA et le vérificateur de CV ne sont pas inclus.",
          },
        },
        {
          label: "Forfaits payants",
          otto: OTTO.paid,
          them: {
            answer: "Premium, prix selon le pays",
            detail: `${v.usd(9)} pour un mois, ${v.usd(18)} pour trois ou ${v.usd(48)} pour un an. Il ajoute plus de 40 modèles, le rédacteur IA, le vérificateur de CV ATS, l'import LinkedIn et PDF, et les applis mobiles.`,
          },
        },
        {
          label: "Téléchargements",
          otto: OTTO.downloads,
          them: { answer: "Illimités avec tous les forfaits" },
        },
        {
          label: "Modèles",
          otto: OTTO.formats,
          them: {
            answer: "Plus de 40 avec Premium",
            detail: "4 avec Free. Premium ajoute plus de couleurs et de polices.",
          },
        },
      ],
      differences: [
        {
          title: "Une vérification de CV avec Free",
          text: "La vue recruteur gratuite d'Otto montre le texte que le logiciel de recrutement extrait de ton fichier, avec une raison simple pour chaque problème. Le vérificateur de CV ATS de Kickresume est inclus avec Premium.",
        },
        {
          title: "De l'aide IA avec Free",
          text: `Free inclut ${v.fixes} corrections de ligne par mois avec Otto. Le rédacteur IA de Kickresume est inclus avec Premium.`,
        },
      ],
      extras: [READ_BACK, EMPLOYER_JOBS],
      sources: [
        { label: "Page des tarifs de Kickresume" },
        { label: "Page d'accueil de Kickresume" },
      ],
    },
    "resume-io": {
      rows: [
        {
          label: "Ce que c'est",
          otto: OTTO.what,
          them: {
            answer: "Créateur de CV et de lettres",
            detail:
              "Avec un rédacteur IA, un outil de score ATS, un site d'offres d'emploi, la mise en relation avec des recruteurs, la candidature automatique par son équipe, l'entraînement aux entretiens, un analyseur de salaire et des cours.",
          },
        },
        {
          label: "Forfait gratuit",
          otto: OTTO.free,
          them: {
            answer: "1 CV, téléchargements TXT",
            detail:
              "Un CV et une lettre de motivation, des téléchargements en TXT uniquement, ainsi qu'un partage et des statistiques limités.",
          },
        },
        {
          label: "Forfaits payants",
          otto: OTTO.paid,
          them: {
            answer: "Forfaits à la semaine ou à l'année",
            detail:
              "Prix selon le pays, avec CV, lettres de motivation et téléchargements PDF illimités. Les fiches des forfaits indiquent un paiement unique ; sa FAQ indique qu'un essai de 7 jours devient un abonnement mensuel sauf si tu annules.",
          },
        },
        {
          label: "Téléchargements",
          otto: OTTO.downloads,
          them: {
            answer: "TXT uniquement avec Free",
            detail:
              "Les téléchargements PDF sont inclus avec un forfait payant, et ses modèles se téléchargent en Word ou en PDF.",
          },
        },
      ],
      differences: [
        {
          ...FREE_PDFS,
          text: `${FREE_PDFS.text} Le forfait gratuit de Resume.io ne télécharge qu'en TXT.`,
        },
        {
          title: "Facturé au mois",
          text: "Otto Pro est facturé au mois ou à l'année, et tu annules depuis ton compte. Resume.io vend un forfait d'une semaine ou d'un an.",
        },
      ],
      extras: [NO_SCORE, EMPLOYER_JOBS],
      sources: [
        { label: "Page des tarifs de Resume.io" },
        { label: "Page d'accueil de Resume.io" },
      ],
    },
    enhancv: {
      rows: [
        {
          label: "Ce que c'est",
          otto: OTTO.what,
          them: {
            answer: "Un créateur de CV par IA",
            detail:
              "Avec des suggestions de contenu, une vérification ATS et des retours sur le CV, l'adaptation avec un score de correspondance, la traduction, un générateur de lettres de motivation, de l'aide pour les entretiens, un site d'offres d'emploi et un suivi des candidatures.",
          },
        },
        {
          label: "Score",
          otto: OTTO.score,
          them: {
            answer: "Un score ATS",
            detail:
              "Ses retours sur le CV donnent un score ATS, et l'adaptation affiche un score de correspondance pour une offre d'emploi.",
          },
        },
        {
          label: "Forfait gratuit",
          otto: OTTO.free,
          them: {
            answer: "Gratuit pendant 7 jours",
            detail:
              "Tous les modèles et outils de design, les sections de base, jusqu'à 12 éléments de section, et la marque Enhancv.",
          },
        },
        {
          label: "Forfaits payants",
          otto: OTTO.paid,
          them: {
            answer: "Pro, prix selon le pays",
            detail:
              "Facturé au mois, tous les 3 mois ou tous les 6 mois. Ajoute jusqu'à 300 CV et lettres de motivation, les suggestions de contenu, la vérification ATS et les sections Pro, sans la marque.",
          },
        },
        {
          label: "Téléchargements",
          otto: OTTO.downloads,
          them: {
            answer: "PDF, pas Word",
            detail: "Sa FAQ indique que les CV se téléchargent en PDF.",
          },
        },
      ],
      differences: [
        {
          title: "Un forfait gratuit sans date de fin",
          text: "Le forfait Free d'Otto n'a pas de limite de durée. Le forfait Free d'Enhancv est valable 7 jours.",
        },
        NO_SCORE,
      ],
      extras: [FREE_PDFS, EMPLOYER_JOBS],
      sources: [{ label: "Page des tarifs d'Enhancv" }, { label: "Page d'accueil d'Enhancv" }],
    },
    novoresume: {
      rows: [
        {
          label: "Ce que c'est",
          otto: OTTO.what,
          them: {
            answer: "Créateur de CV et de lettres",
            detail:
              "Avec des modèles graphiques, un vérificateur ATS qui note ton fichier, des outils de rédaction IA et un créateur de lettres de motivation avec Pro.",
          },
        },
        {
          label: "Forfait gratuit",
          otto: OTTO.free,
          them: {
            answer: "1 CV, 1 page",
            detail:
              "8 modèles, 30 thèmes de couleurs, 2 crédits IA par mois et le vérificateur ATS. Il n'expire pas, et le PDF porte la marque Novoresume.",
          },
        },
        {
          label: "Forfaits payants",
          otto: OTTO.paid,
          them: {
            answer: "Pro, prix selon le pays",
            detail:
              "Au mois, au trimestre ou à l'année jusqu'à ce que tu annules, ou un Pass d'un mois facturé une seule fois. Pro ajoute jusqu'à 144 documents de 25 pages, tous les modèles, le créateur de lettres de motivation et 40 crédits IA par mois.",
          },
        },
        {
          label: "Téléchargements",
          otto: OTTO.downloads,
          them: {
            answer: "PDF à sa marque avec Free",
            detail:
              "Pro retire la marque. Un téléchargement qui te demande de passer à l'offre supérieure fonctionne une fois les fonctions Pro remplacées par des fonctions gratuites.",
          },
        },
      ],
      differences: [
        {
          title: "Des PDF gratuits sans marque",
          text: "Otto ne met aucune marque sur les PDF que tu télécharges gratuitement. Les PDF gratuits de Novoresume portent sa marque.",
        },
        NO_SCORE,
      ],
      extras: [FREE_PDFS, EMPLOYER_JOBS],
      sources: [
        { label: "Page des tarifs de Novoresume" },
        { label: "Page d'accueil de Novoresume" },
      ],
    },
    zety: {
      rows: [
        {
          label: "Ce que c'est",
          otto: OTTO.what,
          them: { answer: "Un créateur de CV en ligne" },
        },
        {
          label: "Forfait gratuit",
          otto: OTTO.free,
          them: { answer: "Une offre gratuite", detail: "Téléchargements en TXT uniquement." },
        },
        {
          label: "Forfaits payants",
          otto: OTTO.paid,
          them: {
            answer: `${v.usd(1.95)} pour 14 jours`,
            detail: `L'essai se renouvelle à ${v.usd(25.95)} toutes les 4 semaines. Ou paie ${v.usd(71.4)} d'avance pour un an (${v.usd(5.95)} par mois). Une garantie satisfait ou remboursé de 14 jours.`,
          },
        },
        {
          label: "Téléchargements",
          otto: OTTO.downloads,
          them: {
            answer: "TXT uniquement avec Free",
            detail: "Les téléchargements PDF et Word demandent un forfait payant.",
          },
        },
      ],
      differences: [
        {
          ...FREE_PDFS,
          text: `${FREE_PDFS.text} L'offre gratuite de Zety ne télécharge qu'en TXT.`,
        },
        {
          title: "Un prix plus bas de mois en mois",
          text: `Otto Pro coûte ${v.proMonthly} par mois, facturé au mois. L'essai à ${v.usd(1.95)} de Zety se renouvelle à ${v.usd(25.95)} toutes les 4 semaines.`,
        },
      ],
      extras: [NO_SCORE, EMPLOYER_JOBS],
      sources: [{ label: "Page des tarifs de Zety" }],
    },
    teal: {
      rows: [
        {
          label: "Ce que c'est",
          otto: OTTO.what,
          them: {
            answer: "Une appli de CV",
            detail: "Avec un forfait gratuit et un forfait payant, Teal+.",
          },
        },
        {
          label: "Forfait gratuit",
          otto: OTTO.free,
          them: { answer: "Oui, un forfait gratuit" },
        },
        {
          label: "Forfaits payants",
          otto: OTTO.paid,
          them: {
            answer: `Teal+ : ${v.usd(13)} par semaine`,
            detail: `Ou ${v.usd(29)} tous les 30 jours, ou ${v.usd(79)} tous les 90 jours.`,
          },
        },
      ],
      differences: [
        {
          title: "Un prix mensuel plus bas",
          text: `Otto Pro coûte ${v.proMonthly} par mois. Teal+ coûte ${v.usd(29)} tous les 30 jours.`,
        },
      ],
      extras: [FREE_PDFS, NO_SCORE, EMPLOYER_JOBS],
      sources: [
        { label: "Centre d'aide de Teal, « Teal vs Teal+ »" },
        { label: "Blog de Teal, « Best resume apps »" },
      ],
    },
    canva: {
      rows: [
        {
          label: "Ce que c'est",
          otto: OTTO.what,
          them: {
            answer: "Un outil de design généraliste",
            detail:
              "Les CV font partie de ce que tu peux créer avec ; il n'est pas conçu uniquement pour eux.",
          },
        },
        {
          label: "Forfait gratuit",
          otto: OTTO.free,
          them: {
            answer: "Gratuit, avec des modèles",
            detail: "Son forfait gratuit inclut des modèles gratuits.",
          },
        },
        {
          label: "Forfaits payants",
          otto: OTTO.paid,
          them: {
            answer: "Canva Pro, selon le pays",
            detail:
              "Les prix varient selon le pays : consulte la page des tarifs de Canva pour le tien.",
          },
        },
      ],
      differences: [
        {
          title: "Conçu pour les chercheurs d'emploi",
          text: "Otto est conçu uniquement pour les CV et les candidatures : il montre le texte que le logiciel de recrutement lit dans ton fichier et nomme chaque problème. Canva est un outil de design généraliste.",
        },
      ],
      extras: [READ_BACK, FREE_PDFS, EMPLOYER_JOBS],
      sources: [{ label: "Page des tarifs de Canva Pro" }],
    },
  };
}
