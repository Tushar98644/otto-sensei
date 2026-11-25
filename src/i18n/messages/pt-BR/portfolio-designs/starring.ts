import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  visibility: {
    open: "Código aberto",
    live: "No ar",
    private: "Privado",
  },
  seeLive: "Ver no ar ↗",
  viewSource: "Ver o código ↗",
  acts: {
    numbers: "Em números",
    studios: "Estúdios com quem trabalhei",
    road: "A estrada",
    work: "Trabalhos em destaque",
    catalogue: "O catálogo",
    accolades: "Prêmios",
    press: "Turnê de imprensa",
    activity: "Cada commit conta",
    training: "Montagem de treino",
    bonus: "Extras",
    offscreen: "Bastidores",
    critics: "A crítica",
    soon: "Em breve",
  },
  iceberg: {
    one: "<b>{stars}</b>estrelas em {count} repositório público e {followers} pessoas acompanhando.",
    other:
      "<b>{stars}</b>estrelas em {count} repositórios públicos e {followers} pessoas acompanhando.",
  },
  studio: {
    now: "Agora",
    past: "Antes",
  },
  until: "hoje",
  talk: "Palestra",
  article: "Artigo",
  alsoPlaying: "Também em cartaz",
  openCode: "Mais código, à vista de todos.",
  certified: "Certificações",
  contributions: "/ contribuições em 90 dias",
  heatLabel: {
    one: "Contribuições por semana na última {count} semana",
    other: "Contribuições por semana nas últimas {count} semanas",
  },
  heatNote: "Um quadrado por semana; o mais forte marca {count}",
  repos: {
    one: "{count} repositório",
    other: "{count} repositórios",
  },
  skills: "Habilidades",
  hero: {
    nowStarring: "Agora em cartaz",
    available: "Disponível para trabalho",
    resume: "Currículo ↓",
    scroll: "Role — o show vai começar ↓",
  },
  act: "Ato {number}",
  credits: {
    wrap: "E… corta!",
    starring: "Estrelando",
    email: "E-mail ↗",
  },
} satisfies Translation<Messages["portfolioDesigns"]["starring"]>;
