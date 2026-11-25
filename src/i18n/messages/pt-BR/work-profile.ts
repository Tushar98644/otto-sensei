import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  regions: {
    us: "Estados Unidos",
    uk: "Reino Unido",
    eu: "União Europeia",
    ca: "Canadá",
  },
  regionNames: {
    us: "os EUA",
    uk: "o Reino Unido",
    eu: "a UE",
    ca: "o Canadá",
  },
  fields: {
    country: "País onde você mora",
    chooseCountry: "Escolha um país",
    timeZone: "Fuso horário",
    chooseZone: "Escolha um fuso horário",
    rightsTitle: "Você pode trabalhar lá sem patrocínio de visto?",
    rightsHint: "Sim, se você é cidadão ou residente, ou se seu visto já permite trabalhar.",
    openTo: "Aberto a",
    fullTime: "Empregos em tempo integral",
    contract: "Trabalho por contrato",
    remoteOnly: "Só empregos remotos",
  },
  rights: {
    yes: "Sim",
    visa: "Preciso de visto",
    notSet: "Não definido",
  },
  form: {
    pickType: "Escolha tempo integral, contrato ou os dois.",
    saving: "Salvando…",
    saved: "Salvo. Só você pode ver.",
    failed: "Não salvo: {reason}",
    failedFallback: "algo deu errado.",
    idle: "Salva enquanto você preenche.",
    looksRight: "Parece certo",
    tryAgain: "Tentar de novo",
  },
  hints: {
    resume: "Deduzido do seu currículo.",
    device: "Deduzido do fuso horário deste dispositivo.",
    home: "Marquei Sim para {region} porque você mora lá. Mude se o seu visto disser outra coisa.",
  },
  dialog: {
    title: "Onde você pode trabalhar",
    description:
      "Onde você mora, seu fuso horário e suas necessidades de visto. Só você pode ver isso.",
    done: "Pronto",
  },
  prompt: {
    guessed:
      "O Otto marcou Sim para {region} porque parece que você mora lá. Confira e adicione qualquer necessidade de visto.",
    add: "Adicione onde você pode trabalhar e Vagas marca as que dizem que não podem contratar você.",
    check: "Conferir onde você pode trabalhar",
    addButton: "Adicionar onde você pode trabalhar",
  },
  setupHidden: {
    title: "Lista de configuração oculta",
    description: "Todas as configurações continuam na página Conta.",
  },
  card: {
    eyebrow: "Antes de se candidatar",
    title: "Eles podem contratar você daí?",
    rules: {
      one: "{count} regra nesta vaga",
      other: "{count} regras nesta vaga",
    },
    checked: ", conferidas com seu perfil de trabalho",
    none: "Não encontrei regras sobre onde você mora, vistos, horários ou tipo de vaga. O Otto só identifica frases simples, então dê uma olhada na vaga também.",
    loadFailed:
      "Não deu para carregar seu perfil de trabalho, então isto não foi conferido com ele.",
    signedOut: "Entre e adicione seu perfil de trabalho para conferirmos para você.",
    addProfile: "Adicione seu perfil de trabalho para conferirmos para você.",
    gaps: "Preencha o resto do seu perfil de trabalho para responder as marcadas como Conferir.",
    tryAgain: "Tentar de novo",
    signIn: "Entrar",
    edit: "Editar perfil de trabalho",
    add: "Adicionar perfil de trabalho",
    signInReason: "Entre para salvar um perfil de trabalho. O Otto confere as vagas com ele.",
    jobLocation: "Local da vaga: {place}",
    postSays: "A vaga diz: ",
    verdicts: {
      ok: "Ok",
      check: "Conferir",
      blocked: "Provavelmente bloqueado",
    },
    ruleLabels: {
      location: "Onde você mora",
      authorization: "Direito de trabalhar",
      sponsorship: "Patrocínio de visto",
      time_zone: "Fuso horário",
      work_type: "Tipo de vaga",
    },
  },
} satisfies Translation<Messages["workProfile"]>;
