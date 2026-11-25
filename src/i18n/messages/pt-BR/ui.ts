import type { Messages } from "..";
import type { Translation } from "../../types";

// Shared controls, voice typing, feedback and notifications, in Brazilian Portuguese.
export default {
  close: "Fechar",
  optional: "(opcional)",
  dropOne: "Solte um arquivo por vez.",
  fileCheck: {
    unsupported: "Esse tipo de arquivo não é aceito.",
    unsupportedKinds: "Esse tipo de arquivo não é aceito. Escolha um arquivo {kinds}.",
    kinds: "{first} ou {last}",
    empty: "Esse arquivo está vazio. Escolha outro.",
    tooBig: "Esse arquivo é grande demais. O limite é {limit}.",
  },
  voice: {
    start: "Falar em vez de digitar",
    listening: "Parar de ouvir",
    recording: "Parar de gravar",
    sending: "Transformando a fala em texto…",
    fullTitle: "Este campo está cheio",
    full: "Parte do que você disse não coube. Corte algumas palavras para adicionar mais.",
    problems: {
      micBlocked: {
        title: "O Otto não consegue te ouvir",
        description: "Permita o microfone no seu navegador para falar com o Otto.",
      },
      noMic: {
        title: "O Otto não encontra seu microfone",
        description:
          "Confira se ele está conectado e não está em uso por outro app, e tente de novo.",
      },
      noSpeech: {
        title: "O Otto não ouviu nada",
        description: "Tente de novo um pouco mais perto do microfone.",
      },
      offline: {
        title: "Ditar precisa de internet",
        description: "Confira sua conexão e tente de novo, ou digite.",
      },
      signIn: { title: "Entre primeiro", description: "Entre para falar com o Otto." },
      tooMany: { title: "Faça uma pausa", description: "Tente de novo em alguns minutos." },
      failed: {
        title: "Não foi possível transformar em texto",
        description: "Tente de novo, ou digite.",
      },
    },
  },
  feedback: {
    button: "Enviar feedback",
    title: "Enviar feedback",
    description: "Conte o que quebrou ou o que ajudaria. Também vemos de qual página você enviou.",
    cancel: "Cancelar",
    send: "Enviar",
    about: "É sobre o quê?",
    kinds: { bug: "Problema", idea: "Ideia", other: "Outro" },
    placeholders: {
      bug: "O que você fez e o que aconteceu?",
      idea: "O que deixaria o Otto mais útil?",
      other: "O que você tem em mente?",
    },
    note: "Sua mensagem",
    tooShort: "Escreva mais algumas palavras.",
    sent: "Obrigado. Sua mensagem foi enviada.",
  },
  notifications: {
    title: "Notificações",
    unread: "Notificações, {count} não lidas",
    loadFailed: "Não foi possível carregar suas notificações.",
    tryAgain: "Tentar de novo",
    empty: "Nada ainda. Marque uma vaga como candidatada e eu te lembro aqui de fazer o follow-up.",
    openApplications: "Abrir candidaturas",
    new: "Nova: ",
    writeIt: "Escreva para mim",
    done: "Feito",
    snooze: "Adiar",
    snoozeDays: "Adiar {days} dias",
    markedDone: "Follow-up marcado como feito",
    snoozed: "Adiado até {day}",
    reminderFailed: "Não foi possível mudar o lembrete",
    thankYou: "Escrever um agradecimento",
    howItWent: "Como foi",
    outcomes: { next_round: "Próxima etapa", waiting: "Aguardando", rejected: "Recusado" },
    nextRound: "Para a próxima etapa com {company}",
    nextRoundNote: "Adicione a data no cartão quando souber.",
    closed: "Movida para Encerradas",
    closedNote: "{company}. Ainda conta no seu histórico do que funciona.",
    waiting: "Aguardando resposta",
    remind: "Vou te lembrar de fazer o follow-up com {company} em {day}.",
    saveFailed: "Não foi possível salvar",
  },
} satisfies Translation<Messages["ui"]>;
