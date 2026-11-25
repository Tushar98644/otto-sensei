import type { Messages } from "..";
import type { Translation } from "../../types";

// Words the comparisons, ATS guides, resume examples and templates share, in Spanish.
export default {
  newTab: "(se abre en una pestaña nueva)",
  checkCta: {
    title: "Mira cómo se lee tu currículum",
    text: "Compara tu currículum con una oferta de empleo, o mira el texto que el software de selección extrae de tu archivo. Las dos cosas son gratis, sin tarjeta.",
  },
  related: {
    builder: {
      title: "Creador de currículum",
      text: "Cómo Otto crea y revisa un currículum, qué es gratis y qué suma {pro}.",
    },
    pricing: {
      title: "Precios",
      text: "Qué es gratis, y qué suman {pro} y {max}.",
    },
  },
} satisfies Translation<Messages["seo"]>;
