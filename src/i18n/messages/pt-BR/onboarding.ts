import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  tip: {
    position: "{position} de {total}",
    skip: "Pular dicas",
    back: "Voltar",
    next: "Próxima",
    done: "Entendi",
  },
  studio: {
    "read-text": {
      title: "O que o software de recrutamento lê",
      body: "Este é seu arquivo do jeito que o software de recrutamento lê. O que falta aqui também falta para os recrutadores.",
    },
    "fix-with-otto": {
      title: "Ajuste uma linha com o Otto",
      body: "As etiquetas mostram as linhas que precisam melhorar. Eu peço os fatos e reescrevo. Nunca invento números.",
    },
    tailor: {
      title: "Personalize para uma vaga",
      body: "Cole o link de uma vaga. Eu mostro o que ela pede e ajudo a adicionar o que você realmente tem.",
    },
    download: {
      title: "Baixe grátis",
      body: "Seu PDF é grátis, sempre. Depois eu confiro de novo para mostrar o que mudou.",
    },
  },
  dashboard: {
    setup: {
      title: "A seguir",
      none: "O que fazer agora, do mais importante para o menos. Cada linha some quando você termina.",
      steps: {
        one: "O que fazer agora, do mais importante para o menos. Sua {count} etapa de configuração se marca sozinha.",
        other:
          "O que fazer agora, do mais importante para o menos. Suas {count} etapas de configuração se marcam sozinhas.",
      },
    },
    actions: {
      title: "Comece aqui",
      body: "Confira um arquivo, personalize um currículo para uma vaga ou teste um formato novo.",
    },
    library: {
      title: "Seus currículos",
      body: "Todo currículo e cópia personalizada fica aqui. Busque por nome ou empresa.",
    },
    jobs: {
      title: "Vagas para você",
      body: "Vagas abertas dos sites das empresas, ordenadas pelo quanto cada uma combina com seu currículo.",
    },
    applications: {
      title: "Candidaturas",
      body: "Registre cada vaga a que você se candidata em um quadro. A carta e a preparação ficam ligadas a ela.",
    },
    interview: {
      title: "Preparação para entrevistas",
      body: "Para cada entrevista: perguntas prováveis, histórias das suas próprias linhas e perguntas para fazer.",
    },
    portfolio: {
      title: "Portfólio",
      body: "Transforme seu currículo em um site de portfólio, hospedado para você no seu próprio link.",
    },
    "win-rate": {
      title: "O que está funcionando",
      body: "Registre as vagas a que você se candidata. Eu mostro qual currículo rende entrevistas.",
    },
  },
} satisfies Translation<Messages["onboarding"]>;
