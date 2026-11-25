import type { Messages } from "..";
import type { Translation } from "../../types";

// Words shared by every page, in Brazilian Portuguese.
export default {
  skipToContent: "Pular para o conteúdo",
  otto: "Otto, a lontra",
  video: { play: "Reproduzir", pause: "Pausar" },
  brand: {
    tagline: "Toda a sua busca de emprego, em um só lugar.",
    description:
      "Revise e corrija seu currículo com o Otto, encontre vagas abertas ranqueadas para ele, acompanhe cada candidatura pelo seu e-mail, prepare-se para entrevistas e compartilhe um site de portfólio. Downloads grátis, sempre.",
  },
} satisfies Translation<Messages["common"]>;
