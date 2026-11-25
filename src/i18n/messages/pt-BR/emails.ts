import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  signOff: "{mascot}, do {brand}",
  linkLine: "{label}: {url}",
  unsubscribe: "Cancelar inscrição",
  unsubscribeLine: "Cancele a inscrição com um clique: {url}",
  emailSettings: "Configurações de e-mail",
  signInCode: {
    subject: "Seu código Otto Sensei: {token}",
    lead: "Seu código do Otto Sensei é",
    expires: "Ele expira em 10 minutos.",
    ignore: "Se você não pediu este código, pode ignorar este e-mail.",
  },
  trialEnding: {
    subject: "Seu teste do {plan} termina em {day}",
    at: "{day} às {time}",
    price: { month: "{price} por mês", year: "{price} por ano" },
    noticeBody:
      "Ele termina {when}. Depois disso, o {plan} custa {price}. Você pode cancelar quando quiser antes disso na página da sua conta.",
    lead: "Um aviso rápido: seu teste do {plan} termina {when}.",
    charge:
      "Depois disso, o {plan} custa {price} (em dólares americanos, mais impostos sobre vendas ou IVA de onde você mora) até você cancelar. Se quiser continuar com o {plan}, não precisa fazer nada.",
    cancel:
      "Se não quiser continuar, você pode cancelar quando quiser antes disso na página da sua conta, e não será cobrado mais nada.",
    account: "Sua conta",
    button: "Ir para sua conta",
    footer:
      "Você está recebendo este e-mail porque seu teste do {plan} está acabando. É um aviso de cobrança, então ele chega mesmo com os e-mails de lembrete desativados.",
  },
  checkin: {
    noticeTitle: "Sua revisão de {month}",
    noticeBody: "Um minuto: o que você entregou, algum número e algo que aprendeu ou liderou.",
    subject: "Sua revisão de {month} em um minuto",
    lead: "Um minuto para {month}? Três perguntas rápidas, por voz ou texto. Pule as que quiser.",
    prompts: {
      shipped: {
        label: "O que você entregou ou melhorou?",
        hint: "Uma funcionalidade, uma correção, um processo, uma venda.",
      },
      numbers: {
        label: "Algum número?",
        hint: "Usuários, %, dinheiro, tempo economizado. Uma estimativa já serve.",
      },
      learned: {
        label: "Algo que você aprendeu ou liderou?",
        hint: "Uma habilidade, uma ferramenta, uma pessoa que você ajudou.",
      },
    },
    nothingNew: "Nada de novo este mês? É só um toque na página.",
    free: "Suas notas são grátis em todos os planos. Quando você procurar seu próximo emprego, o Pro as transforma em linhas de currículo que citam seus próprios fatos.",
    button: "Escrever minha revisão",
    reason:
      "Você recebe isto porque ativou a revisão mensal do diário de carreira. Uma vez por mês.",
  },
  processorNotice: {
    subject: "A Dodo Payments recebe os pagamentos do {brand} a partir de {day}",
    intro:
      "Um aviso rápido sobre pagamentos: a Dodo Payments agora cuida do checkout do {brand} no lugar da Paddle e recebe pagamentos reais a partir de {day}.",
    reseller:
      "A Dodo Payments é nossa revendedora on-line e merchant of record. Ela recebe o pagamento quando você compra um plano e cuida dos recibos, impostos sobre vendas ou IVA, reembolsos e suporte de cobrança.",
    data: "Quando você inicia um checkout, enviamos à Dodo Payments o e-mail da sua conta, nosso id aleatório da sua conta e o plano que você escolhe, os mesmos dados que a Paddle recebia. A Dodo Payments trata seus dados de pagamento de acordo com a própria política de privacidade.",
    nothing:
      "Você não precisa fazer nada. Tudo o que você criou no {brand} continua como está, e nossos preços não mudam.",
    updated:
      "Atualizamos nossos termos, a política de privacidade e a página de reembolsos para refletir isso:",
    terms: "Termos",
    privacy: "Política de privacidade",
    refunds: "Reembolsos",
    questions: "Dúvidas? Escreva para {email}.",
    footer:
      "Você está recebendo este e-mail porque tem uma conta no {brand}. É um aviso único sobre uma mudança nos nossos termos e na política de privacidade, então ele chega mesmo com outros e-mails desativados.",
  },
  unsubscribePage: {
    title: "Cancelar inscrição",
    invalid:
      "Esse link não é mais válido. O Otto não envia mais esses e-mails; seus lembretes estão no sino do seu painel.",
    failed: "Não foi possível desativar esses e-mails. Tente de novo.",
    lists: {
      reminders: {
        name: "E-mails de lembrete de follow-up",
        ask: "Desativar os e-mails de lembrete de follow-up? Seus lembretes continuam no sino do seu painel.",
        press: "Desativar e-mails de lembrete",
        done: "Pronto. Você não vai mais receber e-mails de lembrete de follow-up. O sino do seu painel guarda os lembretes.",
      },
      jobs: {
        name: "O e-mail semanal de vagas",
        ask: "Parar o e-mail semanal sobre novas vagas compatíveis com seu currículo? A aba Vagas continua mostrando todas.",
        press: "Parar o e-mail semanal",
        done: "Pronto. Você não vai mais receber o e-mail semanal de vagas. As novas vagas compatíveis aparecem no sino do seu painel.",
      },
      tips: {
        name: "Dicas e lembretes",
        ask: "Parar os e-mails de dicas e lembretes, como o aviso de quando os ajustes de linha do Free voltam? Os avisos de cobrança sobre um teste continuam chegando.",
        press: "Parar dicas e lembretes",
        done: "Pronto. Você não vai mais receber e-mails de dicas e lembretes.",
      },
      views: {
        name: "E-mails de visualizações",
        ask: "Parar os e-mails sobre pessoas abrindo os links do seu currículo e o seu portfólio? O sino do seu painel continua mostrando tudo.",
        press: "Parar e-mails de visualizações",
        done: "Pronto. Você não vai mais receber e-mails de visualizações. O sino do seu painel guarda tudo.",
      },
      career: {
        name: "E-mails da revisão do diário de carreira",
        ask: "Parar o e-mail mensal do diário de carreira? Seu diário continua, grátis, e o sino do seu painel ainda pergunta uma vez por mês.",
        press: "Parar e-mails de revisão",
        done: "Pronto. Você não vai mais receber e-mails do diário de carreira. Seu diário continua, e você pode reativar o e-mail nas configurações da sua conta.",
      },
    },
  },
  followUp: {
    title: "Hora de retomar o contato com {company}?",
    titleBlank: "Hora de retomar o contato?",
    titleMany: {
      one: "{count} candidatura pede um follow-up",
      other: "{count} candidaturas pedem um follow-up",
    },
    days: { one: "{count} dia", other: "{count} dias" },
    sinceInterview:
      "Já faz {days} desde sua entrevista com {company}. Uma mensagem curta faz lembrarem de você.",
    sinceInterviewBlank:
      "Já faz {days} desde sua entrevista. Uma mensagem curta faz lembrarem de você.",
    sinceApplied:
      "Já faz {days} que você se candidatou para {company}. Retomar o contato pode ajudar.",
    thatCompany: "essa empresa",
    many: "{who} pedem um follow-up. Uma mensagem curta pode ajudar.",
    applications: { one: "{count} candidatura", other: "{count} candidaturas" },
    andMore: "{names} e mais {count}",
    pair: "{first} e {second}",
  },
  interviewSoon: {
    title: "Sua entrevista com {company} é {day}",
    titleBlank: "Sua entrevista é {day}",
    today: "hoje",
    tomorrow: "amanhã",
    onDay: "{weekday}",
    role: "Para a vaga de {role}.",
    advice: "Revise as perguntas prováveis na sua preparação antes de ir.",
  },
  views: {
    count: { one: "{count} visualização", other: "{count} visualizações" },
    shareTitle: "Alguém abriu o link do seu currículo",
    shareBody: "{link} tem {views} até agora.",
    namedLink: "Seu link de “{name}”",
    resumeLink: "O link do seu currículo",
    portfolioTitle: "Seu portfólio teve {views} {period}",
    thisWeek: "esta semana",
    since: "desde {day}",
    portfolioBody: "Sem contar você, prévias de links nem mecanismos de busca.",
  },
  jobs: {
    title: {
      one: "{count} nova vaga compatível esta semana",
      other: "{count} novas vagas compatíveis esta semana",
    },
    job: "{title} em {company}",
    andMore: "{names} e mais {count}.",
    pair: "{first} e {second}.",
    single: "{name}.",
    free: "No Free, Vagas mostra as mais próximas do seu perfil.",
  },
} satisfies Translation<Messages["emails"]>;
