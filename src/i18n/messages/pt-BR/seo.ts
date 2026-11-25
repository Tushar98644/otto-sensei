import type { Messages } from "..";
import type { Translation } from "../../types";

// Words the comparisons, ATS guides, resume examples and templates share, in Brazilian Portuguese.
export default {
  newTab: "(abre em uma nova aba)",
  checkCta: {
    title: "Veja como seu currículo é lido",
    text: "Compare seu currículo com uma vaga ou veja o texto que o software de recrutamento extrai do seu arquivo. As duas coisas são grátis, sem cartão.",
  },
  related: {
    builder: {
      title: "Criador de currículo",
      text: "Como o Otto cria e revisa um currículo, o que é grátis e o que o {pro} adiciona.",
    },
    pricing: {
      title: "Preços",
      text: "O que é grátis, e o que o {pro} e o {max} adicionam.",
    },
  },
} satisfies Translation<Messages["seo"]>;
