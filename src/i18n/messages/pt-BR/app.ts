import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  usage: {
    thisPeriod: { month: "este mês", trial: "neste teste" },
    perPeriod: { month: "por mês", trial: "durante o teste" },
    renews: "quando seu plano renovar",
    onDayRenews: "em {day}, quando seu plano renovar",
    onDay: "em {day}",
    trialStarts: "Seu limite completo começa em {day}.",
    reset: "Eles reiniciam {when}.",
    pool: "{count} {feature}",
    usedAll: "Você já usou o limite de {pool} {period}. {reset}",
    usesOne: "Usa 1 dos seus {pool} {period}. Restam {left}.",
  },
  features: {
    fix: "ajustes de linha",
    tailor: "versões personalizadas",
    letter:
      "cartas de apresentação, mensagens de contato, respostas e preparações para entrevistas",
    import: "leituras com IA de um currículo enviado",
    draft: "rascunhos do Criar com o Otto",
    github: "rascunhos de projetos do GitHub",
  },
  copy: {
    copied: "Copiado",
    cantCopy: "Não foi possível copiar",
    selectText: "Selecione o texto da caixa e copie de lá.",
  },
  undo: "Desfazer",
  trashed: "Movido para Excluídos recentemente",
  pro: { comesWith: ", vem com o " },
  seePro: "Ver o Pro",
  tryOffer: "Teste o {plan} por {days} dias",
  errors: {
    fallback: "Algo deu errado. Tente de novo.",
    offline: "Não foi possível falar com o servidor. Confira sua conexão.",
  },
  justNow: "agora mesmo",
  working: {
    import: "O Otto está lendo seu arquivo.",
    job: "O Otto está lendo a vaga.",
    tailor: "O Otto está lendo a vaga e seu currículo.",
    fix: "O Otto está pensando em uma linha mais forte.",
    line: "O Otto está escrevendo sua linha.",
    summary: "O Otto está pensando em um resumo.",
    letter: "O Otto está escrevendo sua carta de apresentação.",
    answer: "O Otto está redigindo sua resposta.",
    outreach: "O Otto está escrevendo sua mensagem.",
    interview: "O Otto está montando sua preparação para a entrevista.",
    draft: "O Otto está escrevendo seu primeiro rascunho.",
    githubLookup: "O Otto está procurando seu trabalho público no GitHub.",
    github: "O Otto está transformando seu trabalho no GitHub em linhas de projeto.",
  },
} satisfies Translation<Messages["app"]>;
