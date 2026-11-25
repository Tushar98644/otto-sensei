import type { Messages } from "..";
import type { Translation } from "../../types";

// The ATS guide pages around each system's sourced notes, in Brazilian Portuguese.
export default {
  topics: {
    titles: {
      file: "Como ele lê seu arquivo",
      search: "Como os recrutadores fazem buscas nele",
      screening: "Perguntas que podem eliminar você",
      ai: "Compatibilidade e ranqueamento por IA",
      review: "Como pessoas avaliam os candidatos",
    },
    phrases: {
      file: "como ele lê seu arquivo",
      search: "como os recrutadores fazem buscas nele",
      screening: "perguntas de triagem",
      ai: "compatibilidade por IA",
      review: "como pessoas avaliam os candidatos",
    },
    short: {
      file: "leitura do arquivo",
      search: "busca dos recrutadores",
      screening: "perguntas de triagem",
      ai: "compatibilidade por IA",
      review: "avaliação humana",
    },
  },
  meta: {
    index: {
      title: "Guias de ATS: como o software de recrutamento lê currículos",
      description:
        "Como {count} sistemas ATS, do Greenhouse e Workday ao Taleo, leem currículos, fazem a triagem e ranqueiam candidatos com IA. Cada nota traz o link da fonte.",
    },
    reads: "ATS {name}: como ele lê seu currículo",
    does: "ATS {name}: o que ele faz com sua candidatura",
  },
  headline: {
    reads: "Como o {name} lê seu currículo",
    does: "O que o {name} faz com sua candidatura",
  },
  description: {
    intros: {
      long: "O que o ATS {name} faz com sua candidatura: {topics}.",
      plain: "O que o {name} faz com sua candidatura: {topics}.",
      short: "O que o ATS {name} faz com sua candidatura: {short}.",
      brief: "Guia do ATS {name}: {short}.",
    },
    endings: {
      sourcedGeneral: "{sourced}, além de conselhos gerais para qualquer ATS.",
      sourcedAny: "{sourced}, além de conselhos para qualquer ATS.",
      briefGeneral: "{brief}, além de conselhos gerais para qualquer ATS.",
      briefAny: "{brief}, além de conselhos para qualquer ATS.",
      sourced: "{sourced}.",
      brief: "{brief}.",
    },
    sourced: {
      one: "Uma nota com fonte, com uma dica prática e a fonte dela",
      other: "{count} notas com fontes, cada uma com uma dica prática e a fonte dela",
    },
    brief: {
      one: "Uma nota com fonte e uma dica prática",
      other: "{count} notas com fontes e dicas práticas",
    },
  },
  sources: {
    on: "{label} sobre {topics}",
    nth: "{label} ({count})",
    covers: "sobre {topics}",
  },
  crumb: "Guias de ATS",
  index: {
    eyebrow: "Guias de ATS",
    title: "Como o software de recrutamento",
    titleEm: "lê seu currículo",
    intro:
      "Um sistema de rastreamento de candidatos (ATS) é o software que os empregadores usam para receber e organizar candidaturas a vagas. Veja o que o Otto descobriu sobre {count} deles, com um link para a página por trás de cada nota.",
    systems: "Sistemas de recrutamento",
    notes: "{count} notas com fontes",
    generalTitle: "Conselhos que valem para a maioria deles",
    generalIntro:
      "Estas dicas aparecem repetidas vezes nos sistemas acima. Cada guia traz os detalhes, e as fontes, de um sistema.",
  },
  guide: {
    eyebrow: "Guia de ATS",
    count: {
      one: "1 nota com fonte, com link para a página de onde ela vem.",
      other: "{count} notas com fontes, cada uma com link para a página de onde vem.",
    },
    setUp:
      "Os empregadores configuram o {name} de jeitos diferentes, então nem toda nota vale para toda vaga.",
    spotTitle: "Como saber se uma vaga usa o {name}",
    noFileNotes:
      "As notas do Otto ainda não cobrem como o {name} lê arquivos, então não há nada com fonte para mostrar aqui. Os <link>conselhos gerais</link> abaixo são um começo seguro.",
    whatToDo: "O que fazer:",
    optIn: "Só se o empregador ativar",
    source: "Fonte:",
    generalTitle: "Conselhos gerais para qualquer sistema de recrutamento",
    generalIntro:
      "Não são específicos do {name}. Estas dicas aparecem repetidas vezes nas notas que o Otto tem sobre {count} sistemas de recrutamento.",
    sourcesTitle: "Fontes",
    aside: "Próximos passos e mais guias",
    sideTitle: "Vai se candidatar pelo {name}?",
    sideText: "Veja quais habilidades da vaga seu currículo mostra. Grátis, sem login.",
    moreTitle: "Mais guias de ATS",
    templatesLink: "Modelos de currículo em uma coluna de texto real",
    compareLink: "Como o Otto se compara a outras ferramentas",
  },
  jobLink: {
    label: "Link da vaga",
    submit: "Comparar meu currículo com esta vaga",
    empty: "Cole o link de uma vaga e eu digo se ela usa o {name}.",
    unknown:
      "Não consigo identificar o sistema de recrutamento por este link. Os conselhos gerais abaixo continuam valendo.",
    same: "Esta vaga usa o {name}, então as notas desta página valem para ela.",
    other:
      "Esta vaga usa o {other}, não o {name}. O próprio guia dele tem as notas que valem para ela.",
    readGuide: "Ler o guia do {name}",
  },
} satisfies Translation<Messages["ats"]>;
