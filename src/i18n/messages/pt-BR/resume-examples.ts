import type { Messages } from "..";
import type { Translation } from "../../types";

// The resume example pages around each example, in Brazilian Portuguese.
export default {
  meta: {
    index: {
      title: "{count} exemplos de currículo para {year}, por cargo",
      description:
        "{count} exemplos de currículo completos, de engenheiro de software e analista de dados a vendas, marketing e iniciantes, com linhas fortes, habilidades e erros.",
    },
    long: "{headline} ({year}), com habilidades e dicas",
    short: "{headline} ({year})",
  },
  headline: "{role}: exemplo de currículo",
  crumb: "Exemplos de currículo",
  index: {
    eyebrow: "Exemplos de currículo",
    title: "Exemplos de currículo",
    titleEm: "para {count} cargos.",
    intro:
      "Currículos completos para os cargos mais buscados, na Índia e no exterior, de engenheiro de software a RH e recém-formados. Cada um mostra linhas mais fortes, as habilidades para listar e os erros a evitar.",
    listTitle: "Exemplos",
    howTitle: "Como estes exemplos são feitos",
    how: {
      madeUp: {
        title: "Pessoas inventadas, formatos reais",
        text: "Todo nome, empresa, faculdade e número é inventado. Copie a estrutura, o tipo de linha e a ordem das seções, e depois coloque os seus próprios fatos.",
      },
      lineCheck: {
        title: "Toda linha passa na verificação de linhas do Otto",
        text: "Cada linha passou pela mesma verificação que o estúdio faz nas suas, que aponta tarefas, frases feitas, palavras vagas e linhas sem resultado.",
      },
      skills: {
        title: "Habilidades que o Otto lê nas vagas",
        text: "As habilidades de cada página são as que a <link>verificação de compatibilidade</link> identifica nas vagas, então você pode testar seu próprio currículo com uma vaga real do mesmo jeito.",
      },
      realText: {
        title: "Texto real em um formato real",
        text: "Cada exemplo é desenhado em um dos {count} formatos do app como texto, não como imagem, então o que você vê é o que o software de recrutamento leria.",
      },
      start: {
        title: "Comece de qualquer um deles",
        text: "“Começar deste exemplo” abre uma cópia no estúdio como seu próprio currículo. No {free}, ela usa o seu único currículo; o {pro} guarda até {proResumes} e o {max}, até {maxResumes}.",
      },
    },
    ctaTitle: "Não tem exemplo para o seu cargo?",
    ctaText:
      "Envie o currículo que você tem para ver o que o software de recrutamento lê, ou compare com uma vaga. As duas coisas são grátis, sem cartão.",
  },
  example: {
    eyebrow: "Exemplo de currículo",
    start: "Começar deste exemplo",
    startNote: "Abre no estúdio como seu próprio currículo. Grátis, sem cartão.",
    resumeTitle: "O currículo de exemplo",
    formatFree: "Mostrado no formato {name}, grátis para baixar em PDF.",
    formatPro:
      "Mostrado no formato {name}, que vem com o {pro}. No {free}, o download sai em {fallback}.",
    linesTitle: "Transforme tarefas em resultados",
    linesIntro:
      "Três linhas fracas, o que a verificação de linhas do Otto diz sobre cada uma e a linha deste exemplo que resolve isso.",
    before: "Antes",
    after: "Depois",
    lineCheck: "verificação de linhas",
    skillsTitle: "Habilidades que o software de recrutamento procura",
    skillsIntro:
      "Estas habilidades aparecem em inglês, do jeito que as vagas dos EUA as escrevem, e a <link>verificação de compatibilidade</link> do Otto lê cada uma nas vagas. Liste as que você tem e cite cada uma numa linha em que você a usou: uma habilidade que só aparece na sua lista de habilidades fica como listada, não demonstrada.",
    titlesLabel: "Cargos para buscar",
    titles:
      "{titles}. Nas vagas compatíveis, o Otto trata esses cargos como o mesmo tipo de trabalho, então busque cada um.",
    tipsTitle: "O que mostrar",
    mistakesTitle: "Erros a evitar",
    otto: "Otto, a lontra, apontando para um currículo",
    closingTitle: "Faça deste currículo o seu.",
    closingText:
      "Ele abre no estúdio como seu próprio currículo. Troque pelos seus fatos, e o Otto verifica cada linha enquanto você escreve.",
    blank: "Ou <link>comece de uma página em branco</link>. Grátis, sem cartão.",
    moreTitle: "Mais exemplos de currículo",
  },
} satisfies Translation<Messages["resumeExamples"]>;
