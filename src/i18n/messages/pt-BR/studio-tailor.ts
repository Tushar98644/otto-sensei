import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  cancel: "Cancelar",
  stages: {
    reading: "O Otto está lendo a vaga.",
    comparing: "O Otto está comparando a vaga com seu currículo.",
    writing: "O Otto está escrevendo suas linhas personalizadas.",
    still: "Ainda escrevendo. Vagas longas levam um pouco mais.",
  },
  otto: {
    intro: "Cole o link de uma vaga. Eu mostro o que ela pede e o que você já tem.",
    working: "Óculos no rosto. Leva até um minuto. Você pode sair desta etapa, eu continuo.",
    done: "Seu currículo personalizado está pronto. O original continua intacto.",
    cancelled: "Parei. Pode contar como 1 versão personalizada, porque eu já tinha começado.",
    screener: {
      noRequirements:
        "Não encontrei requisitos claros nesta vaga. Uma vaga mais completa funciona melhor.",
      niceOnly:
        "Esta vaga não tem requisitos obrigatórios. Seu currículo mostra {shown} de {total} desejáveis.",
      oneProven:
        "Seu currículo comprova o único requisito obrigatório. Os filtros conferem exatamente isso.",
      allProven:
        "Seu currículo comprova os {total} requisitos obrigatórios. Os filtros conferem um por um.",
      noneProven:
        "Ainda não encontro provas dos {total} requisitos obrigatórios. Vamos ver um por um.",
      someProven: {
        one: "Seu currículo comprova {proven} de {total} requisitos obrigatórios. Vamos ver o que falta.",
        other:
          "Seu currículo comprova {proven} de {total} requisitos obrigatórios. Vamos ver os outros {count}.",
      },
    },
  },
  free: {
    otto: "Aqui está cada habilidade que esta vaga pede e onde seu currículo mostra.",
    usage:
      "O Free mostra quais habilidades a vaga pede e onde você as mostra. Personalizar vem com o Pro.",
    title: "Personalizar no Pro vai além",
    note: "O Otto lê a vaga pelo sentido, não só pelas palavras. Ele coloca suas melhores linhas para esta vaga primeiro, escreve um resumo para ela e ajuda você a adicionar linhas para o que falta, com fatos que você dá. Tudo vai para um currículo personalizado, então o original continua igual.",
    already: "Já tem o Pro?",
    signIn: "Entrar",
  },
  left: "{left} de {limit} versões personalizadas restantes {period}.",
  pastedPost: "A vaga que você colou",
  empty: "Adicione um currículo primeiro",
  base: {
    title: "Personalizando uma cópia de “{title}”",
    note: "Este currículo já é personalizado, então vou trabalhar a partir do original de onde ele veio. Cada vaga tem a própria cópia.",
    fallback: "seu currículo original",
  },
  comparedWith: "Comparado com",
  changePost: "Trocar a vaga",
  startOver: "Recomeçar com outra vaga",
  stale: {
    freeTitle: "Esta verificação é da vaga que você comparou antes",
    freeNote: "Compare de novo para verificar a vaga como está agora.",
    title: "Estes resultados são da vaga que você enviou antes",
    note: "Compare de novo para atualizá-los com a vaga como está agora.",
  },
  savedJobFailed: "Não foi possível abrir essa vaga salva",
  errors: {
    signedOut: "Sua sessão foi encerrada. Entre de novo para continuar.",
    refused: "Não consigo trabalhar com essa vaga. Tente colar só a descrição da vaga.",
    badPost: "Essa vaga não foi enviada direito. Confira se é a vaga completa e tente de novo.",
  },
  row: {
    status: {
      proven: { label: "Comprovado", chip: "Comprovado" },
      listed: { label: "Listado, mas não comprovado", chip: "Listado, sem prova" },
      missing: { label: "Não aparece", chip: "Não aparece" },
      declined: { label: "Você disse que não", chip: "Você disse que não" },
    },
    newLine: "Sua nova linha, para o currículo personalizado",
    matchedByOtto: "encontrado pelo Otto",
    removeLine: "Remover linha",
    showLine: "Ver a linha",
    unproven:
      "Esta linha vai para o currículo personalizado, mas não cita {name}, então um filtro não vai contá-la.",
    showWhere: "Mostre onde você usou",
    yes: "Sim",
    no: "Não",
    staysOff: "Fica fora do seu currículo.",
    changeAnswer: "Mudar resposta",
  },
  addLine: {
    where: "Onde você fez isso?",
    what: "O que você fez?",
    whatHint: "Poucas palavras bastam. O Otto não adiciona nada que você não disse.",
    whatFirst: "Primeiro diga onde e o que você fez. Poucas palavras bastam.",
    placeholder: "Acompanhei duas pessoas novas no primeiro mês delas",
    placeholderWith: "Configurei nossos servidores de staging com {name}",
    noTarget:
      "Adicione primeiro um emprego ou projeto em Ajustar linhas e depois volte para adicionar esta linha.",
    write: "Escrever a linha",
    useMine: "Usar minhas palavras",
    cancel: "Cancelar",
    usesFix: "Escrever a linha usa 1 ajuste de linha.",
    newLine: "Sua nova linha",
    newLineHint: "Vai para o currículo personalizado, em {place}.",
    brackets: "Primeiro preencha ou apague o que está entre [colchetes].",
    nameIt: "Cite {name} na linha para que um filtro consiga encontrar.",
    claimsMore:
      "O Otto escreveu “{verb}”, que diz mais do que você disse. Mude se não estiver certo.",
    droppedHelp:
      "Você disse que ajudou; esta linha soa como se você tivesse feito sozinho. Coloque de volta se for mais justo.",
    add: "Adicionar esta linha",
    back: "Voltar",
  },
  results: {
    label: "Resultados da personalização",
    gone: "Esse currículo não existe mais",
    goneNote: "Escolha outro e tente de novo.",
    bestFirst: "Suas melhores linhas primeiro",
    bestFirstNote:
      "Linhas que comprovam um requisito obrigatório vão para o topo do emprego, onde os filtros e os recrutadores olham primeiro.",
    movedIn: {
      one: "As linhas sobem em {moved} de {count} emprego",
      other: "As linhas sobem em {moved} de {count} empregos",
    },
    tips: "Dicas para esta vaga",
    tipCount: { one: "{count} dica", other: "{count} dicas" },
  },
  copy: {
    title: "Seu currículo personalizado",
    picked: "Escolhido para esta vaga. Mude o que quiser abaixo. O original continua igual.",
    create: "Criar versão personalizada",
    ready: "Seu currículo personalizado está pronto",
    readyNote: "{title}. O original continua igual.",
    open: "Abrir a versão personalizada",
    another: "Criar outra",
    barReady: "Sua cópia para esta vaga está pronta: {title}.",
  },
  changes: {
    lines: {
      one: "Adiciona {count} linha que você confirmou",
      other: "Adiciona {count} linhas que você confirmou",
    },
    skills: {
      one: "Adiciona {count} habilidade à sua seção de Habilidades",
      other: "Adiciona {count} habilidades à sua seção de Habilidades",
    },
    reordered: {
      one: "Coloca suas melhores linhas primeiro em {count} emprego",
      other: "Coloca suas melhores linhas primeiro em {count} empregos",
    },
    summary: "Usa o novo resumo",
    inline: {
      lines: {
        one: "adiciona {count} linha que você confirmou",
        other: "adiciona {count} linhas que você confirmou",
      },
      skills: {
        one: "adiciona {count} habilidade à sua seção de Habilidades",
        other: "adiciona {count} habilidades à sua seção de Habilidades",
      },
      reordered: {
        one: "coloca suas melhores linhas primeiro em {count} emprego",
        other: "coloca suas melhores linhas primeiro em {count} empregos",
      },
      summary: "usa o novo resumo",
    },
    sentence: "A cópia {changes}. O original continua igual.",
    none: "Nenhuma mudança escolhida. A cópia mantém suas linhas como estão, com o nome desta vaga.",
  },
  lines: {
    title: "Suas linhas para esta vaga",
    shows: {
      one: "{count} linha mostra o que esta vaga pede",
      other: "{count} linhas mostram o que esta vaga pede",
    },
    weak: "{count} poderiam dizer melhor",
    unrelated: {
      one: "Mais {count} linha não mostra nada do que ela pede; pode ficar, mais abaixo.",
      other: "Mais {count} linhas não mostram nada do que ela pede; podem ficar, mais abaixo.",
    },
    must: "obrigatório",
    nice: "desejável",
    newLine: "Sua nova linha, para o currículo personalizado",
    couldBeBetter: "Pode melhorar:",
    showLine: "Ver a linha",
    fewer: "Ver menos",
    all: "Ver as {count} linhas",
  },
  top: {
    title: "O topo do seu currículo",
    note: "Um recrutador lê seu título e seu resumo antes de qualquer linha.",
    bothFit: "Seu título e seu resumo combinam com esta vaga",
    summaryFits: "Seu resumo combina com esta vaga",
    bothOff: "Seu título e seu resumo poderiam combinar melhor com esta vaga",
    titleOff: "Seu título poderia combinar melhor com esta vaga",
    summaryOff: "Seu resumo poderia combinar melhor com esta vaga",
    jobTitle: "Título profissional",
    summary: "Resumo",
    looksRight: ": está certo",
    couldBeBetter: ": pode melhorar",
    suggested: "Resumo sugerido",
    suggestedNote: "Escrito só com o que já está no seu currículo.",
    useSummary: "Usar este resumo",
    replaces: "Substitui seu resumo atual só no currículo personalizado.",
    fillsGap: "Seu currículo ainda não tem resumo, então este preenche a lacuna.",
  },
  screener: {
    eyebrow: "Visão do filtro de IA",
    none: "Esta vaga não tem requisitos claros",
    noneNote:
      "Ela não diz o que um candidato precisa. Uma vaga mais completa, com os requisitos, funciona melhor.",
    title: "Os requisitos, um por um",
    note: "Ferramentas como HiredScore e Ashby conferem cada requisito separadamente. Esta é essa conferência, feita às claras. Não é a nota exata de nenhuma ferramenta.",
    groups: { must: "Obrigatórios", nice: "Desejáveis" },
  },
  overview: {
    title: "Corrija isto primeiro para esta vaga",
    allShown: "Cada requisito obrigatório aparece em uma linha sobre o que você fez.",
    showLine: "Ver a linha",
    goTo: "Ir até lá",
    see: "Ver",
  },
  recent: {
    title: "Vagas recentes",
    saved: "Salva:",
    tailored: "Personalizada antes:",
    failed: "Não foi possível abrir essa vaga",
    failedNote: "Tente de novo daqui a pouco.",
  },
  system: {
    uses: "Esta vaga usa {system}",
    howItReads: "como ele lê você",
    notes: { one: "{count} nota sobre {system}", other: "{count} notas sobre {system}" },
    questions:
      "Perguntas deste formulário que podem ser configuradas para recusar você automaticamente",
    required: "Obrigatória",
    yesNo: "Sim ou não",
    choices: "{count} opções",
    answerTruthfully:
      "Não sei quais esta empresa usa. Responda com a verdade e sempre do mesmo jeito.",
  },
  kit: {
    title: "Candidate-se a esta vaga",
    meta: "Uma carta de apresentação e respostas para as perguntas do formulário",
    note: "Escrito só com seu currículo e esta vaga, em palavras simples. Você copia para onde precisar.",
    letterWritten: "Carta de apresentação escrita",
    answers: { one: "{count} resposta", other: "{count} respostas" },
  },
  letter: {
    title: "Carta de apresentação",
    words: "{count} palavras",
    about:
      "Cerca de 200 palavras: o cargo, seus fatos mais próximos e por que esta vaga. Só com seu currículo.",
    check: "Confira antes de enviar",
    copy: "Copiar",
    download: "Baixar PDF",
    rewrite: "Escrever uma nova",
    write: "Escrever uma carta de apresentação",
    pdfFailed: "Seu PDF não saiu",
    pdfFailedNote: "Tente de novo ou copie a carta.",
  },
  answers: {
    title: "Responder a uma pergunta da candidatura",
    question: "A pergunta",
    hint: "Com seu currículo e esta vaga. Confira cada frase antes de colar: o Otto nunca envia nada.",
    placeholder: "Por que você quer trabalhar aqui?",
    whole: "Cole a pergunta inteira do formulário, como “Por que você quer trabalhar aqui?”",
    draft: "Rascunhar uma resposta",
    remove: "Remover esta resposta",
    copy: "Copiar",
    words: "{count} palavras",
  },
  reorder: {
    moveUp: "Vamos subir estas linhas:",
    more: "E mais {count}.",
  },
  reasons: {
    places: {
      at: "{title} em {company}",
      line: "{place}, linha {number}",
      experience: "Experiência",
      project: "Projeto",
      education: "Formação",
      jobTitle: "Cargo",
      certifications: "Certificações",
      summary: "Resumo",
      skills: "Habilidades",
      skillsGroup: "Habilidades: {label}",
      headline: "Título profissional",
    },
    problems: {
      duty: "parece uma descrição de cargo",
      "no-result": "não diz o que mudou",
      "weak-start": "começa fraca",
      "stock-phrase": "usa um clichê",
      "first-person": "diz eu ou nós",
      tense: "está no presente para um emprego que você já deixou",
    },
    years: {
      one: " A vaga pede {asked}+ anos; as datas dos seus empregos somam cerca de {count} ano.",
      other: " A vaga pede {asked}+ anos; as datas dos seus empregos somam cerca de {count} anos.",
    },
    spelled:
      " A vaga diz “{term}” e a sua linha diz de outro jeito. Alguns sistemas só buscam as palavras exatas, então use “{term}” uma vez também.",
    added: "Sua linha nova mostra isso. Ela vai para o currículo personalizado.",
    onlyIn: "Só em {where}. Mostre também em uma linha sobre o que você fez.",
    onlyInPlaces: {
      jobTitle: "um cargo",
      certifications: "suas certificações",
      education: "sua formação",
      summary: "seu resumo",
    },
    shownOutside: "Aparece {where}, não em um emprego.",
    outsidePlaces: {
      project: "no seu projeto {name}",
      education: "na sua formação",
      other: "em {name}",
    },
    atWork: " Se você usou no trabalho, diga isso nesse emprego.",
    shownWithProblem: "Aparece em {where}, mas essa linha {problem}.",
    shownAt: "Aparece em uma linha em {where}.",
    declined: "Você disse que não tem.",
    otherForm:
      "Seu currículo diz “{written}”; a vaga diz “{asked}”. Buscas por palavra-chave só acham a forma digitada, então escreva as duas uma vez: “{both}”.",
    listed:
      "Só na sua {list}. Nenhuma linha de emprego mostra você usando isso, e os filtros procuram no que você fez.",
    lists: {
      headline: "linha de título profissional",
      skills: "lista de habilidades",
      group: "lista de habilidades ({group})",
    },
    missingMust: "A vaga pede isso, e nada no seu currículo diz isso ainda.",
    missingNice: "Um diferencial para esta vaga. Nada no seu currículo diz isso ainda.",
    lineNote: "Mostra {names} ({kind}). {next}",
    lineKinds: { must: "um requisito obrigatório", nice: "um requisito desejável" },
    keepNearTop: "Deixe perto do topo.",
    fixFirst: {
      missing: {
        one: "{count} requisito obrigatório não está no seu currículo: {names}",
        other: "{count} requisitos obrigatórios não estão no seu currículo: {names}",
      },
      missingReason: "Se você já fez, diga onde. Se não, diga não, e nada é adicionado.",
      listed: {
        one: "{count} requisito obrigatório só está na sua lista de habilidades: {names}",
        other: "{count} requisitos obrigatórios só estão na sua lista de habilidades: {names}",
      },
      listedReason:
        "Os filtros procuram isso em uma linha sobre o que você fez. Mostre onde você usou.",
      spelled: "A vaga diz “{asked}”; seu currículo diz “{written}”",
      spelledReason:
        "Buscas por palavra-chave só acham a forma digitada. Escreva as duas uma vez: “{both}”.",
      weak: {
        one: "{count} linha que mostra um requisito obrigatório está fraca",
        other: "{count} linhas que mostram requisitos obrigatórios estão fracas",
      },
      title: "Seu título profissional não cita esta vaga",
      noSummary: "Nenhum resumo no topo",
      summary: "Seu resumo não fala desta vaga",
    },
    headline: {
      must: "Requisitos obrigatórios comprovados: {proven} de {total}",
      nice: "Desejáveis: {proven} de {total}",
      join: " · ",
    },
    title: {
      headline: "Seu título profissional bate com o cargo da vaga, “{title}”.",
      latest: "Seu último cargo bate com o cargo da vaga, “{title}”.",
      missing:
        "O cargo da vaga é “{title}”. Se combina com você, coloque abaixo do seu nome. Recrutadores buscam por cargo.",
      differs:
        "O cargo da vaga é “{title}”; seu título profissional diz “{headline}”. Se a vaga combina com você, use esse cargo no título ou no resumo. Nunca mude o cargo de um emprego anterior.",
    },
    summary: {
      missing:
        "Você não tem resumo. Duas linhas no topo que citem esta vaga e o que você tem de mais parecido ajudam quem lê por cima.",
      names: "Seu resumo cita {what}.",
      theTitle: "o cargo",
      differs: "Seu resumo não cita esta vaga nem os requisitos obrigatórios dela.",
      suggest: " Você mostra {names} nas suas linhas; diga isso no topo também.",
    },
    targets: { aJob: "Um emprego", project: "Projeto: {name}", untitled: "sem nome" },
    asks: {
      used: "Você já usou {term}?",
      experience: "Você tem experiência com {phrase}?",
    },
  },
  skip: {
    note: "Sem uma vaga em mente? Baixe como está.",
    action: "Pular para Baixar",
  },
} satisfies Translation<Messages["studioTailor"]>;
