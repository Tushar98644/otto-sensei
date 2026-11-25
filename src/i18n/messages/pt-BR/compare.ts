import type { Messages } from "..";
import type { Translation } from "../../types";

// The comparison pages around each product's facts, in Brazilian Portuguese.
export default {
  title: "{brand} vs {name}",
  meta: {
    index: {
      title: "{brand} comparado com {count} outras ferramentas de currículo",
      description:
        "Comparativos justos e com fontes entre o {brand} e {count} ferramentas de currículo, como Jobscan, Rezi, Zety, Teal e Canva: pontos fortes e planos.",
    },
    page: {
      title: "Alternativa ao {name}: {compare}",
      description:
        "{compare}: o que cada um faz bem, o que os planos grátis e pagos incluem e onde diferem. Com base nas próprias páginas de cada produto.",
    },
  },
  crumb: "Comparativos",
  index: {
    eyebrow: "Comparativos",
    title: "Como o {brand} se compara",
    intro:
      "O {short} não para no currículo: ele segue pelas vagas, pelas candidaturas e pelas entrevistas. Veja como ele se compara, ferramenta por ferramenta.",
    facts:
      "Os fatos sobre cada produto vêm do próprio site dele, como estavam em <link>{month}</link>, e cada página traz o link de cada fonte.",
    listTitle: "{brand} vs os outros",
    cta: "Teste o {brand} no seu currículo",
  },
  pipeline: {
    title: "Mais do que um revisor de currículo",
    intro:
      "O {brand} é toda a sua busca de emprego em uma só conta, da primeira revisão do currículo até a entrevista.",
    steps: {
      check: {
        title: "Revise seu currículo",
        text: "Veja o que o software de recrutamento lê, ajuste linhas fracas com o Otto e baixe um PDF limpo.",
      },
      jobs: {
        title: "Encontre vagas que combinam com você",
        text: "Vagas abertas dos próprios sites das empresas, lidas todo dia e ranqueadas para o seu currículo.",
      },
      tailor: {
        title: "Personalize cada candidatura",
        text: "Uma cópia do seu currículo para cada vaga, além de cartas de apresentação e mensagens de contato.",
      },
      track: {
        title: "Acompanhe pela sua caixa de entrada",
        text: "Candidaturas em um só quadro, que se movem sozinhas com os seus e-mails de vagas.",
      },
      prep: {
        title: "Prepare-se para entrevistas",
        text: "Perguntas prováveis e histórias do seu próprio currículo, para cada entrevista.",
      },
      share: {
        title: "Compartilhe um portfólio",
        text: "Um site de portfólio feito a partir do seu currículo, no seu próprio link.",
      },
    },
  },
  page: {
    eyebrow: "Alternativa ao {name}",
    intro:
      "O {brand} é toda a sua busca de emprego em uma só conta: um currículo que o software de recrutamento lê, vagas ranqueadas para ele, candidaturas que se acompanham sozinhas e preparação para cada entrevista.",
    tryTitle: "Teste no seu currículo",
    matchCheck: "Fazer a verificação de compatibilidade grátis",
    noSignIn: "Grátis, sem login.",
    reasonsTitle: "Por que escolher o {brand}",
    sideBySide: "{short} e {name}, lado a lado",
    tableCaption: "{brand} e {name}, lado a lado",
    fromSite: "Tudo sobre o {name} aqui vem do próprio site dele, <link>{checked}</link>.",
    byCountry:
      "O {name} mostra preços próprios para cada país; os que aparecem aqui são os que ele mostrou na Índia.",
    pricesChange: "Preços e planos mudam, então confira as <link>fontes</link>.",
    checkedOn: "conferido em {date}",
    asListed: "como listado em {month}",
    pickTitle: "Veja o que o {short} acha do seu currículo",
    pickText: "Revisar e comparar com uma vaga é grátis, sem cartão.",
    sources: "Fontes",
    pricing: "Preços do {brand}",
    pricesNote: "Preços em dólares americanos. Podem incidir impostos.",
    trademark:
      "{name} é uma marca do seu titular, citada aqui só para identificar o produto dele. Esta página não foi feita com o {name} nem tem o endosso dele. Viu algo desatualizado? Mande um e-mail para <link>{email}</link> e nós vamos conferir.",
    moreTitle: "Mais comparativos",
  },
} satisfies Translation<Messages["compare"]>;
