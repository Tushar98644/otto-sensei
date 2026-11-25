import type { Messages } from "..";
import type { Translation } from "../../types";

// The home page, in Brazilian Portuguese.
export default {
  meta: {
    title: "Revisor e criador de currículo ATS grátis com IA",
    description:
      "Revisor e criador de currículo ATS grátis com a ajuda da IA do Otto, além de vagas ranqueadas para o seu currículo, controle de candidaturas, preparação para entrevistas e um site de portfólio.",
  },
  cta: {
    check: "Revisar meu currículo",
    continueWith: "Continuar com {title}",
  },
  hero: {
    eyebrow: "Grátis para começar",
    title: "Toda a sua busca de emprego,",
    titleEm: "em <b>um só lugar</b>.",
    lead: {
      check: "Revise e corrija seu currículo, depois encontre vagas ranqueadas para ele.",
      track: "Acompanhe candidaturas, prepare-se para entrevistas, compartilhe um portfólio.",
    },
    featuresLabel: "O que o Otto faz",
    features: {
      checker: "Revisão de currículo",
      jobs: "{count} vagas abertas",
      jobsNoCount: "Vagas abertas",
      emailTracking: "Acompanhamento por e-mail",
      interviewPrep: "Preparação para entrevistas",
      portfolio: "Site de portfólio",
      extension: "Extensão para Chrome",
      extensionSoon: "Extensão para Chrome, em breve",
    },
    noSignup: "Não precisa se cadastrar. Seu arquivo é lido e depois apagado.",
    another: "Ou <link>revise outro arquivo</link>. Ele é lido e depois apagado.",
    jobPost: "Tem uma vaga em vista? <link>Confira sua compatibilidade</link>.",
  },
  demo: {
    see: "O que você vê",
    reads: "O que o software de recrutamento lê",
    views: { label: "Currículo de exemplo", see: "O que você vê", reads: "O que o software lê" },
    otto: "Otto, a lontra, espiando por cima da janela",
    plainText: "Texto simples",
    mixed: "Habilidades misturadas às experiências",
    captionTitle: "Currículo de exemplo",
    caption: "Colunas ficam bonitas para as pessoas. O software lê reto, atravessando todas elas.",
  },
  resume: {
    label:
      "Currículo de exemplo de {name}, designer de produto. Habilidades e idiomas ficam numa coluna à esquerda e o histórico profissional numa coluna à direita, com pequenos ícones ao lado do e-mail e do telefone dela.",
    role: "Designer de produto",
    headings: { skills: "Habilidades", languages: "Idiomas", experience: "Experiência" },
    skills: { research: "Pesquisa com usuários", prototyping: "Prototipagem" },
    languages: { english: "Inglês", spanish: "Espanhol" },
    jobs: {
      senior: {
        title: "Designer de produto sênior",
        dates: "2021 – atual",
        bullet: "Reformulei o checkout. Pedidos aumentaram 18%.",
      },
      designer: {
        title: "Designer de produto",
        dates: "2018 – 2021",
        bullet: "Criei o design system da equipe.",
      },
    },
  },
  upload: {
    opening: "Abrindo {name} no estúdio.",
    oneFile: "Escolha um arquivo por vez.",
    problems: {
      unsupported: "Esse tipo de arquivo não é aceito.",
      unsupportedKinds: "Esse tipo de arquivo não é aceito. Escolha um arquivo {kinds}.",
      kinds: "{first} ou {last}",
      empty: "Esse arquivo está vazio. Escolha outro.",
      tooBig: "Esse arquivo é grande demais. O limite é {limit}.",
    },
    drop: "Solte seu currículo aqui para revisá-lo",
    formats: "PDF ou Word (.docx), até {size}",
  },
  how: {
    eyebrow: "Como funciona",
    title: "Do arquivo antigo a um PDF limpo",
    intro: "Cinco passos. Pare depois de qualquer um deles.",
    step: "Passo {number} · {name}",
    steps: {
      upload: {
        name: "Enviar",
        caption: "Envie seu arquivo PDF ou Word, ou comece do zero.",
      },
      recruiterView: {
        name: "Visão do recrutador",
        caption:
          "Veja o texto que o software de recrutamento extrai, com verificações simples e o motivo de cada uma.",
      },
      fix: {
        name: "Ajuste linhas com o Otto",
        caption:
          "O Otto pergunta o fato que falta e escreve a linha a partir da sua resposta. Digite ou fale. Ele nunca inventa números, e você mantém, edita ou descarta cada sugestão.",
      },
      tailor: {
        name: "Personalize para uma vaga",
        caption: "Cole uma vaga para ver quais palavras-chave você tem e quais estão faltando.",
      },
      download: {
        name: "PDF grátis",
        caption:
          "Baixe um PDF limpo de graça e revise de novo. Todos os formatos são lidos de cima para baixo, com os títulos em linhas próprias, em papel Carta ou A4.",
      },
    },
    upload: { meta: "PDF · 1 página", reading: "Lendo seu arquivo" },
    checks: {
      meta: { one: "{count} verificação", other: "{count} verificações" },
      items: {
        columns: {
          title: "Layout em duas colunas",
          detail: "Suas habilidades se misturaram ao seu histórico profissional.",
        },
        icons: {
          title: "Ícones na linha de contato",
          detail: "Eles viram símbolos soltos. Palavras simples funcionam melhor.",
        },
        contact: {
          title: "E-mail e telefone encontrados",
          detail: "Os recrutadores conseguem falar com você.",
        },
      },
    },
    fixer: {
      addNumber: "Adicione um número",
      before: "Antes: ",
      line: "Responsável por gerenciar as contas de redes sociais",
      questions: "1 pergunta",
      question: "Quanto cresceram os seguidores?",
      you: "Você",
      saidOutLoud: "Dito em voz alta",
      answer: "Triplicaram em 6 meses. Eu postava vídeos curtos todos os dias.",
      looksGood: "Ficou bom",
      after: "Depois: ",
      fixed:
        "Aumentei em 3x os seguidores nas redes sociais em 6 meses, postando vídeos curtos todos os dias",
      updated: "Linha atualizada",
    },
    tailor: {
      jobPost: "Vaga",
      jobTitle: "Designer de produto sênior",
      onResume: "No seu currículo",
      missing: "Faltando",
      onlyIfTrue: "· adicione só se for verdade",
      terms: { accessibility: "Acessibilidade", abTesting: "Testes A/B" },
    },
    download: {
      before: "Antes",
      beforeText: "problemas no arquivo antigo",
      after: "Depois",
      afterText: "problemas no seu novo PDF",
    },
  },
  jobs: {
    eyebrow: "Vagas · novas todo dia",
    title: "{count} vagas abertas, ranqueadas para o seu currículo",
    titleNoCount: "Vagas abertas, ranqueadas para o seu currículo",
    intro:
      "O Otto lê as páginas de carreiras das empresas todos os dias e mostra só vagas da sua área, as mais compatíveis primeiro, com um motivo claro para cada uma. O Free mostra as suas {free} melhores; o Pro compara você com todas.",
    caption:
      "A página Vagas de verdade: um representante de vendas com estágio em marketing digital escolhe “Qualquer cargo de marketing”, e o Otto ranqueia vagas de marketing de nível inicial pelo SEO, Google Ads e HubSpot do currículo dele.",
    points: {
      matched: {
        title: "O seu tipo de trabalho, comparado ao seu currículo",
        text: "O Otto entende o que cada cargo significa: quem é engenheiro de software vê vagas de desenvolvedor backend, mas não de suporte ou de vendas. Cada vaga mostra o que seu currículo tem e o que falta nele.",
      },
      visa: {
        title: "Visto e direito de trabalho, verificados",
        text: "No Pro, diga ao Otto onde você pode trabalhar: as vagas que dizem não poder contratar você ficam marcadas, e uma chave as oculta. Empresas que estão nos registros públicos de patrocinadores de visto H-1B dos EUA e do Reino Unido aparecem indicadas.",
      },
      role: {
        title: "O cargo, o nível e o lugar que você quer",
        text: "Escolha um cargo, um nível e um lugar, ou só remoto. Para começar, o Otto deduz tudo isso do seu currículo.",
      },
      direct: {
        title: "Direto da empresa",
        text: "As vagas vêm das páginas de carreiras das próprias empresas e de feeds públicos de vagas dos EUA, do Reino Unido, da Austrália, da América Latina, da Europa e de outros lugares, lidos todos os dias. Cada uma tem o link do anúncio original.",
      },
    },
    link: "Ver minhas vagas compatíveis",
  },
  emailTracking: {
    eyebrow: "Acompanhamento por e-mail · Pro",
    title: "Suas candidaturas se atualizam sozinhas",
    intro:
      "Os e-mails dos processos seletivos já dizem em que pé está cada candidatura. Encaminhe-os para o Otto uma vez, e seu quadro se mantém em dia sem você arrastar um único card.",
    caption:
      "O quadro de verdade enquanto chegam três e-mails: o agradecimento da Northwind adiciona a vaga, o convite da Brightloop a move para Em entrevista com a data, e a atualização da Acme a encerra.",
    points: {
      setup: {
        title: "Configure uma vez, no Gmail",
        text: "Você ganha seu próprio endereço do Otto e um filtro do Gmail que encaminha para ele só os e-mails de vagas. Três passos, alguns minutos, com um teste no final.",
      },
      board: {
        title: "O quadro anda sozinho",
        text: "Um agradecimento adiciona a vaga a Enviadas, um convite para entrevista ou teste a move para Em entrevista com a data, e ofertas e recusas vão para o lugar certo. Um card nunca volta para trás.",
      },
      rules: {
        title: "Lido por regras, guardando pouco",
        text: "O Otto lê cada e-mail com regras fixas, sem IA, e guarda só o domínio do remetente, o assunto e o que encontrou. E-mails que ele não consegue verificar esperam por você numa lista “Para conferir”.",
      },
    },
  },
  interviewPrep: {
    eyebrow: "Preparação para entrevistas · Pro",
    title: "Saiba o que vão perguntar,",
    titleEm: "e o que você vai responder.",
    intro:
      "Para cada entrevista, o Otto lê a vaga e seu currículo e monta um kit de preparação só para aquela vaga. Depois você pratica em voz alta, com o Otto fazendo as perguntas.",
    caption:
      "Um kit de verdade para uma entrevista de designer de produto na Northwind: as perguntas prováveis, uma história do currículo, a rodada sobre o ofício de design e o modo de prática.",
    points: {
      questions: {
        title: "Perguntas prováveis, rodada por rodada",
        text: "Da abertura ao encerramento, cada pergunta diz o que o entrevistador está avaliando, os pontos que você deve abordar e a pergunta seguinte que pode vir. Depois vêm perguntas para você fazer a eles.",
      },
      stories: {
        title: "Histórias das suas próprias linhas",
        text: "Cada história parte de uma linha do seu currículo, contada como situação, tarefa, ação e resultado. O que seu currículo não diz fica em branco para você preencher, nunca é inventado.",
      },
      craft: {
        title: "Uma rodada sobre o seu ofício, depois a prática",
        text: "Cargos técnicos têm uma rodada técnica sobre seus projetos, conceitos essenciais e design de sistemas. Designers e gerentes de produto têm uma sobre o próprio ofício. Depois o Otto faz o papel de entrevistador, uma pergunta por vez.",
      },
    },
    also: {
      title: "Também no Otto",
      letters: {
        label: "Cartas",
        text: "Cartas de apresentação, mensagens de contato e respostas a perguntas de candidatura, escritas só a partir do seu currículo e da vaga.",
      },
      careerLog: {
        label: "Diário de carreira",
        text: "Uma nota de um minuto sobre o seu trabalho todo mês, grátis em todos os planos. No Pro, o Otto transforma as notas em linhas de currículo com os seus próprios números.",
      },
    },
  },
  extension: {
    eyebrow: "Otto para Chrome",
    eyebrowSoon: "Otto para Chrome · em breve",
    title: "Candidate-se mais rápido, direto da vaga",
    intro:
      "Veja sua compatibilidade antes de ler a vaga inteira, salve-a no seu quadro com um clique e deixe o Otto preencher longos formulários de candidatura com o seu currículo. Você confere cada resposta e clica em Enviar.",
    onPost: "Na vaga",
    onForm: "No formulário de candidatura",
    points: {
      badge: {
        title: "Um selo de compatibilidade na vaga",
        text: "No LinkedIn, no Naukri e nas páginas de carreiras das empresas, o selo do Otto mostra quais habilidades da vaga seu currículo tem e quais faltam. A verificação roda no seu navegador e nunca envia a vaga para lugar nenhum.",
      },
      save: {
        title: "Salve no seu controle de candidaturas",
        text: "Salvar coloca a vaga em A candidatar no seu quadro de Candidaturas, com uma cópia do anúncio caso ele saia do ar.",
      },
      tailor: {
        title: "Personalizar e Carta a partir da vaga",
        text: "Com {plans}, Personalizar abre o Otto com seu currículo personalizado para aquela vaga, e Carta, com uma carta de apresentação para ela.",
      },
      fill: {
        title: "Preencher com o Otto em formulários de candidatura",
        text: "Com {plans}, o Otto preenche formulários do Greenhouse, Lever, Ashby e Workday com seu currículo e suas respostas salvas. Você confere e clica em Enviar. O Otto nunca preenche perguntas de autoidentificação ou de consentimento.",
      },
    },
    post: {
      label:
        "Exemplo: o selo do Otto no canto de uma vaga de {title}, com {found} de {total} habilidades encontradas e {missing} faltando.",
      title: "Designer de produto sênior",
      where: "Remoto, Europa",
      careers: "Trabalhe na {company}",
      meta: "Vaga",
      about: "Sobre a vaga",
      bring: "O que esperamos de você",
      found: "de <b>{total}</b> habilidades encontradas",
      missing: "Falta: <b>{skill}</b>",
      skill: "acessibilidade",
      actions: { save: "Salvar", tailor: "Personalizar", letter: "Carta" },
    },
    form: {
      label:
        "Exemplo: Preencher com o Otto no formulário de candidatura da {company}, com {filled} campos preenchidos, o currículo anexado, uma resposta redigida para “{question}” e a pergunta de gênero deixada em branco para você.",
      window: "{company} · Candidatura",
      meta: "Formulário de candidatura",
      heading: "Candidate-se a esta vaga",
      fields: {
        firstName: "Nome",
        lastName: "Sobrenome",
        email: "E-mail",
        company: "Empresa atual",
        portfolio: "Portfólio",
      },
      resume: "Currículo/CV",
      question: "Por que a {company}?",
      answer:
        "Gosto de como a {company} torna dados complexos fáceis de ler, e eu traria esse mesmo cuidado para o produto, da pesquisa aos protótipos.",
      draft: "Redigir com o Otto",
      selfId: "Autoidentificação voluntária",
      gender: "Gênero",
      select: "Selecione…",
      submit: "Enviar candidatura",
      filled: "{count} campos preenchidos e <b>{file}</b> anexado.",
      leftForYou:
        "Ficou para você: 1 pergunta de autoidentificação ou de consentimento. O Otto nunca responde a essas.",
      checkEvery:
        "Confira cada resposta e depois clique em Enviar você mesmo. O Otto nunca envia um formulário.",
    },
    addToChrome: "Adicionar ao Chrome",
    newTab: "(abre em uma nova aba)",
    comingSoon: "Em breve",
    notInStore: "Ainda não está na Chrome Web Store.",
  },
  portfolio: {
    eyebrow: "Portfólio · hospedado para você",
    title: "Um portfólio de verdade,",
    titleEm: "no ar no seu próprio link.",
    intro:
      "Não é o seu currículo virando página da web. Escolha um de {count} designs e o Otto o preenche com seus projetos, experiências, textos e links. Nós hospedamos, então não há nada para configurar. {offer}",
    offer: "Vem com o Pro.",
    offerTrial: "Vem com o Pro, e você pode começar com um teste de {days} dias.",
    templates: {
      paper:
        "Desenhado à mão: seu nome em marcador sobre uma raposa à beira-mar, cards em nanquim e sublinhados ondulados, de dia ou de noite.",
      gazette:
        "Sua página como um jornal de 1926: um cabeçalho em letra gótica, sua manchete, colunas com fios e um letreiro de notícias.",
      reel: "Um título enorme girando sobre uma esfera 3D, e depois cada projeto na moldura de um dispositivo.",
    },
    link: "Criar meu portfólio",
  },
  wontDo: {
    title: "O que o Otto não vai fazer",
    pledges: {
      score: {
        claim: "Inventar uma nota.",
        reason:
          "Você recebe verificações claras, com motivos, e não um número misterioso de 0 a 100.",
      },
      numbers: {
        claim: "Inventar seus números.",
        reason: "O Otto pede seus números e resultados reais, e você aprova cada mudança.",
      },
      download: {
        claim: "Cobrar para você baixar.",
        reason: "Edite e baixe quantos PDFs quiser. Sem paywall no último passo.",
      },
      file: {
        claim: "Guardar seu arquivo.",
        reason:
          "Lemos o que você envia para extrair o texto e depois descartamos o arquivo. Seus currículos ficam no seu navegador, a menos que você entre na sua conta para fazer backup. <link>Como tratamos os dados</link>",
      },
    },
  },
  pricingTeaser: {
    eyebrow: "Preços",
    title: "Grátis para o básico.",
    titleEm: "Mais quando a busca aperta.",
    free: "<b>{plan}:</b> revise, corrija e baixe {resumes} em PDF, com {fixes} ajustes de linha por mês do Otto.",
    pro: "<b>{plan}, {price} por mês:</b> personalização, cartas de apresentação, todas as vagas compatíveis, até {resumes} e {applications}. {close}",
    resumes: { one: "{count} currículo", other: "{count} currículos" },
    trackedApplications: {
      one: "{count} candidatura acompanhada",
      other: "{count} candidaturas acompanhadas",
    },
    trial: "Experimente {days} dias por {price}.",
    link: "Ver preços",
  },
  faq: {
    title: "Antes de começar",
    applications: { one: "{count} candidatura", other: "{count} candidaturas" },
    items: {
      free: {
        question: "Baixar é grátis mesmo?",
        answer:
          "Sim. Editar, as verificações do recrutador e os downloads em PDF são grátis, sem paywall no último passo, e o Free inclui {fixes} ajustes de linha por mês com o Otto. O Pro e o Max somam o resto da ajuda de IA do Otto, mais formatos, mais currículos e downloads em Word.",
      },
      ats: {
        question: "O que é um ATS?",
        answer:
          "Um sistema de rastreamento de candidatos (applicant tracking system): o software que a maioria dos empregadores usa para receber e organizar candidaturas. Ele lê o texto do seu arquivo, e layouts elaborados podem embaralhar esse texto. O Otto mostra exatamente o que ele lê.",
      },
      invent: {
        question: "O Otto vai inventar coisas no meu currículo?",
        answer:
          "Não. O Otto pede fatos, como números e resultados, e só usa o que você conta para ele. Você revisa cada mudança antes de ela entrar no seu currículo.",
      },
      talk: {
        question: "Posso falar em vez de digitar?",
        answer:
          "Sim. As caixas onde você escreve para o Otto têm um microfone, inclusive nas perguntas do Otto quando ele ajusta uma linha. Aperte e fale, depois aperte de novo quando terminar. Funciona em qualquer navegador moderno. Em alguns navegadores, como Brave e Firefox, você precisa estar logado. O Otto guarda só o texto.",
      },
      account: {
        question: "Preciso de uma conta?",
        answer:
          "Não para revisar, editar ou baixar. Os backups e os {fixes} ajustes de linha por mês do Otto precisam de uma conta grátis: entre com o Google ou com um código de 6 dígitos enviado por e-mail, sem senha. O resto da ajuda de IA do Otto, a lista completa de vagas compatíveis (o Free mostra as {matches} mais próximas) e acompanhar mais de {applications} vêm com o {pro}. {trialHeadline}: {trialSentence}",
      },
      data: {
        question: "Onde meus dados ficam guardados?",
        answer:
          "Seus currículos ficam salvos no seu navegador. Se você entrar na sua conta, também guardamos um backup para você abri-los em qualquer dispositivo. Lemos os arquivos enviados para extrair o texto e depois os descartamos. Os detalhes estão na nossa <link>política de privacidade</link>.",
      },
      cancel: {
        question: "Posso cancelar quando quiser?",
        answer:
          "Sim. Cancele seu plano na página da sua conta quando quiser. Você continua com ele até o fim do período que pagou, e não é cobrado de novo.",
      },
      anyJob: {
        question: "Funciona para qualquer vaga?",
        answer:
          "Sim, do primeiro emprego a cargos de nível sênior, em qualquer área. A personalização funciona com qualquer vaga que você colar. O Otto lê melhor currículos escritos em inglês. Os <link>exemplos de currículo</link> mostram {count} cargos, de recém-formados a vendas.",
      },
    },
  },
  finalCta: {
    otto: "Otto, a lontra, lendo um currículo",
    title: "Veja o que o software vê.",
    note: "Revisar e baixar PDFs é grátis. O Pro e o Max somam mais ajuda do Otto.",
  },
} satisfies Translation<Messages["home"]>;
