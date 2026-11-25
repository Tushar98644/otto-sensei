import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  home: {
    title: "Preparação para entrevistas",
    packsIntro: {
      one: "{count} pacote de preparação, um por vaga, feito com as linhas do seu currículo.",
      other: "{count} pacotes de preparação, um por vaga, feitos com as linhas do seu currículo.",
    },
    intro:
      "Para cada vaga em que você tiver entrevista: perguntas prováveis, histórias das linhas do seu currículo e perguntas para fazer a eles.",
    prepare: "Preparar para uma vaga",
    didntLoad: "Sua preparação para entrevistas não carregou",
    tryAgain: "Tentar de novo",
    checkConnection: "Confira sua conexão e tente de novo.",
    lockedEyebrow: "Vem com o Pro",
    lockedTitle: "Pratique cada entrevista antes que ela aconteça",
    locked:
      "Com o Pro, eu preparo você para cada entrevista com as linhas do seu próprio currículo. Veja um exemplo.",
    lockedKept: "Criar uma nova preparação vem com o Pro. A que você fez antes fica aqui para ler.",
    emptyEyebrow: "Nenhuma entrevista ainda",
    emptyTitle: "Sua próxima entrevista, preparada em um clique",
    emptyDetail:
      "Quando uma candidatura chega à etapa de entrevista, ela espera aqui com um botão Preparar. Ou prepare-se agora para qualquer vaga pelo link dela.",
    next: "Próxima entrevista",
    atStage: "Na etapa de entrevista",
    interviews: { one: "{count} entrevista", other: "{count} entrevistas" },
    moreInterviews: "Mais entrevistas",
    calendar: "Na sua agenda",
    morePacks: "Mais pacotes de preparação",
    yourPacks: "Seus pacotes de preparação",
    packs: { one: "{count} pacote", other: "{count} pacotes" },
    loading: "Carregando sua preparação para entrevistas",
  },
  calendar: {
    ready: "Arquivo de agenda pronto",
    readyDetail:
      "Abra para adicionar o dia da entrevista, com um lembrete para praticar na manhã anterior.",
    failed: "Não foi possível criar o arquivo de agenda",
    tryLater: "Tente de novo daqui a pouco.",
    add: "Adicionar à agenda",
  },
  brief: {
    title: "Resumo de hoje",
    stories: "Suas histórias mais fortes",
    questions: "Perguntas prováveis",
    asks: "Perguntas para fazer a eles",
  },
} satisfies Translation<Messages["interview"]>;
