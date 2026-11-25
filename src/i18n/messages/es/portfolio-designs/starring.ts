import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  visibility: {
    open: "Código abierto",
    live: "En línea",
    private: "Privado",
  },
  seeLive: "Verlo en línea ↗",
  viewSource: "Ver el código ↗",
  acts: {
    numbers: "En cifras",
    studios: "Estudios con los que trabajé",
    road: "El camino",
    work: "Trabajos destacados",
    catalogue: "El catálogo",
    accolades: "Premios",
    press: "Gira de prensa",
    activity: "Cada commit cuenta",
    training: "Montaje de entrenamiento",
    bonus: "Material extra",
    offscreen: "Detrás de cámaras",
    critics: "La crítica",
    soon: "Próximamente",
  },
  iceberg: {
    one: "<b>{stars}</b>estrellas en {count} repositorio público y {followers} personas siguiendo la función.",
    other:
      "<b>{stars}</b>estrellas en {count} repositorios públicos y {followers} personas siguiendo la función.",
  },
  studio: {
    now: "Ahora",
    past: "Antes",
  },
  until: "hoy",
  talk: "Charla",
  article: "Artículo",
  alsoPlaying: "También en cartelera",
  openCode: "Más código, a la vista de todos.",
  certified: "Certificaciones",
  contributions: "/ contribuciones en 90 días",
  heatLabel: {
    one: "Contribuciones por semana en la última {count} semana",
    other: "Contribuciones por semana en las últimas {count} semanas",
  },
  heatNote: "Un cuadro por semana; el más brillante, {count}",
  repos: {
    one: "{count} repositorio",
    other: "{count} repositorios",
  },
  skills: "Habilidades",
  hero: {
    nowStarring: "Ahora en cartelera",
    available: "Disponible para trabajar",
    resume: "CV ↓",
    scroll: "Desliza — empieza la función ↓",
  },
  act: "Acto {number}",
  credits: {
    wrap: "Y… ¡corte!",
    starring: "Protagonizada por",
    email: "Correo ↗",
  },
} satisfies Translation<Messages["portfolioDesigns"]["starring"]>;
