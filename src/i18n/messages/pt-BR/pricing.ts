import type { Messages } from "..";
import type { Translation } from "../../types";

// The pricing page, plan cards and shared price words, in Brazilian Portuguese; plan names stay as they are.
export default {
  meta: {
    title: "Preços e planos: {free}, {pro} e {max}",
    description:
      "Revise, corrija e baixe um currículo em PDF de graça. O {pro} custa {proPrice} por mês, com personalização, cartas de apresentação e todos os formatos; o {max} custa {maxPrice}. {close}",
    trialClose: "Teste o {pro} por {days} dias pagando {trialPrice}.",
  },
  prices: {
    cancelAnytime: "Cancele quando quiser.",
    intervalNames: { month: "Mensal", year: "Anual" },
    perInterval: { month: "por mês", year: "por ano" },
    eachInterval: { month: "mês", year: "ano" },
    priceLabel: { month: "{price}/mês", year: "{price}/ano" },
    trialOffer: "{plan} por {days} dias",
    trialHeadline: "Experimente o {offer}",
    trialSentence:
      "{price} por {days} dias, depois {planPrice} {perInterval}. Cancele quando quiser antes do fim do teste.",
    endsTrial: "Encerra hoje seu teste do {trialPlan} e inicia o {plan} por {priceLabel}.",
    monthly: "{price} por mês. Cancele quando quiser.",
    yearly:
      "{price} uma vez por ano, cerca de {perMonth} por mês. {savings}% a menos do que pagar mensalmente.",
    yearlyFlat: "{price} uma vez por ano.",
    perPeriod: { month: "por mês", trial: "durante o teste" },
  },
  features: {
    fix: "ajustes de linha",
    tailor: "versões personalizadas",
    letter: "cartas de apresentação, mensagens de contato, respostas e preparação para entrevistas",
    import: "leituras por IA de um currículo enviado",
    draft: "rascunhos do Criar com o Otto",
    github: "rascunhos de projetos do GitHub",
  },
  credit: {
    line: "Acabou? Adicione crédito a partir de {min}: {buys}.",
    buys: "{usd} = {list}",
    item: "{count} {label}",
    labels: {
      tailor: "versões personalizadas",
      letter: "cartas",
      fix: "ajustes de linha",
      import: "leituras de currículo por IA",
      draft: "rascunhos do Criar com o Otto",
      github: "rascunhos de projetos do GitHub",
    },
    each: {
      tailor: "{price} por versão personalizada",
      letter: "{price} por carta",
      fix: "{price} por ajuste de linha",
      import: "{price} por leitura de currículo por IA",
      draft: "{price} por rascunho do Criar com o Otto",
      github: "{price} por rascunho de projeto do GitHub",
    },
    cents: "{cents} centavos",
  },
  page: {
    title: "Grátis para o básico.",
    titleEm: "Mais quando a busca aperta.",
    intro:
      "Revisar, corrigir e baixar é grátis. O Pro adiciona a ajuda de IA do Otto, todas as vagas compatíveis e o controle de candidaturas.",
    otto: "Os planos mudam o quanto eu ajudo a cada mês, nunca o que eu faço ou deixo de fazer.",
    footnote:
      "Preços em dólares americanos. Podem incidir impostos. Os planos pagos se renovam a cada {periods} até você cancelar.",
    billingQuestions: "Dúvidas sobre cobrança",
    closingStudio: "Ou revise seu currículo de graça",
  },
  plans: {
    howOften: "Frequência de pagamento",
    period: {
      month: { short: "/mês", spoken: "por mês" },
      year: { short: "/ano", spoken: "por ano" },
    },
    free: "grátis",
    discount: "{percent}% de desconto",
    yearlySavings: "Economize {percent}% em relação ao mensal",
    fairLimits: "Limites justos em cada recurso de IA, todos listados nos <link>termos</link>.",
    referencePrice: "Preço de referência ",
    manage: "Gerenciar seu plano",
    freeCta: "Revisar meu currículo grátis",
    popular: "Mais popular",
    trialEmail: "Vamos enviar um e-mail no dia anterior à renovação.",
    yearlyNote: "Cerca de {perMonth} por mês, em vez de {yearly} por ano pagando mês a mês.",
    monthlyOnly: "Por enquanto, só no plano mensal.",
    wontStart: "O {plan} não vai começar, então você não vai pagar mais nada.",
    thenPrice: "Depois, {priceLabel}, a menos que você cancele.",
    setToEnd: "Programado para terminar, então você não será cobrado de novo.",
    yourPlan: "Seu plano",
    currentPlan: "Plano atual",
    currentTrial: "Plano atual · teste até {day}",
    includedIn: "Incluído no {plan}.",
    startNow: "Começar o {plan} agora",
    upgradeTo: "Mudar para o {plan}",
    get: "Assinar o {plan}",
    notOnPeriod: "Ainda não disponível no seu período de cobrança.",
  },
  copy: {
    free: {
      summary: "Revise, corrija e baixe um currículo.",
      note: "Sem cartão",
      outcomes: {
        upload: "Envie um currículo e veja o que o software de recrutamento lê",
        fix: "Ajuste cada linha à mão ou com o Otto",
        download: "Baixe um PDF limpo em {formats}",
        matches: "As suas {count} vagas mais compatíveis",
        track: "Acompanhe {applications}, com um lembrete de retorno",
      },
    },
    pro: {
      summary: "A ajuda do Otto para uma busca intensa.",
      lead: "Tudo do Free, e mais:",
      note: "Cancele quando quiser na sua conta",
      ai: {
        tailor: "O Otto personaliza seu currículo para cada vaga",
        letters:
          "Cartas de apresentação, mensagens de contato e preparação para entrevistas do Otto",
      },
      tools: {
        formats: "Todos os {formats} formatos, até {resumes} currículos e downloads em Word",
        jobs: "Todas as vagas compatíveis entre {open} abertas, com filtros e vagas salvas",
        jobsNoCount: "Vagas abertas compatíveis com seu currículo, com filtros e vagas salvas",
        track: "Acompanhe até {applications} candidaturas, com lembretes de retorno",
        share: "Links de compartilhamento e um site de portfólio em todos os {designs} designs",
      },
    },
    max: {
      summary: "Para uma busca longa ou para vários cargos.",
      lead: "Tudo do Pro, com mais:",
      note: "Cancele quando quiser na sua conta",
      more: {
        tailor: "versões personalizadas",
        letter: "cartas de apresentação, mensagens de contato e preparação para entrevistas",
        fix: "ajustes de linha",
        import: "arquivos enviados lidos por IA",
        drafts: "rascunhos a partir das suas notas e do GitHub",
      },
      ratio: {
        more: "Mais {noun}",
        twice: "O dobro de {noun}",
        times: "{times} vezes mais {noun}",
        overTwice: "Mais do que o dobro de {noun}",
        overTimes: "Mais de {times} vezes mais {noun}",
      },
      keep: "Até {resumes} currículos e {applications} candidaturas acompanhadas",
    },
    resumes: { one: "{count} currículo", other: "{count} currículos" },
    applications: { one: "{count} candidatura", other: "{count} candidaturas" },
    trackedApplications: {
      one: "{count} candidatura acompanhada",
      other: "{count} candidaturas acompanhadas",
    },
    limit: "{count} {label} {period}",
    quota: {
      free: "{resumes} · {fix} {fixLabel} {period} com o Otto",
      paid: "{items} {period}",
      item: "{count} {label}",
      letters: "cartas e preparação",
    },
  },
  table: {
    title: "Cada limite, plano por plano",
    intro:
      "Os limites do Pro e do Max são renovados todo mês, no mesmo dia do mês em que seu plano começou. Os ajustes de linha do Free são renovados no dia 1º.",
    whatYouGet: "O que você recebe",
    included: "Incluído",
    notIncluded: "Não incluído",
    groups: {
      ai: "Ajuda de IA do Otto, por mês",
      resumes: "Currículos e downloads",
      jobs: "Vagas e candidaturas",
    },
    ai: {
      tailor: { label: "Versões personalizadas", detail: "Seu currículo reescrito para uma vaga" },
      letter: {
        label: "Cartas e preparação para entrevistas",
        detail:
          "Cartas de apresentação, mensagens de contato, respostas e preparação, contadas juntas",
      },
      fix: { label: "Ajustes de linha com o Otto" },
      import: {
        label: "Arquivos enviados lidos por IA",
        detail: "Acima disso, e no Free, quem lê é o leitor básico",
      },
      draft: { label: "Primeiros rascunhos a partir das suas notas" },
      github: { label: "Rascunhos de projetos do GitHub" },
    },
    rows: {
      recruiterView: "Visão do recrutador e edição à mão",
      resumes: "Currículos",
      resumesDetail: "Versões personalizadas contam como currículos",
      formats: "Formatos",
      allFormats: "Todos os {count}",
      pdf: "Downloads em PDF",
      word: "Downloads em Word (.docx)",
      share: "Links de compartilhamento",
      portfolio: "Site de portfólio",
      portfolioDetail: "{count} designs, feitos a partir do seu currículo",
      matches: "Vagas compatíveis",
      allMatches: "Todas",
      closestMatches: "As {count} mais próximas",
      filters: "Filtros e vagas salvas",
      tracked: "Candidaturas acompanhadas",
      reminders: "Lembretes de retorno",
      hireFrom: "De onde cada vaga pode contratar",
    },
  },
  faq: {
    trial: {
      question: "Como funciona o teste do Pro?",
      answer:
        "Contas novas podem testar o Pro por {days} dias, uma vez por pessoa. Você adiciona um cartão no checkout e paga {price} (mais impostos, se houver) quando o teste começa. Quando ele termina, o Pro começa, por {priceLabel}. Cancele quando quiser antes do fim do teste e você não paga mais nada. Durante o teste, você pode criar e pré-visualizar um portfólio; ele fica público quando o Pro começa.",
    },
    free: {
      question: "O que continua grátis?",
      answer:
        "Enviar arquivos com o leitor básico, a visão do recrutador, editar e corrigir à mão, {fix} ajustes de linha por mês com o Otto, {resumes}, os formatos Classic e Compact, downloads em PDF, suas {matches} vagas mais compatíveis e {applications} com o respectivo lembrete. Sem cartão, sem limite de tempo. Mais ajustes de linha e o resto da ajuda de IA do Otto, os outros formatos, até {proResumes} currículos, downloads em Word, a lista completa de vagas compatíveis com filtros, acompanhar até {proApplications} candidaturas, links de compartilhamento e a verificação de direito de trabalho vêm com o Pro. Se um plano pago terminar, tudo o que você criou continua lá: você ainda pode abrir, editar e baixar.",
    },
    payments: {
      question: "Quem cuida dos pagamentos?",
      answer:
        "A {merchant}, nossa revendedora oficial (merchant of record). Ela processa seu pagamento na própria página de checkout, envia seus recibos e cuida do imposto sobre vendas ou do IVA, e a fatura do seu cartão mostra a cobrança no nome dela, começando com {prefix}. Nunca vemos o número completo do seu cartão.",
    },
    tax: {
      question: "Vou pagar imposto a mais?",
      answer:
        "Dependendo de onde você mora, imposto sobre vendas ou IVA pode ser adicionado no checkout. Os preços são em dólares americanos, e seu banco pode convertê-los para a sua moeda.",
    },
    cancel: {
      question: "Como eu cancelo?",
      answer:
        "Na página da sua conta, quando quiser. Você continua com seu plano até o fim do período que pagou, e não será cobrado de novo.",
    },
    refund: {
      question: "Posso pedir reembolso?",
      answer:
        "Os pedidos de reembolso são tratados pela {merchant}, nossa revendedora oficial, conforme os <link>termos para compradores</link> dela. Você também pode cancelar quando quiser na página da sua conta e não será cobrado de novo. Veja nossa <link>política de reembolso</link>.",
    },
    limits: {
      question: "Quais são os limites?",
      free: "O Free tem {fix} {fixLabel} por mês (a ajuda com o resumo profissional conta como um), renovados no início de cada mês, e nenhuma outra ajuda de IA.",
      monthly:
        "Os limites do Pro e do Max são renovados todo mês, quando seu plano renova (num plano anual, no dia do mês em que ele começou): {list}.",
      monthlyItem: "{label}: {pro} no Pro, {max} no Max",
      trial: "O teste de {days} dias do Pro tem uma cota própria para o teste inteiro: {list}.",
      trialItem: "{count} {label}",
      kept: "Currículos, contando as versões personalizadas: {freeResumes} no Free, {proResumes} no Pro e no teste, {maxResumes} no Max. Candidaturas acompanhadas: {freeApplications} no Free, {proApplications} no Pro e no teste, {maxApplications} no Max.",
      uploads:
        "Enviar arquivos sempre funciona: no Free, ou depois que as leituras por IA acabam, o leitor básico lê os arquivos.",
    },
    switch: {
      question: "Posso trocar entre o Pro e o Max?",
      answer:
        "Você pode subir do Pro para o Max na página da sua conta, no período de cobrança que você já tem. Sua assinatura muda na hora, então você nunca é cobrado duas vezes: você paga na hora a diferença pelo resto do período. No teste do Pro, começar o Max encerra o teste e cobra na hora o preço cheio do Max (mais impostos, se houver) no cartão cadastrado; a cobrança de {price} do teste não é descontada. Para ir para o Pro, ou trocar entre mensal e anual, cancele na página da sua conta e escolha o novo plano quando o período atual terminar. Ir para o Pro mantém todos os seus currículos e candidaturas; acima dos limites do Pro, você pode adicionar mais quando estiver abaixo deles.",
    },
    cancelled: {
      question: "O que acontece com meus currículos se eu cancelar?",
      answer:
        "Nada. Eles continuam sendo seus, e você pode continuar editando e baixando de graça. Um portfólio publicado sai do ar até você voltar ao Pro ou ao Max; ele não é excluído.",
    },
    credit: {
      question: "E se acabar antes de o meu plano renovar?",
      answer:
        "No {pro} ou no {max}, você pode adicionar crédito de {min} a {maxUsd} por vez, em dólares inteiros, mais impostos, se houver. {buys}: {prices}. O crédito só é usado quando a cota do mês para aquele recurso acaba, ou quando o orçamento de IA acaba, pelos preços mostrados no momento do uso. Ele é pré-pago e não é reembolsável depois de usado, nunca expira enquanto sua conta existir, só funciona em um plano pago (não no Free nem no teste) e é removido se você excluir sua conta. Um saldo comporta até {balance}.",
    },
  },
} satisfies Translation<Messages["pricing"]>;
