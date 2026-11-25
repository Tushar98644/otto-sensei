import type { Messages } from "..";
import type { Translation } from "../../types";

// The resume templates page, in Brazilian Portuguese. Format names stay as they are (Classic, Compact).
export default {
  meta: {
    title: "Modelos de currículo ATS: {count} formatos, {free} grátis",
    description:
      "{count} modelos de currículo, cada um com uma coluna de texto real, testados lendo o PDF de volta. {freeFormats} são grátis em PDF; mais {proCount} vêm com o {pro}.",
  },
  crumb: "Modelos de currículo",
  eyebrow: "Modelos de currículo",
  title: "{count} formatos de currículo,",
  titleEm: "cada um com uma coluna de texto real.",
  intro:
    "Cada um copia um layout de currículo muito usado, e cada PDF é testado lendo-o de volta. {freeFormats} são grátis para baixar em PDF; os outros {proCount} vêm com o {pro}, e você pode testá-los no seu currículo antes.",
  tip: "Na dúvida? O Classic serve para qualquer vaga. O Compact põe uma carreira longa em uma página.",
  formatsTitle: "Formatos",
  listName: "Formatos de currículo",
  preview: "Ver a página inteira do {name}",
  use: "Usar este formato",
  close: "Fechar",
  imageAlt: "Página 1 de um currículo de exemplo no formato {name}",
  formats: {
    classic: {
      description:
        "O layout que os centros de carreira das universidades recomendam: tipografia simples, títulos centralizados sem linhas e o empregador acima do seu cargo em cada emprego.",
      bestFor: "Qualquer vaga, em qualquer lugar. A escolha segura quando você está em dúvida.",
    },
    modern: {
      description:
        "Um nome grande em dois tons, títulos que começam em cor com uma linha até a borda e cargos em versalete.",
      bestFor: "Tecnologia, startups e equipes ligadas em design.",
    },
    compact: {
      description:
        "O formato de uma página que as escolas de negócios enviam aos bancos: fonte no estilo Times, títulos em maiúsculas sob linhas finas, marcadores quadrados e só os anos.",
      bestFor: "Finanças, consultoria e carreiras longas que precisam caber em uma página.",
    },
    executive: {
      description:
        "Serifa no estilo Palatino, seu nome em cor ao lado do seu título profissional, títulos coloridos sobre linhas claras e espaçamento generoso.",
      bestFor: "Cargos seniores, finanças, direito e consultoria.",
    },
    developer: {
      description:
        "O modelo que os engenheiros compartilham: serifa no estilo livro, títulos em versalete sobre linhas inteiras, cargos em negrito sobre linhas de empresa em itálico. Habilidades e projetos primeiro.",
      bestFor: "Engenheiros de software e outros cargos técnicos.",
    },
    minimal: {
      description:
        "Só preto: serifa no estilo Charter, um nome grande e simples, títulos em negrito sobre linhas finas e cada emprego em uma única linha.",
      bestFor: "Engenheiros e qualquer pessoa que queira uma página calma e simples.",
    },
  },
  commonTitle: "O que todos os formatos têm em comum",
  common: {
    oneColumn: {
      title: "Uma coluna de texto real",
      text: "O texto é lido de cima para baixo, na ordem certa, com cada título em sua própria linha. Todos os formatos são testados lendo o PDF de volta, em papel Carta e A4.",
    },
    unscrambled: {
      title: "Nada que embaralhe as palavras",
      text: "Sem ícones, sem linhas justificadas e sem espaçamento largo entre letras, que é lido de volta como “R E S U M O”.",
    },
    sameWords: {
      title: "As mesmas palavras, qualquer visual",
      text: "Troque de formato quando quiser. Seu currículo continua o mesmo; só a página em volta dele muda.",
    },
    pdfFree: {
      title: "PDF grátis, Word no {pro}",
      text: "Baixe {freeFormats} em PDF de graça, quantas vezes quiser. Os outros {proCount} formatos e os downloads em Word (.docx) vêm com o {pro}.",
    },
  },
  faq: {
    free: {
      question: "Estes modelos de currículo são grátis?",
      answer:
        "{freeFormats} são grátis, sem paywall na hora de baixar e sem precisar de conta. Os outros {proCount} formatos vêm com o {pro}. No {free}, um currículo em um formato do {pro} é baixado em {fallback}.",
    },
    ats: {
      question: "O software de recrutamento vai conseguir ler esses modelos?",
      answer:
        "Cada um é uma única coluna de texto real, na ordem de leitura, e cada PDF é testado lendo-o de volta. Cada empregador configura seu sistema de recrutamento de um jeito, então ninguém pode prometer como um sistema específico vai tratar seu currículo. Os <link>guias de ATS</link> mostram o que se sabe sobre o funcionamento dos mais comuns.",
    },
    pick: {
      question: "Qual devo escolher?",
      answer:
        "O {classic} serve para qualquer vaga, em qualquer lugar: a escolha segura quando você está em dúvida. O {compact} põe uma carreira longa em uma página, e o {developer} coloca habilidades e projetos primeiro. Troque quando quiser: suas palavras continuam as mesmas.",
    },
    own: {
      question: "Posso usar meu próprio currículo?",
      answer:
        "Sim. Envie um arquivo PDF ou Word no estúdio, ou comece do zero. “Usar este formato” aplica o formato ao currículo que você tem aberto. Se nenhum estiver aberto, o estúdio pede seu currículo com o formato já escolhido. Você pode testar um formato do {pro} no {free}; o download sai em {fallback} até você ter o {pro}.",
    },
  },
} satisfies Translation<Messages["resumeTemplates"]>;
