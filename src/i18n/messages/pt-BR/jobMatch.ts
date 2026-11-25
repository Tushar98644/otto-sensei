import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  list: "{items} e mais {count}",
  roleMatch: "Cargo equivalente: {job} ≈ seu cargo de {person}. ",
  found: "Está no seu currículo: {list}.",
  notFound: "Não encontrado no seu currículo: {list}.",
  noTools: "A vaga não cita ferramentas para comparar.",
  kind: {
    same: "A mesma ocupação que a sua.",
    sameNamed: "A mesma ocupação que a sua: {name}.",
    close: "Uma ocupação bem próxima.",
    closeNamed: "Uma ocupação bem próxima: {name}.",
    group: "Um tipo de trabalho relacionado.",
    groupNamed: "Um tipo de trabalho relacionado: {name}.",
    neighbour: "Um tipo de cargo próximo.",
    sameRole: "O mesmo tipo de cargo que o seu.",
    earlier: "Como um cargo anterior do seu currículo.",
  },
  nothing: "Nada do que a vaga cita está neste currículo.",
  nothingToCheck: "Este currículo e esta vaga não têm nada em comum que eu consiga verificar.",
  levels: {
    intern: "um estágio",
    junior: "um cargo de nível inicial",
    mid: "um cargo de nível pleno",
    senior: "um cargo sênior",
    lead: "um cargo de liderança ou staff",
    director: "um cargo de diretoria",
  },
  stepUp: "Este é {level}, um passo acima do seu último cargo.",
  stepDown: "Este é {level}, um nível abaixo do seu último cargo.",
  training: "Vagas assim costumam pedir mais formação ou experiência que o seu último cargo.",
  years: "Pede {asked}+ anos; seu currículo mostra cerca de {shown}.",
  yearsShown: { one: "{count} ano", other: "{count} anos" },
  visa: {
    ukSponsor: "Na lista de patrocinadores de visto do Reino Unido",
    h1b: "Pedidos de visto H-1B aprovados no ano fiscal {year} (USCIS)",
  },
} satisfies Translation<Messages["jobMatch"]>;
