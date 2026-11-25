import type { Messages } from "..";
import type { Translation } from "../../types";

// Words shared by every page, in Brazilian Portuguese.
export default {
  skipToContent: "Pular para o conteúdo",
  brand: {
    tagline: "Toda a sua busca de emprego, em um só lugar.",
    description:
      "Revise e corrija seu currículo com o Otto, encontre vagas abertas ranqueadas para ele, acompanhe cada candidatura pelo seu e-mail, prepare-se para entrevistas e compartilhe um site de portfólio. Downloads grátis, sempre.",
  },
  referral: {
    rewardedTitle: "Você e seu amigo ganharam extras",
    rewarded:
      "Cada um ganha {fix} ajustes de linha a mais, além de {tailor} versões personalizadas no Pro ou no Max.",
    pendingTitle: "Você entrou por um convite",
    pending:
      "Verifique um currículo e vocês dois ganham {fix} ajustes de linha a mais, além de {tailor} versões personalizadas no Pro ou no Max.",
  },
} satisfies Translation<Messages["common"]>;
