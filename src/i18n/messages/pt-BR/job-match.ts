import type { Messages } from "..";
import type { Translation } from "../../types";

// The job match page around the tool, in Brazilian Portuguese.
export default {
  meta: {
    title: "Verificador grátis de compatibilidade entre currículo e vaga",
    description:
      "Cole seu currículo e uma vaga, ou o link dela, para ver quais habilidades e ferramentas a vaga cita, quais seu currículo mostra e quais faltam. Grátis, sem login.",
  },
  toolName: "Verificação de compatibilidade do {brand}",
  eyebrow: "Grátis, sem login",
  title: "Seu currículo",
  titleEm: "combina com esta vaga?",
  intro:
    "Veja quais habilidades a vaga cita, onde seu currículo mostra cada uma e o que está faltando. Contagens, não uma nota inventada.",
  faqTitle: "O que a verificação faz",
  faq: {
    looksFor: {
      question: "O que a verificação procura?",
      answer:
        "As habilidades, ferramentas, licenças e idiomas que a vaga cita, entre cerca de {known} que o Otto conhece, como Python, Figma, Salesforce, BLS ou espanhol fluente. Ele procura cada um no seu currículo e mostra a linha em que está.",
    },
    mustHaves: {
      question: "Como ela separa requisitos obrigatórios de diferenciais?",
      answer:
        "Pelos próprios títulos e palavras da vaga. Uma habilidade sob “Requirements” ou “What you'll need”, ou ao lado de “required” ou “must”, é obrigatória. Uma sob “Nice to have”, ou ao lado de “a plus” ou “preferred”, é um diferencial. Quando a vaga não diz, o Otto não chuta.",
    },
    noScore: {
      question: "Por que não há uma nota de compatibilidade?",
      answer:
        "Uma porcentagem afirmaria mais do que uma verificação de palavras sabe. Softwares de recrutamento e recrutadores pesam as coisas cada um do seu jeito, então o Otto mostra as contagens e as linhas e deixa o julgamento com você.",
    },
    meaning: {
      question: "O que ela não verifica?",
      answer:
        "O significado. Ela compara as palavras da vaga, então “liderei uma equipe de cinco pessoas” não conta como “liderança”. Ela também não consegue avaliar anos de experiência, diplomas ou a qualidade do seu trabalho, então cita esses pedidos da vaga para você conferir. Recrutadores de verdade leem tudo isso.",
    },
    listed: {
      question: "O que significa “Listada, não demonstrada”?",
      answer:
        "A habilidade está numa lista, como sua seção de habilidades ou seu título profissional, mas nenhuma linha sobre o seu trabalho diz onde você a usou. Recrutadores procuram isso, então “Reconstruí o serviço de cobrança em Go” diz mais do que “Go” numa lista.",
    },
    stored: {
      question: "Meu currículo fica armazenado?",
      answer:
        "Não. O texto colado é verificado no seu navegador e nunca sai dele. Um arquivo enviado vai para o nosso servidor para que o texto seja lido, do jeito que o software de recrutamento lê, e depois é descartado. Um link de vaga também vai para o nosso servidor, que abre a vaga e devolve o texto dela. Você não precisa de conta.",
    },
    tailoring: {
      question: "Qual é a diferença disso para a personalização?",
      answer:
        "Esta verificação mostra o que já está lá. A personalização no Pro vai além: o Otto lê a vaga pelo significado, coloca suas melhores linhas para a vaga primeiro, escreve um resumo para ela e ajuda você a adicionar linhas para o que falta, a partir de fatos que você der, numa cópia personalizada. Veja <link>o que o Pro inclui</link>.",
    },
  },
  closing: {
    otto: "Otto, a lontra, lendo um currículo",
    title: "Veja o que o software vê.",
    cta: "Revisar meu currículo",
    note: "Revisar e baixar PDFs é grátis. O Pro e o Max somam mais ajuda do Otto.",
  },
} satisfies Translation<Messages["jobMatch"]>;
