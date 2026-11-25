import type { Messages } from "..";
import type { Translation } from "../../types";

// The resume formats, in Brazilian Portuguese.
export default {
  lead: {
    looks: "Um currículo, {count} visuais.",
    free: "{looks} {names} são grátis. Os outros {proCount} vêm com o {pro}, e você pode testá-los no seu currículo antes.",
    paid: "{looks} Troque quando quiser: seu texto continua o mesmo.",
    and: "{first} e {last}",
  },
  gallery: {
    appliesTo: "Escolher um formato aplica-o a <b>{name}</b> e abre a etapa de download.",
    noResume:
      "Ainda sem currículo. Escolha um formato e depois adicione seu currículo ou teste com um exemplo.",
    applyTo: "Aplicar a",
    appliesHint: "Escolher um formato aplica-o a este currículo e abre a etapa de download.",
    download: "Baixar",
    use: "Usar este formato",
    inUse: "Em uso",
    preview: "Pré-visualizar",
    close: "Fechar",
    alt: "Página 1 de um currículo de exemplo no formato {name}",
  },
  chosen: {
    comesOut: "Seu currículo vai sair no {name}.",
    setTo: "Seu currículo vai ficar no {name}.",
    change: "Você pode mudar na etapa de download.",
    proOnly: "{name} é um formato do {pro}, então no {free} seu download sai no {fallback}.",
    sample: "Testar com um exemplo",
  },
  templates: {
    classic: {
      description:
        "O layout que os centros de carreira das universidades recomendam: fonte simples, títulos centralizados sem linhas e a empresa acima do seu cargo em cada emprego.",
      bestFor: "Qualquer vaga, em qualquer lugar. A escolha segura quando você está em dúvida.",
    },
    modern: {
      description:
        "Um nome grande em dois tons, títulos que começam em cor com uma linha até a borda e cargos em versalete.",
      bestFor: "Tecnologia, startups e equipes ligadas em design.",
    },
    compact: {
      description:
        "O formato de uma página que as escolas de negócios mandam para os bancos: fonte estilo Times, títulos em maiúsculas sob linhas finas, marcadores quadrados e só os anos.",
      bestFor: "Finanças, consultoria e carreiras longas que precisam caber em uma página.",
    },
    executive: {
      description:
        "Serifa estilo Palatino, seu nome em cor ao lado do seu título, títulos em cor sobre linhas leves e espaçamento amplo.",
      bestFor: "Cargos seniores, finanças, direito e consultoria.",
    },
    developer: {
      description:
        "O modelo que os engenheiros compartilham: serifa de livro, títulos em versalete sobre linhas inteiras, cargos em negrito sobre a empresa em itálico. Habilidades e projetos primeiro.",
      bestFor: "Engenheiros de software e outras funções técnicas.",
    },
    minimal: {
      description:
        "Só preto: serifa estilo Charter, um nome grande e simples, títulos em negrito sobre linhas finas e cada emprego em uma só linha.",
      bestFor: "Engenheiros e quem quer uma página calma e simples.",
    },
  },
} satisfies Translation<Messages["formats"]>;
