import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  gone: "Essas linhas não estão mais aqui",
  goneNote: "Escreva de novo pelo seu diário de carreira.",
  noResume: "Esse currículo não está mais na sua lista",
  alreadyOn: "Essas linhas já estão neste emprego",
  added: {
    one: "{count} linha do seu diário de carreira adicionada",
    other: "{count} linhas do seu diário de carreira adicionadas",
  },
  changed: "Você mudou isso desde então",
  useUndo: "Use Desfazer no topo do editor.",
  title: "Do seu diário de carreira",
  description: "Aceite as linhas que forem verdade. Nada vai para o seu currículo até você aceitar.",
  notNow: "Agora não",
  addCount: {
    one: "Adicionar {count} linha",
    other: "Adicionar {count} linhas",
  },
  addLines: "Adicionar linhas",
  fromNotes: {
    one: "{count} linha das suas notas",
    other: "{count} linhas das suas notas",
  },
  note: "Cada linha vem do que você escreveu. Onde um número ajudaria e você não me deu, deixei um espaço para você.",
  addTo: "Adicionar a",
  addingTo: "Adicionando a <b>{job}</b>",
  noJob: "Adicione o emprego a este currículo primeiro e tente de novo.",
  fromMonths: "Das suas notas de {months}: “{quote}”",
  needsFact: "O Otto precisa de um dado: {blank}",
  onlyIfKnown: "Só se você souber",
  accepted: "Aceita",
  accept: "Aceitar",
  pressAgain: "Toque de novo para deixar de fora.",
  fillBlank: "Preencha o espaço para aceitar, ou deixe de fora.",
  jobNumber: "Emprego {number}",
} satisfies Translation<Messages["careerLogLines"]>;
