import type { Messages } from "..";
import type { Translation } from "../../types";

// The resume formats, in French.
export default {
  lead: {
    looks: "Un CV, {count} styles.",
    free: "{looks} {names} sont gratuits. Les {proCount} autres sont inclus dans {pro}, et tu peux les essayer d'abord sur ton CV.",
    paid: "{looks} Change quand tu veux : ton texte reste le même.",
    and: "{first} et {last}",
  },
  gallery: {
    appliesTo: "Choisir un format l'applique à <b>{name}</b> et ouvre l'étape de téléchargement.",
    noResume:
      "Pas encore de CV. Choisis un format, puis ajoute ton CV ou essaie-le avec un exemple.",
    applyTo: "Appliquer à",
    appliesHint: "Choisir un format l'applique à ce CV et ouvre l'étape de téléchargement.",
    download: "Télécharger",
    use: "Utiliser ce format",
    inUse: "Utilisé",
    preview: "Aperçu",
    close: "Fermer",
    alt: "Page 1 d'un CV d'exemple au format {name}",
  },
  chosen: {
    comesOut: "Ton CV sortira au format {name}.",
    setTo: "Ton CV passera au format {name}.",
    change: "Tu peux le changer à l'étape de téléchargement.",
    proOnly:
      "{name} est un format {pro}, donc avec {free} ton téléchargement sort au format {fallback}.",
    sample: "Essayer avec un exemple",
  },
  templates: {
    classic: {
      description:
        "La mise en page que recommandent les services carrière des universités : police simple, titres centrés sans lignes, et l'employeur au-dessus de ton poste pour chaque emploi.",
      bestFor: "Tout emploi, partout. Le choix sûr quand tu hésites.",
    },
    modern: {
      description:
        "Un grand nom en deux tons, des titres qui commencent en couleur avec une ligne jusqu'au bord, et les postes en petites capitales.",
      bestFor: "Tech, startups et équipes sensibles au design.",
    },
    compact: {
      description:
        "Le format d'une page que les écoles de commerce envoient aux banques : police façon Times, titres en capitales sous des lignes fines, puces carrées et années seulement.",
      bestFor: "Finance, conseil et longues carrières qui doivent tenir sur une page.",
    },
    executive: {
      description:
        "Un serif façon Palatino, ton nom en couleur à côté de ton titre, des titres en couleur sur des lignes légères et un espacement généreux.",
      bestFor: "Postes seniors, finance, droit et conseil.",
    },
    developer: {
      description:
        "Le modèle que partagent les ingénieurs : serif de livre, titres en petites capitales sur des lignes pleines, postes en gras au-dessus de l'entreprise en italique. Compétences et projets d'abord.",
      bestFor: "Ingénieurs logiciel et autres profils techniques.",
    },
    minimal: {
      description:
        "Noir uniquement : serif façon Charter, un grand nom sobre, titres en gras sur des lignes fines, et chaque emploi sur une seule ligne.",
      bestFor: "Ingénieurs et toute personne qui veut une page calme et simple.",
    },
  },
} satisfies Translation<Messages["formats"]>;
