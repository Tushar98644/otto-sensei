import type { Locale } from "@/i18n/config";

export type ErrorWords = {
  heading: string;
  body: string;
  retry: string;
  home: string;
  reference: string;
  otto: string;
};

// The crash page's words in the other languages (src/app/global-error.tsx), fetched only when it shows in one.
export const OTHER_WORDS: Record<Exclude<Locale, "en">, ErrorWords> = {
  es: {
    heading: "Algo salió mal",
    body: "Algo falló de mi lado. ¿Lo intentas de nuevo? Tu trabajo está guardado en este navegador.",
    retry: "Intentar de nuevo",
    home: "Ir a la página de inicio",
    reference: "Referencia del error:",
    otto: "Otto la nutria, con cara de preocupación",
  },
  "pt-BR": {
    heading: "Algo deu errado",
    body: "Algo falhou do meu lado. Pode tentar de novo? Seu trabalho está salvo neste navegador.",
    retry: "Tentar de novo",
    home: "Ir para a página inicial",
    reference: "Referência do erro:",
    otto: "Otto, a lontra, com cara de preocupação",
  },
  fr: {
    heading: "Un problème est survenu",
    body: "Quelque chose a planté de mon côté. Tu peux réessayer ? Ton travail est enregistré dans ce navigateur.",
    retry: "Réessayer",
    home: "Aller à l'accueil",
    reference: "Référence de l'erreur :",
    otto: "Otto la loutre, l'air inquiet",
  },
  de: {
    heading: "Etwas ist schiefgelaufen",
    body: "Bei mir ist etwas schiefgelaufen. Versuchst du es noch mal? Deine Arbeit ist in diesem Browser gespeichert.",
    retry: "Erneut versuchen",
    home: "Zur Startseite",
    reference: "Fehlerreferenz:",
    otto: "Otto der Otter, besorgt",
  },
};
