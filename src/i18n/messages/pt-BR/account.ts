import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  meta: { title: "Conta" },
  heading: "Sua conta",
  skeleton: {
    loading: "Carregando sua conta…",
    stillLoading: "Ainda carregando?",
    reload: "Recarregue a página",
  },
  tryAgain: "Tentar de novo",
  checkConnection: "Confira sua conexão e tente de novo.",
  saveFailed: "Não foi possível salvar",
  copied: "Copiado",
  copyLink: "Copiar link",
  view: {
    loadFailed: "Não foi possível carregar sua conta",
    settingUp: "Preparando seu plano {plan}",
    settingUpNew: "Preparando seu novo plano",
    checkout: "Levando você ao pagamento do {plan}",
    signIn: "Entrar",
  },
  arrival: {
    thanks: "Obrigado por fazer o upgrade!",
    thanksDetail: "Seu upgrade pode levar um minuto para aparecer.",
    cancelled: "Pagamento cancelado",
    nothingCharged: "Nada foi cobrado.",
    credit: "Obrigado! Seu crédito está a caminho.",
    creditDetail: "Pode levar um minuto para aparecer aqui.",
    goBack: "Voltar",
    testMode: "Modo de teste: você voltou para o Free.",
  },
  tabs: {
    label: "Conta",
    plan: "Plano e cobrança",
    preferences: "Preferências",
    profile: "Perfil",
  },
  plan: {
    eyebrow: "Seu plano",
    srTitle: "Seu plano: ",
    pills: {
      current: "Plano atual",
      failed: "Pagamento recusado",
      ends: "Termina em {day}",
      trialLeft: "Teste · {left}",
      trial: "Teste",
      active: "Ativo",
      setToEnd: "Programado para terminar",
    },
    endsToday: "termina hoje",
    daysLeft: { one: "falta {count} dia", other: "faltam {count} dias" },
    per: { month: "/mês", year: "/ano" },
    nothingMore: "Nada mais a pagar",
    from: "a partir de {day}",
    until: "até {day}",
    renews: "renova em {day}",
    heldTitle: "Seu último pagamento não foi aprovado",
    heldDetail: "Por enquanto você está no Free. Atualize seu cartão para recuperar seu plano.",
    held: "{title}. {detail}",
    tracked: {
      one: "uma candidatura acompanhada",
      other: "{count} candidaturas acompanhadas",
    },
    free: "O Free tem {fixes} ajustes de linha por mês, além da visão do recrutador, edição, downloads em PDF, algumas vagas compatíveis e {tracked}.",
    tryPro: "{base} Experimente o {pro}: {trial}",
    trialSentence: {
      month:
        "{price} por {days} dias, depois {plan} por mês. Cancele quando quiser antes de o teste acabar.",
      year: "{price} por {days} dias, depois {plan} por ano. Cancele quando quiser antes de o teste acabar.",
    },
    trialEnding:
      "Seu teste termina em {day} e o {name} não vai começar, então você não paga mais nada.",
    trialStarts: {
      month:
        "Você pagou {trial} pelo teste. Em {day}, o {name} começa a {price} por mês. Avisamos você um dia antes.",
      year: "Você pagou {trial} pelo teste. Em {day}, o {name} começa a {price} por ano. Avisamos você um dia antes.",
    },
    endsOn:
      "Seu plano termina em {day}, e sua conta passa para o Free nessa data. Você não será cobrado de novo.",
    setToEnd:
      "Seu plano está programado para terminar, e sua conta passa para o Free nessa data. Você não será cobrado de novo.",
    renewsOn: {
      month: "Seu plano renova em {day} por {price} por mês. Cancele quando quiser antes disso.",
      year: "Seu plano renova em {day} por {price} por ano. Cancele quando quiser antes disso.",
    },
    renewsEach: {
      month: "Seu plano renova todo mês por {price} por mês. Cancele quando quiser.",
      year: "Seu plano renova todo ano por {price} por ano. Cancele quando quiser.",
    },
    yearly: "Pague por ano: {price} por ano.",
    yearlySaves: "Pague por ano: {price} por ano, {savings}% a menos que no mensal.",
    how: {
      trial:
        "Um plano não pode mudar de mensal para anual no meio do período. Cancele seu teste e, quando ele acabar, escolha o anual na página de preços.",
      trialBefore:
        "Um plano não pode mudar de mensal para anual no meio do período. Cancele seu teste antes de {day} e, quando ele acabar, escolha o anual na página de preços.",
      paid: "Um plano não pode mudar de mensal para anual no meio do período. Cancele o mensal e, quando ele acabar, escolha o anual na página de preços.",
      paidBefore:
        "Um plano não pode mudar de mensal para anual no meio do período. Cancele o mensal antes de {day} e, quando ele acabar, escolha o anual na página de preços.",
    },
    max: {
      triple:
        "Precisa de mais? O {max} tem pelo menos o triplo de cada limite do {pro}, por {price} por mês.",
      double:
        "Precisa de mais? O {max} tem pelo menos o dobro de cada limite do {pro}, por {price} por mês.",
      more: "Precisa de mais? O {max} supera cada limite do {pro}, por {price} por mês.",
    },
    updateCard: "Atualizar cartão",
    howToSwitch: "Como trocar",
    testMode: "Modo de teste",
    testModeLine: "Cancelar ou atualizar seu cartão leva você de volta ao Free.",
    compare: "Comparar planos",
    tryFor: "Experimente o {plan} por {price}",
    upgradeTo: "Fazer upgrade para o {plan}",
    resumeTrial: "Retomar o teste",
    resumePlan: "Retomar o plano",
    change: "Mudar de plano",
    cancelTrial: "Cancelar o teste",
    cancelPlan: "Cancelar o plano",
  },
  usage: {
    title: "Uso",
    meters: {
      tailor: "Versões personalizadas",
      letter: "Cartas, respostas e preparação",
      fix: "Ajustes de linha",
      import: "Leituras de currículo com IA",
      draft: "Rascunhos com o Otto",
      github: "Rascunhos de projetos do GitHub",
    },
    trialEnds: "Este teste · termina em {day}",
    trial: "Este teste",
    monthResets: "Este mês · reinicia em {day}",
    month: "Este mês",
    allUsed: "Tudo usado por enquanto.",
    allUsedTrial: "Tudo usado. Você terá mais quando o teste acabar, em {day}.",
    allUsedOn: "Tudo usado. Você terá mais em {day}.",
    used: "{used} de {limit} usados",
    of: "de {limit}",
    proOnly: "Personalização, cartas, leituras de currículo com IA e portfólios vêm com o {pro}.",
    hideRest: "Esconder os outros limites",
    showRest: "Mostrar todos os limites",
    basicReader: "Uploads depois das leituras com IA continuam funcionando, com o leitor básico.",
  },
  credit: {
    title: "Crédito",
    neverExpires: "Não expira",
    about: {
      one: "cerca de {count} versão personalizada",
      other: "cerca de {count} versões personalizadas",
    },
    none: "Ainda sem crédito",
    usable: "Usado só quando o que está incluído no mês acaba.",
    waits:
      "O crédito funciona no {pro} e no {max}, depois que qualquer teste terminar. Seu saldo espera até lá.",
    add: "Adicionar crédito",
    buys: "{price} = {list}",
    or: "{list} ou {last}",
    from: "{buys}. A partir de {min}, em dólares inteiros.",
    maxHint:
      "Você adicionou {added} de crédito este mês. O {max} custa {extra} a mais que o {pro} e tem {more} versões personalizadas por mês, contra {less} do {pro}.",
    hideHistory: "Esconder o histórico de crédito",
    showHistory: "Mostrar o histórico de crédito",
    historyFailed: "Não foi possível carregar seu histórico de crédito",
    nothing: "Nada ainda.",
    added: "Crédito adicionado",
    takenBack: "Crédito retirado após um reembolso",
    aiHelp: "Ajuda da IA",
    labels: {
      tailor: { one: "{count} versão personalizada", other: "{count} versões personalizadas" },
      letter: { one: "{count} carta", other: "{count} cartas" },
      fix: { one: "{count} ajuste de linha", other: "{count} ajustes de linha" },
      import: {
        one: "{count} leitura de currículo com IA",
        other: "{count} leituras de currículo com IA",
      },
      draft: { one: "{count} rascunho com o Otto", other: "{count} rascunhos com o Otto" },
      github: {
        one: "{count} rascunho de projeto do GitHub",
        other: "{count} rascunhos de projetos do GitHub",
      },
    },
  },
  payment: {
    title: "Forma de pagamento",
    ending: "{brand} com final {last4}",
    expires: "Vence em {date}",
    lastCard: "O cartão do seu último pagamento",
    keptBy: "Seu cartão fica guardado com a Dodo Payments.",
    merchant:
      "Cobrado pela Dodo Payments, nossa revendedora oficial (merchant of record). As cobranças aparecem como DODOPAY na sua fatura.",
  },
  history: {
    title: "Histórico de cobranças",
    loadFailed: "Não foi possível carregar seus pagamentos",
    none: "Nenhum pagamento ainda.",
    date: "Data",
    item: "Item",
    amount: "Valor",
    status: "Status",
    invoice: "Nota",
    plusTax: "mais impostos, se houver",
    invoiceFailed: "Não foi possível baixar essa nota",
    download: "Baixar a nota de {item}, {date}",
    statuses: {
      paid: "Pago",
      processing: "Processando",
      failed: "Recusado",
      refunded: "Reembolsado",
      upcoming: "Próximo",
    },
  },
  status: {
    pickUp: "Continuar de onde parou",
    dashboard: "Ir para o seu painel",
    stillShowing: "Ainda aparece {plan}?",
    checkAgain: "Verificar de novo",
    slowFree:
      "Os pagamentos podem levar alguns minutos para chegar até nós. Verifique de novo daqui a pouco ou escreva para <link>{email}</link>.",
    slowPaid:
      "Os pagamentos podem levar alguns minutos para chegar até nós, então verifique de novo daqui a pouco. Se seu cartão foi recusado, você continua no {plan}: atualize seu cartão abaixo e tente de novo, ou escreva para <link>{email}</link>.",
    finishing: "Concluindo seu upgrade",
    finishingDetail:
      "Seu upgrade pode levar um minuto para aparecer. Esta página verifica de novo sozinha.",
  },
  preferences: {
    writingStyle: "Estilo de escrita",
    writingStyleIntro:
      "Tom, tamanho, ortografia e despedida de tudo o que o Otto escreve para você.",
    jobSearch: "Busca de emprego",
    jobSearchIntro:
      "Onde você pode trabalhar e o que está procurando, para Vagas mostrar primeiro as vagas certas.",
    reminders: "Lembretes",
    remindersIntro:
      "Lembretes para fazer follow-up das vagas em que você se candidatou, no sininho; suas entrevistas no seu calendário; e seu diário de carreira mensal.",
  },
  style: {
    loadFailed: "Não foi possível carregar seu estilo de escrita",
    intro:
      "Usado nas suas cartas de apresentação, respostas de candidatura e mensagens de contato. O Otto segue esse estilo, mas seu histórico profissional continua vindo só do seu currículo, e o Otto nunca inventa nada.",
    tone: "Tom",
    length: "Tamanho",
    spelling: "Ortografia",
    tones: {
      natural: {
        label: "Natural",
        hint: "Simples e simpático, como uma pessoa cuidadosa escreve.",
      },
      warm: { label: "Caloroso", hint: "Simpático e pessoal, sem deixar de ser profissional." },
      direct: { label: "Direto", hint: "Frases curtas, direto ao ponto." },
      formal: { label: "Formal", hint: "Polido e tradicional, sem contrações." },
    },
    lengths: {
      standard: { label: "Padrão", hint: "Cerca de 200 palavras por carta, 120 por mensagem." },
      shorter: { label: "Mais curto", hint: "Cerca de 140 palavras por carta, 80 por mensagem." },
    },
    spellings: {
      us: { label: "Inglês americano", hint: "organize, color, résumé" },
      uk: { label: "Inglês britânico", hint: "organise, colour, CV" },
    },
    signOff: "Despedida",
    signOffHint: "Fecha suas cartas de apresentação e mensagens.",
    signOffPlaceholder: "Atenciosamente",
    notes: "Notas para o Otto",
    notesHint:
      "Qualquer outra coisa para levar em conta, como “Mencione que posso me mudar” ou “Seja modesto, sem superlativos”.",
    notesLeft: "Restam {count} caracteres nas suas notas.",
    saveFailed: "Não foi possível salvar seu estilo de escrita",
    reset: "Voltar ao padrão",
    saving: "Salvando…",
    saved: "Salvo",
    asYouGo: "As alterações são salvas automaticamente.",
  },
  work: {
    title: "Onde você pode trabalhar",
    intro:
      "Onde você mora, seu fuso horário e sua necessidade de visto. Vagas marca as vagas que dizem que não podem contratar você e pode escondê-las. Só você vê isso.",
    loadFailed: "Não foi possível carregar seu perfil de trabalho",
  },
  lookingFor: {
    title: "O que você procura",
    intro:
      "O cargo, o nível e o lugar que Vagas mostra primeiro. Deduzido do seu currículo até você escolher.",
    loadFailed: "Não foi possível carregar o que você procura",
    change: "Toque em uma parte para mudar. Salva automaticamente.",
    pick: "Toque em uma parte para escolher um cargo e um nível. Salva automaticamente.",
  },
  reminders: {
    calendar: "Calendário",
    saved: "Agora os lembretes chegam {days} dias depois da candidatura.",
    title: "Lembretes de follow-up",
    intro:
      "Quando você marca uma vaga como candidatada, o Otto cria um lembrete de follow-up e mostra no sininho do seu painel, com Feito e Adiar {days} dias. Na véspera de uma entrevista e na manhã dela, o Otto também lembra você ali, e na manhã seguinte pergunta como foi. Novas vagas compatíveis e visitas aos seus links também aparecem ali.",
    loadFailed: "Não foi possível carregar seus ajustes de lembretes",
    after: "Lembrar de fazer follow-up depois de",
    counted: "Contado a partir do dia da candidatura.",
    days: "{count} dias",
  },
  careerLog: {
    title: "Diário de carreira",
    intro:
      "Uma nota de um minuto por mês sobre o que você entregou, para seu próximo currículo se escrever sozinho. Grátis em todos os planos, mesmo se você parar de pagar.",
    checkinsOn: "As revisões mensais estão ligadas.",
    checkinsOff: "As revisões mensais estão desligadas.",
    emailsOn: "Os e-mails de revisão estão ligados.",
    emailsOff: "Os e-mails de revisão estão desligados.",
    resumed: "As revisões voltaram.",
    paused: "As revisões estão pausadas.",
    daySaved: "Dia da revisão salvo.",
    monthly: "Revisão mensal",
    monthlyHint:
      "Três perguntas rápidas uma vez por mês, no sininho e no Início. Desligado até você ligar.",
    askOn: "Perguntar na",
    next: "Próxima: {day}.",
    onceAMonth: "Uma vez por mês.",
    week: "Semana do mês",
    weekday: "Dia da semana",
    weeks: {
      first: "Primeira",
      second: "Segunda",
      third: "Terceira",
      fourth: "Quarta",
      last: "Última",
    },
    pause: "Pausa",
    pausedUntil: "Pausado até {day}.",
    busy: "Mês corrido? Pule uma revisão, ou três.",
    pausedOption: "Pausado até {day}",
    resumeNow: "Retomar agora",
    notPaused: "Sem pausa",
    pauseMonth: "Pausar por um mês",
    pauseThree: "Pausar por 3 meses",
    email: "E-mail de revisão",
    emailHint:
      "Um e-mail curto no dia, nunca mais de um por mês. O sininho e o Início perguntam de qualquer jeito.",
    keep: "Pensando em cancelar? <link>Seu diário de carreira continua grátis</link>: ele fica em todos os planos, com as revisões mensais incluídas.",
    open: "Abrir seu diário de carreira",
    loadFailed: "Não foi possível carregar os ajustes do seu diário de carreira",
    on: "Ligado",
    off: "Desligado",
  },
  profile: {
    title: "E-mail e login",
    google:
      "Você entra com o Google ou com um código de 6 dígitos enviado a este e-mail. Sem senha.",
    code: "Você entra com um código de 6 dígitos enviado a este e-mail. Sem senha.",
    signOut: "Sair",
    signOutFailed: "Não foi possível sair",
    signedOut: "Você saiu da conta.",
  },
  invite: {
    title: "Convide amigos",
    intro:
      "Quando um amigo se cadastra com o seu link e verifica um currículo, cada um de vocês ganha {fix} ajustes de linha e {tailor} versões personalizadas a mais naquele mês.",
    loadFailed: "Não foi possível carregar seu link de convite",
    shareText:
      "Uso o {brand} para ver o que o software de recrutamento lê no meu currículo. Cadastre-se pelo meu link e verifique o seu, e nós dois ganhamos {fix} ajustes de linha a mais.",
    copyFailed: "Não foi possível copiar o link",
    copyYourself: "Selecione e copie você mesmo.",
    yourLink: "Seu link de convite",
    share: "Compartilhar",
    linkCopied: "Link de convite copiado.",
    progress: "Amigos que deram extras a você",
    progressValue: "{done} de {total}",
    nobody: "Ninguém entrou pelo seu link ainda.",
    joined: {
      one: "{count} amigo entrou; currículos verificados: {checked}.",
      other: "{count} amigos entraram; currículos verificados: {checked}.",
    },
    full: "Você já tem os {max} amigos que dão extras. Os novos amigos continuam ganhando os deles.",
    upTo: "Extras por até {max} amigos.",
    extrasTrial:
      "Durante o seu teste você tem {fix} ajustes de linha e {tailor} versões personalizadas a mais graças aos convites.",
    extrasMonth:
      "Este mês você tem {fix} ajustes de linha e {tailor} versões personalizadas a mais graças aos convites.",
    free: "No Free, cada amigo soma {fix} ajustes de linha aos {limit} daquele mês. Personalização vem com o Pro, então as {tailor} versões personalizadas ficam esperando: comece um teste ou faça upgrade naquele mês e cada extra que você não usou vai junto.",
    trial:
      "Os extras somam aos limites do seu teste, e os que você não usar passam para o seu primeiro mês pago.",
    paid: "Os extras somam aos limites do seu {plan}.",
  },
  data: {
    title: "Seus dados",
    intro:
      "Um arquivo ZIP com os currículos salvos na sua conta, suas cartas, respostas e mensagens, e as vagas que você acompanha.",
    download: "Baixar meus dados",
    failed: "Não foi possível baixar seus dados",
  },
  deleteAccount: {
    title: "Excluir conta",
    intro: "Exclui sua conta e tudo o que está salvo nela. Não dá para desfazer.",
    alsoCancels: "Isso também cancela seu plano.",
    downloadFirst: "Baixe seus dados antes se quiser guardá-los.",
    failed: "Não foi possível excluir sua conta",
    dialogTitle: "Excluir sua conta?",
    dialogIntro:
      "Isso exclui sua conta, os currículos com backup nela e seu histórico de uso. Não dá para desfazer.",
    cancel: "Cancelar",
    cancelsPlan: "Isso também cancela seu plano",
    endsNow: "Seu plano pago termina na hora, e você não será cobrado de novo.",
    credit: "Seu crédito de {credit} é removido junto e não pode ser usado de novo.",
    browser: "Os currículos salvos neste navegador também são apagados.",
    word: "EXCLUIR",
    type: "Digite <b>{word}</b> para confirmar",
  },
  extension: {
    title: "Extensão do Chrome",
    connected:
      "Conectada desde {date}. Ela compara as vagas com o seu currículo na própria página e salva as vagas no seu quadro.",
    connectedIn:
      "Conectada em {count} navegadores desde {date}. Ela compara as vagas com o seu currículo na própria página e salva as vagas no seu quadro.",
    pitch:
      "Veja como seu currículo combina com qualquer vaga, salve vagas no seu quadro e preencha candidaturas em um clique.",
    disconnected: "O Otto para Chrome foi desconectado",
    everyBrowser: "Em todos os navegadores em que estava.",
    disconnectFailed: "Não foi possível desconectar",
    disconnect: "Desconectar",
    soon: "Em breve",
    soonStore: "Em breve na Chrome Web Store.",
    add: "Adicionar ao Chrome",
    connect: {
      meta: "Conecte o Otto para Chrome",
      title: "Conecte o Otto para Chrome",
      doneTitle: "O Otto está na sua busca de emprego",
      intro:
        "Um toque liga a extensão à sua conta, para o selo comparar as vagas com o seu currículo.",
      doneIntro:
        "Abra qualquer vaga. O selo do Otto mostra como seu currículo combina, e se você pode aceitar a vaga, antes de você ler uma palavra.",
      checkingAccount: "Verificando sua conta",
      looking: "Procurando a extensão",
      connecting: "Conectando",
      missing: "O Otto para Chrome ainda não está neste navegador",
      added: "Já adicionei",
      missingStore:
        "Adicione a extensão ao Chrome e volte para esta aba. Se você acabou de adicionar, recarregue esta página.",
      missingSoon:
        "O Otto para Chrome chega em breve à Chrome Web Store. Se você já tem, recarregue esta página.",
      failed: "Não conectou",
      tryAgain: "Tentar de novo",
      connectedAs: "Conectado como {email}",
      tryPost:
        "Teste com uma vaga no {sites} ou no {last}. Em qualquer outro site, aperte meu botão na barra de ferramentas.",
      board: "Abrir seu quadro",
      close: "Fechar esta aba",
    },
  },
  reminder: {
    meta: "Lembrete",
    title: "Lembretes",
    missing: "Falta uma parte nesse link. Abra suas candidaturas.",
    done: {
      message: "Já fez o follow-up? Marque como feito e eu paro de lembrar você.",
      label: "Marcar como feito",
    },
    snooze: {
      message: "Ainda não é hora do follow-up? Eu lembro você de novo em {days} dias.",
      label: "Adiar {days} dias",
    },
    unsubscribe: {
      message:
        "Desligar os e-mails de lembrete? Seus lembretes continuam no sininho do seu painel.",
      label: "Desligar os e-mails de lembrete",
    },
    snoozeCompany:
      "Ainda não é hora do follow-up com a {company}? Eu lembro você de novo em {days} dias.",
    doneRole:
      "Já fez o follow-up com a {company} sobre a vaga de {role}? Marque como feito e eu paro de lembrar você.",
    doneCompany: "Já fez o follow-up com a {company}? Marque como feito e eu paro de lembrar você.",
    badUnsubscribe:
      "Esse link de descadastro não é válido. Desligue os e-mails na sua página de Conta.",
    unsubscribed:
      "Pronto. Você não vai mais receber e-mails de lembrete. O sininho do seu painel guarda tudo.",
    failed: "Não deu certo. Abra suas candidaturas.",
    failedShort: "Não deu certo.",
    thatJob: "essa vaga",
    marked: "Marcado como feito. Não vou mais lembrar você sobre {name}.",
    movedOn: "{name} já saiu de Candidatada, então não há nada para adiar.",
    snoozed: "Adiado por {days} dias. Vou lembrar você sobre {name} em {day}.",
    applications: "Abrir suas candidaturas",
  },
} satisfies Translation<Messages["account"]>;
