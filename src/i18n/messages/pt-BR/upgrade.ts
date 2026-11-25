import type { Messages } from "..";
import type { Translation } from "../../types";

// The upgrade and add-credit dialogs, in Brazilian Portuguese.
export default {
  otto: {
    pitch:
      "Personalizações, cartas e ajustes de linha todo mês, para uma busca de emprego intensa.",
    billingOff:
      "Os pagamentos ainda não estão ativos, mas você pode nos mandar um e-mail sobre um plano.",
    alreadyMax: "Você está no Max, o maior plano. Mande um e-mail se precisar de mais.",
    biggest:
      "Você está no {plan}, o maior plano à venda aqui. Mande um e-mail se precisar de mais.",
    hasMore: "{line} O {plan} tem mais.",
    monthCredit:
      "Você adicionou {spent} de crédito este mês, mais do que os {extra} que o {max} custa a mais que o {pro}.",
  },
  title: {
    reached: {
      month: "Você chegou ao limite deste mês",
      trial: "Você chegou ao limite deste teste",
    },
    onPlan: "Você está no {plan}",
    updateCard: "Atualize seu cartão",
    upgradeTo: "Mude para o {plan}",
    choose: "Escolha seu plano",
    trial: "Experimente o {plan} por {days} dias",
  },
  resets: "Ele reinicia {when}. Precisa de mais antes disso? Mande um e-mail.",
  resetsCredit:
    "Ele reinicia {when}. Precisa de mais antes disso? Adicione crédito ou mande um e-mail.",
  cancelAnytime: "Cancele quando quiser na sua conta.",
  inPlace: "Sua assinatura muda na hora: você paga só a diferença, nunca duas vezes.",
  creditFrom: "Ou adicione crédito a partir de {min}: {buys}.",
  balance: "Seu saldo: {balance}.",
  replace:
    "Ou substitua “{title}” pelo novo. O antigo fica em Excluídos recentemente por {days} dias, só neste navegador.",
  buttons: {
    addCredit: "Adicionar crédito",
    replace: "Substituir",
    notNow: "Agora não",
    close: "Fechar",
    emailUs: "Mande um e-mail",
    back: "Voltar",
    manageBilling: "Gerenciar pagamento",
  },
  toast: {
    alreadyOn: "Você já está no {plan}.",
    backOn: "Você está no {plan}. Vamos continuar de onde você parou.",
  },
  trial: {
    notice: "O {plan} começa agora e seu teste do {trialPlan} termina. {charge}",
    charge:
      "Você paga {price} (mais impostos, se houver) na hora, no cartão cadastrado. A cobrança de {trial} do teste não é descontada.",
    paymentIssue:
      "Seu último pagamento não foi aprovado, então por enquanto você está no Free. Atualize seu cartão em Gerenciar pagamento para recuperar seu plano.",
    resumeTrial:
      "Seu teste está programado para terminar. Retome-o em Gerenciar pagamento e depois comece o {plan}.",
    resumePlan:
      "Seu plano está programado para terminar. Retome-o em Gerenciar pagamento para mudar de plano.",
  },
  offer: {
    howOften: "Com que frequência pagar",
    intervals: { month: "Mensal", year: "Anual" },
    spoken: { month: "por mês", year: "por ano" },
    per: { month: "/mês", year: "/ano" },
    current: "Plano atual",
    popular: "Popular",
    save: "Economize {percent}%",
    referencePrice: "Preço de referência",
    monthlyOnly: "Por enquanto, só no mensal.",
    aboutMonth: "Cerca de {price} por mês.",
    everythingInPro: "Tudo do Pro, e mais:",
    highlight: {
      month: "{count} {label} por mês",
      trial: "{count} {label} durante o teste",
    },
    labels: {
      fix: "ajustes de linha",
      tailor: "versões personalizadas",
      letter:
        "cartas de apresentação, mensagens de contato, respostas e preparações para entrevistas",
      import: "leituras com IA de um currículo enviado",
      draft: "rascunhos do Criar com o Otto",
      github: "rascunhos de projetos do GitHub",
    },
    proHighlight: "Todos os {formats} formatos, downloads em Word e todas as vagas compatíveis",
    limitsHighlight: "Até {resumes} currículos e {applications} candidaturas acompanhadas",
    tryPlan: "Experimente o {plan} por {days} dias",
    upgradeTo: "Mude para o {plan}",
    startNow: "Começar o {plan} agora",
    resetRule: {
      month: "Os limites reiniciam todo mês, quando seu plano renova.",
      year: "Os limites reiniciam todo mês, no mesmo dia do mês em que seu plano começou.",
    },
    promises:
      "Os envios sempre funcionam: depois das leituras com IA, o leitor básico lê o arquivo. Downloads em PDF continuam grátis em todos os planos.",
    trialSentence:
      "{price} por {days} dias, depois {planPrice} {perInterval}. Cancele quando quiser antes do fim do teste.",
    perInterval: { month: "por mês", year: "por ano" },
    endsTrial: "Encerra hoje seu teste do {trialPlan} e inicia o {plan} por {priceLabel}.",
    monthly: "{price} por mês. Cancele quando quiser.",
    yearly:
      "{price} uma vez por ano, cerca de {perMonth} por mês. {savings}% a menos do que pagar mensalmente.",
    yearlyFlat: "{price} uma vez por ano.",
  },
  billing: {
    testMode: "Modo de teste",
    mockPlan: "Sem pagamento real. Seu plano muda na hora.",
    offTitle: "Os pagamentos ainda não estão ativos",
    off: "Quer um plano pago agora? Mande um e-mail para <link>{email}</link> e nós configuramos para você.",
  },
  credit: {
    title: "Adicionar crédito",
    description:
      "Usado só quando o que está incluído no mês acaba. Não expira enquanto sua conta existir.",
    amount: "Valor",
    other: "Outro",
    amountLabel: "Valor em dólares",
    hint: "Dólares inteiros, de {min} a {max}.",
    add: "Adicionar {amount}",
    pick: "Escolha um valor em dólares inteiros de {min} a {max}.",
    room: "Seu saldo comporta até {cap}, então agora você pode adicionar até {room}.",
    full: "Seu saldo comporta até {cap}. Use uma parte e depois adicione mais.",
    failed: "Não foi possível adicionar crédito",
    balanceNow: "Seu saldo agora: {balance}.",
    mock: "Sem pagamento real. O crédito é adicionado na hora.",
    tax: "Mais impostos no pagamento, se houver. Pré-pago e não reembolsável depois de usado.",
    buys: "{usd} = {list}",
    item: "{count} {label}",
    labels: {
      tailor: "versões personalizadas",
      letter: "cartas",
      fix: "ajustes de linha",
      import: "leituras de currículo com IA",
      draft: "rascunhos do Criar com o Otto",
      github: "rascunhos de projetos do GitHub",
    },
  },
} satisfies Translation<Messages["upgrade"]>;
