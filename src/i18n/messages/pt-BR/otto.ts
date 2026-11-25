import type { Messages } from "..";
import type { Translation } from "../../types";

// Otto's lines about limits, plans and errors, in Brazilian Portuguese.
export default {
  comesWithPro: {
    fix: "Mais ajustes de linha vêm com o Pro.",
    tailor: "Personalizar vem com o Pro.",
    letter: "Cartas, mensagens de contato, respostas e preparação para entrevistas vêm com o Pro.",
    import: "A leitura com IA de arquivos enviados vem com o Pro.",
    draft: "Criar rascunhos comigo vem com o Pro.",
    github: "Rascunhos do GitHub vêm com o Pro.",
  },
  tool: {
    resumes: "O Free guarda {free}. O {pro} guarda {proCount}, o {max}, {maxCount}.",
    formats: "Este formato vem com o Pro. O Free tem Classic e Compact.",
    word: "Downloads em Word vêm com o Pro. Seu download em PDF continua grátis.",
    tracker: "O Free acompanha {free}. O {pro} acompanha {proCount}, o {max}, {maxCount}.",
    jobs: "Filtros, vagas salvas e todas as compatíveis vêm com o Pro.",
    share: "Links de compartilhamento vêm com o Pro.",
    eligibility: "Verificar de onde uma vaga pode contratar vem com o Pro.",
    portfolio: "Um site de portfólio no seu próprio link vem com o Pro.",
  },
  resumes: { one: "{count} currículo", other: "{count} currículos" },
  applications: { one: "{count} candidatura", other: "{count} candidaturas" },
  labels: {
    fix: "ajustes de linha",
    tailor: "versões personalizadas",
    letter: "cartas, respostas e preparações",
    import: "leituras com IA",
    draft: "rascunhos",
    github: "rascunhos do GitHub",
  },
  withTrial: "{line} Experimente o {plan} por {days} dias.",
  reached: {
    month: "Você já usou {limit} {label} deste mês. {reset}",
    trial: "Você já usou {limit} {label} deste teste. {reset}",
  },
  freeUsed: "Você já usou {limit} {label} deste mês. O {pro} tem {proLimit} por mês.",
  near: "Opa, você já usou {used} de {limit} {label}. {reset}",
  full: {
    resumes: "O {plan} guarda {limit} currículos. Exclua um para salvar outro{upsell}.",
    resumesOver:
      "O {plan} guarda {limit} currículos; você tem {held}. Exclua {over} para salvar outro{upsell}.",
    tracker:
      "O {plan} acompanha {limit} candidaturas. Exclua algumas antigas para adicionar mais{upsell}.",
    trackerOver:
      "O {plan} acompanha {limit} candidaturas; você tem {held}. Exclua {over} para adicionar outra{upsell}.",
    upsell: ", ou mude para o {plan} para ter {limit}",
  },
  signedOut: "Você saiu da conta. Entre de novo para continuar.",
  writing: {
    none: "Não sobrou nenhuma carta, mensagem ou resposta {period}. {reset}",
    left: "{left} de {limit} cartas, mensagens e respostas restantes {period}.",
  },
  errors: {
    generic: "Algo deu errado do meu lado. Pode tentar de novo?",
    aiUnavailable:
      "Travei nessa. Tente de novo em um minuto. A maioria desses tropeços não conta no seu limite.",
    offline: "Parece que você está sem conexão. Seu trabalho está salvo neste navegador.",
    rateLimited: "É muita coisa de uma vez. Me dê um minuto para alcançar.",
    notFound: "Procurei em todo lugar, mas esta página não está aqui.",
  },
  upgrade: {
    done: "Agora você está no {plan}. Seus novos limites valem na hora.",
    trial:
      "Experimente toda a minha ajuda com IA: {plan} por {days} dias, {price}. Cancele antes do fim e não pague mais nada.",
    trialStarted: "Seu teste do Pro vai até {day}. Mãos à obra.",
  },
  budget: {
    month: "Você já usou o orçamento de IA deste mês.",
    trial: "Você já usou o orçamento de IA deste teste.",
    resetsOn: "Ele reinicia em {day}.",
    resetsWhenRenews: "Ele reinicia quando seu plano renovar.",
  },
} satisfies Translation<Messages["otto"]>;
