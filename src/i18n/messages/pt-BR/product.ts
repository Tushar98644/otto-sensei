import type { Messages } from "..";
import type { Translation } from "../../types";

// Product and tool pages, in Brazilian Portuguese.
export default {
  common: {
    breadcrumb: "Trilha de navegação",
    home: "Início",
    howItWorks: "Como funciona",
    questions: "Perguntas",
    keepReading: "Continue lendo",
    seePlan: "Veja o que o {pro} inclui",
    trialFor: "{headline} pagando {price}.",
    checkButtons: { match: "Comparar meu currículo com uma vaga", check: "Revisar meu currículo" },
  },
  related: {
    examples: {
      title: "Exemplos de currículo",
      text: "{count} exemplos completos por cargo, cada um com linhas mais fortes, habilidades e erros comuns.",
    },
    templates: {
      title: "Modelos de currículo",
      text: "{count} formatos, cada um com uma coluna de texto real. {free} são grátis.",
    },
    jobMatch: {
      title: "Verificação de compatibilidade",
      text: "Cole seu currículo e uma vaga para ver quais das habilidades dela você mostra. Grátis, sem login.",
    },
    ats: {
      title: "Guias de ATS",
      text: "Notas com fontes sobre {count} sistemas de recrutamento: como eles leem arquivos, fazem a triagem de candidatos e os ranqueiam com IA.",
    },
    compare: {
      title: "Compare o Otto Sensei",
      text: "Como o Otto se diferencia de {names}, com base nas páginas de cada produto.",
    },
    coverLetters: {
      title: "Gerador de carta de apresentação com IA",
      text: "Cartas de apresentação, mensagens de contato e respostas a perguntas de candidatura, a partir do seu currículo e da vaga.",
    },
    tracker: {
      title: "Controle de candidaturas",
      text: "Suas candidaturas em um só quadro, com o currículo que você enviou, lembretes de retorno e datas de entrevista.",
    },
    interviewPrep: {
      title: "Preparação para entrevistas com IA",
      text: "Perguntas prováveis, histórias das suas próprias linhas do currículo e perguntas para você fazer, para cada entrevista.",
    },
    portfolio: {
      title: "Criador de site de portfólio",
      text: "Um site de portfólio feito a partir do seu currículo em um de {count} designs, hospedado no seu próprio link.",
    },
  },
  builder: {
    meta: {
      title: "Criador de currículo grátis com IA e verificação de ATS",
      description:
        "Crie seu currículo de graça: comece do zero ou de um arquivo, veja o texto que o software de recrutamento lê, ajuste linhas fracas com a ajuda da IA do Otto e baixe um PDF limpo.",
    },
    crumb: "Criador de currículo",
    eyebrow: "Criador de currículo grátis",
    title: "Um criador de currículo",
    titleEm: "que mostra o que o software lê.",
    intro:
      "Comece de um arquivo, de uma página em branco ou de um exemplo. O Otto verifica cada linha, mostra o texto que o software de recrutamento extrai do seu arquivo, e o PDF é grátis para baixar.",
    action: "Criar meu currículo",
    seeExamples: "Ver exemplos de currículo",
    stepsTitle: "Como o Otto cria e revisa um currículo",
    stepsIntro:
      "Cinco passos no estúdio. Pare depois de qualquer um; seu currículo vai sendo salvo no seu navegador.",
    steps: {
      start: {
        title: "Comece com o que você tem",
        text: "Envie um arquivo PDF ou Word, importe a exportação de dados do LinkedIn ou um arquivo JSON Resume, comece de uma página em branco ou abra um dos <link>exemplos de currículo</link>. Com o {pro}, o Criar com o Otto escreve um primeiro rascunho a partir de algumas respostas sobre seus empregos.",
      },
      read: {
        title: "Veja o que o software de recrutamento lê",
        text: "A visão do recrutador mostra o texto que um sistema de recrutamento extrai do seu arquivo, na ordem, com verificações simples de dados de contato, títulos, colunas, tabelas, ícones, datas e tamanho. Cada problema vem com o motivo.",
      },
      fix: {
        title: "Ajuste linhas fracas com o Otto",
        text: "A verificação de linhas do Otto marca linhas que parecem lista de tarefas, não têm resultado ou se apoiam em frases feitas. Peça para ele ajustar uma, e ele primeiro pergunta o fato que falta e depois escreve a linha a partir da sua resposta. Você mantém, edita ou descarta cada sugestão. O {free} inclui {fixes} ajustes de linha por mês.",
      },
      match: {
        title: "Compare com uma vaga",
        text: "Cole uma vaga ou o link dela para ver quais habilidades ela cita, quais seu currículo mostra e quais faltam. A <link>verificação de compatibilidade</link> funciona sem login. Com o {pro}, o Otto personaliza uma cópia do seu currículo para a vaga.",
      },
      download: {
        title: "Baixe um PDF limpo",
        text: "Escolha um formato e papel Carta ou A4, depois baixe. Todos os formatos têm uma coluna de texto real, testada lendo o PDF de volta. {freeFormats} são grátis, sem limite de downloads; os outros {proFormats} formatos e os downloads em Word vêm com o {pro}.",
      },
    },
    plans: {
      title: "O que é grátis, e o que o {pro} adiciona",
      intro:
        "Preços em dólares americanos. Podem incidir impostos. O {max} custa {price} por mês, para mais ajuda do Otto a cada mês.",
      freeCta: "Criar meu currículo",
      freeNote: "Sem cartão",
      paidCta: "Ver o {pro} e o {max}",
      cancelAnytime: "Cancele quando quiser",
    },
    audiencesTitle: "Para quem é",
    audiences: {
      freshers: {
        title: "Recém-formados e estudantes",
        text: "Coloque a Formação primeiro, escreva projetos como se fossem empregos e limite tudo a uma página. O <link>exemplo para recém-formados</link> mostra o formato para um B.Tech ou qualquer outra graduação, e revisar e baixar PDFs não custa nada.",
      },
      changing: {
        title: "Mudando de emprego",
        text: "Envie o currículo que você tem. A visão do recrutador mostra o que corrigir primeiro, e a verificação de compatibilidade mostra quais habilidades a próxima vaga pede que seu currículo ainda não mostra.",
      },
      abroad: {
        title: "Vagas no exterior",
        text: "Escolha papel Carta para os EUA e o Canadá, e A4 para a maioria dos outros lugares. Deixe de fora foto, data de nascimento e estado civil, e escreva valores na moeda do empregador.",
      },
      many: {
        title: "Candidaturas a muitas vagas",
        text: "O {pro} guarda uma cópia personalizada para cada vaga, escreve cartas de apresentação e respostas a perguntas de candidatura, e acompanha até {tracked} candidaturas com lembretes de retorno.",
      },
    },
    indiaTitle: "Currículos para vagas na Índia",
    indiaIntro:
      "CTC, aviso prévio, Naukri e os hábitos de biodata dos modelos antigos: onde cada um entra e o que deixar de fora.",
    india: {
      ctc: {
        title: "Deixe o CTC fora do currículo",
        text: "Recrutadores pedem o CTC atual e o esperado no formulário de candidatura, no seu perfil do Naukri ou na primeira ligação. Deixe isso fora da página, para que um só currículo sirva para todas as candidaturas. Com o {pro}, quando o Otto redige uma resposta a uma pergunta sobre salário, ele deixa um espaço em branco para você preencher.",
      },
      notice: {
        title: "Informe seu aviso prévio onde ele for pedido",
        text: "Coloque no formulário de candidatura ou na sua mensagem de apresentação, não abaixo do seu nome. O Otto nunca chuta esse dado: com o {pro}, uma resposta redigida que precise do seu aviso prévio ganha um espaço em branco entre colchetes para você preencher.",
      },
      naukri: {
        title: "Conte a mesma história no Naukri",
        text: "Envie o PDF que você baixar aqui para o seu perfil do Naukri e use no perfil o mesmo cargo e as mesmas principais habilidades do currículo. Assim, um recrutador que encontrar você lá vê a mesma história duas vezes.",
      },
      biodata: {
        title: "Deixe de lado os dados de biodata antigos",
        text: "Foto, data de nascimento, estado civil, nome do pai e uma declaração assinada vêm de modelos antigos. A maioria dos empregadores não pede isso, e os formatos do Otto não têm lugar para foto.",
      },
      marks: {
        title: "Mostre suas notas enquanto elas importam",
        text: "Para recém-formados, o CGPA e as notas do Class XII ainda contam, porque muitas vagas de campus e de trainee definem uma nota mínima. Depois de alguns anos de trabalho, o curso e a faculdade bastam.",
      },
    },
    examplesTitle: "Comece de um exemplo",
    examplesIntro:
      "Cada um é um currículo completo que você pode abrir no estúdio e adaptar para você. <link>Veja todos os {count} exemplos</link>.",
    faq: {
      free: {
        question: "Este criador de currículo é grátis mesmo?",
        answer:
          "Sim. Criar, revisar e baixar um currículo em PDF é grátis, em {freeFormats}, sem limite de downloads e sem cartão. O {free} também inclui {fixes} ajustes de linha por mês do Otto. O {pro} custa {price} por mês, com personalização, cartas de apresentação, todos os formatos e downloads em Word.",
      },
      ai: {
        question: "É um criador de currículo com IA?",
        answer:
          "Sim, com limites de propósito. A IA do Otto ajusta linhas, personaliza currículos e escreve cartas de apresentação, mas só a partir dos fatos que você dá: ele pede números em vez de inventá-los, e você aprova cada mudança. A visão do recrutador e a verificação de linhas são regras simples, não IA.",
      },
      ats: {
        question: "Meu currículo vai passar por um ATS?",
        answer:
          "Ninguém pode prometer isso, porque cada empregador configura seu sistema de recrutamento de um jeito. O Otto mostra o texto que um sistema extrai do seu arquivo e aponta o que costuma dar errado, como colunas, tabelas, ícones e caixas de texto. Os <link>guias de ATS</link> mostram o que se sabe sobre o funcionamento dos sistemas mais comuns.",
      },
      freshers: {
        question: "Serve para recém-formados?",
        answer:
          "Sim. Comece do exemplo para recém-formados ou de uma página em branco, coloque a Formação primeiro e limite tudo a uma página. {freeFormats} são grátis e combinam com um primeiro currículo.",
      },
      ctc: {
        question: "Devo colocar meu CTC e meu aviso prévio no currículo?",
        answer:
          "Não. Informe esses dados quando um formulário de candidatura, um recrutador ou seu perfil do Naukri pedir. Um currículo sem eles serve para todas as candidaturas, e esses números mudam com mais frequência do que o seu trabalho.",
      },
      signUp: {
        question: "Preciso me cadastrar?",
        answer:
          "Não para criar, revisar ou baixar: seu currículo fica salvo no seu navegador. Uma conta grátis faz o backup dele e ativa os {fixes} ajustes de linha por mês do Otto. Entre com o Google ou com um código enviado por e-mail, sem senha.",
      },
      paper: {
        question: "Carta ou A4?",
        answer:
          "Os dois estão disponíveis. Escolha Carta para vagas nos EUA e no Canadá, e A4 para Índia, Reino Unido, Europa e a maioria dos outros lugares. Suas palavras continuam as mesmas em qualquer um.",
      },
      word: {
        question: "Posso baixar meu currículo em Word?",
        answer:
          "Os downloads em Word (.docx) vêm com o {pro}. No {free}, os downloads são em PDF, quantos você quiser. <link>Ver preços</link>.",
      },
    },
    closing: {
      otto: "Otto, a lontra, lendo um currículo",
      title: "Crie, revise e baixe.",
      cta: "Criar meu currículo",
      note: "Grátis, e sem precisar de conta.",
    },
  },
  coverLetters: {
    meta: {
      title: "Gerador de carta de apresentação com IA a partir do seu currículo",
      description:
        "O Otto escreve cartas de apresentação, mensagens de contato e respostas de candidatura a partir do seu currículo e da vaga, e aponta qualquer linha que ele não consiga sustentar. Vem com o {pro}.",
    },
    crumb: "Gerador de carta de apresentação",
    eyebrow: "Cartas de apresentação · {pro}",
    title: "Um gerador de carta de apresentação com IA",
    titleEm: "que se atém aos seus fatos.",
    action: "Escrever uma carta de apresentação",
    planNote:
      "Vem com o {pro}, {price} por mês para {letters} cartas, mensagens, respostas e preparações para entrevistas.",
    check: {
      title: "Confira a compatibilidade antes de escrever",
      text: "Uma carta funciona melhor quando seu currículo já mostra o que a vaga pede. A verificação de compatibilidade e a visão do recrutador são grátis, sem cartão.",
    },
    closing: {
      title: "Uma carta para cada vaga, a partir do seu próprio currículo.",
      art: "Otto, a lontra, apontando para uma carta",
    },
    intro:
      "Cole uma vaga ou o link dela. O Otto escreve a carta de apresentação a partir dessa vaga e do seu currículo, e aponta o que você deve conferir antes de enviar.",
    featuresTitle: "O que o Otto escreve para você",
    features: {
      letter: {
        title: "Uma carta de apresentação para cada vaga",
        text: "Três parágrafos curtos: a vaga e o seu melhor fato para ela, dois ou três resultados que combinam com o que a vaga mais pede, e depois por que essa vaga. A saudação e a despedida são adicionadas para você.",
      },
      answers: {
        title: "Respostas a perguntas de candidatura",
        text: "Cole uma pergunta como “Por que você quer trabalhar aqui?” e o Otto responde a partir do seu currículo. Tudo o que só você sabe, como data de início ou salário, vira um espaço em branco entre colchetes para você preencher.",
      },
      outreach: {
        title: "Contatos, acompanhamentos e agradecimentos",
        text: "Um e-mail curto e uma mensagem no LinkedIn para alguém da empresa, uma mensagem de acompanhamento quando uma candidatura fica sem resposta e um agradecimento depois de uma entrevista.",
      },
      facts: {
        title: "Nada inventado",
        text: "O Otto escreve só a partir do seu currículo e da vaga. Se um rascunho tiver um número que seu currículo não tem, um verbo mais forte do que o da sua linha ou uma frase feita, ele aponta para você conferir.",
      },
      style: {
        title: "Seu tom, sua ortografia",
        text: "Escolha um tom ({tones}), um tamanho padrão ou mais curto, e ortografia americana ou britânica. Defina uma vez e todas as cartas seguem essa escolha.",
      },
      send: {
        title: "Pronta para enviar",
        text: "Copie, abra como e-mail ou baixe como arquivo PDF ou Word. Cada uma fica guardada com a vaga para a qual foi escrita.",
      },
    },
    steps: {
      job: {
        title: "Escolha a vaga",
        text: "Escolha uma vaga que você salvou, uma candidatura do seu quadro ou uma cópia personalizada do seu currículo. Ou cole uma vaga ou o link dela.",
      },
      kind: {
        title: "Escolha o que escrever",
        text: "Uma carta de apresentação, uma resposta a uma pergunta de candidatura ou uma mensagem de contato. O Otto escreve a partir do seu currículo e da vaga.",
      },
      send: {
        title: "Confira e envie",
        text: "Leia o rascunho, corrija o que o Otto apontou e depois copie, envie por e-mail ou baixe.",
      },
    },
    faq: {
      free: {
        question: "O gerador de carta de apresentação com IA é grátis?",
        answer:
          "Ele vem com o {pro} e o {max}. O {pro} custa {price} por mês e inclui {letters} por mês, somando cartas de apresentação, mensagens de contato, respostas e preparação para entrevistas. No {free}, revisar e editar seu currículo e baixar PDFs continuam grátis. <link>Ver todos os planos</link>.",
      },
      madeUp: {
        question: "O Otto vai inventar coisas?",
        answer:
          "Não. Ele escreve só a partir do seu currículo e da vaga, e depois confere o rascunho com os dois. Um número que seu currículo não tem, um verbo mais forte do que o da sua linha ou uma frase feita são apontados, para você corrigir, ou manter se for verdade.",
      },
      link: {
        question: "Ele escreve a partir do link de uma vaga?",
        answer:
          "Sim. Cole o link e o Otto lê a vaga. Se um site não permitir, cole o texto da vaga.",
      },
      tone: {
        question: "Posso mudar o tom ou o tamanho?",
        answer:
          "Sim. Escolha um tom {tones}, um tamanho padrão ou mais curto, ortografia americana ou britânica e a sua própria despedida. Você também pode deixar um recado para o Otto, como “Mencione que tenho disponibilidade para mudança”.",
      },
      why: {
        question: "Como ele responde a “Por que você quer trabalhar aqui?”",
        answer:
          "Cole a pergunta e escolha a vaga. O Otto responde a partir do seu currículo e da vaga em um ou dois parágrafos curtos. Tudo o que só você sabe, como o que atrai você na empresa, vira um espaço em branco entre colchetes para você preencher.",
      },
    },
    tones: { natural: "natural", warm: "caloroso", direct: "direto", formal: "formal" },
  },
  tracker: {
    meta: {
      title: "Controle de candidaturas com atualizações por e-mail",
      description:
        "Acompanhe cada candidatura em um só quadro, com o currículo que você enviou, lembretes de retorno e datas de entrevista. No {pro}, ele se atualiza com seus e-mails de vagas.",
    },
    crumb: "Controle de candidaturas",
    eyebrow: "Controle de candidaturas",
    title: "Um controle de candidaturas",
    titleEm: "que acompanha sua caixa de entrada.",
    action: "Acompanhar minhas candidaturas",
    planNote:
      "O {free} acompanha {freeApplications}, o {pro}, até {proApplications}, com atualizações por e-mail, e o {max}, até {maxApplications}.",
    applications: { one: "{count} candidatura", other: "{count} candidaturas" },
    check: {
      title: "Envie um currículo fácil de ler",
      text: "Antes de registrar a próxima candidatura, veja quais habilidades da vaga seu currículo mostra e o que o software de recrutamento lê do seu arquivo. As duas verificações são grátis.",
    },
    closing: {
      title: "Todas as candidaturas, em um só quadro.",
      art: "Otto, a lontra, lendo uma candidatura",
    },
    intro:
      "Registre cada vaga a que você se candidata em um só quadro, com o currículo que você enviou, um lembrete de retorno e a data da entrevista. No {pro}, seus e-mails de vagas movem cada card para você.",
    featuresTitle: "O que o controle guarda para você",
    features: {
      board: {
        title: "Um quadro, de A candidatar a Oferta",
        text: "As vagas que você salva esperam em A candidatar. Arraste cada card para Enviadas, Em entrevista e Oferta conforme tiver retorno, e para Encerradas quando o processo terminar.",
      },
      resume: {
        title: "O currículo que você enviou",
        text: "Cada candidatura guarda o currículo ou a cópia personalizada que você enviou, para você saber o que eles leram. Depois de enviar alguns, veja qual versão traz mais entrevistas.",
      },
      reminders: {
        title: "Lembretes de retorno",
        text: "O Otto lembra você de cobrar um retorno {followUp} dias depois da candidatura, ou depois dos dias que você escolher. Adie um lembrete por {snooze} dias ou dispense. Depois de uma entrevista, ele cria um para {afterInterview} dias úteis depois.",
      },
      interviews: {
        title: "Datas de entrevista",
        text: "Adicione o dia e o horário da entrevista e depois coloque na sua agenda, com um lembrete para praticar na manhã anterior.",
      },
      emails: {
        title: "Atualizações pelos seus e-mails de vagas ({pro})",
        text: "Ganhe seu próprio endereço do Otto e adicione um filtro do Gmail que encaminha os e-mails de vagas para ele. Um e-mail de “obrigado pela candidatura” adiciona a vaga a Enviadas, e um convite para entrevista a move para Em entrevista com a data.",
      },
      rules: {
        title: "Lido por regras, guardando pouco",
        text: "O Otto lê cada e-mail encaminhado com regras fixas, não com IA. Ele guarda o domínio do remetente, o assunto e o que encontrou, e descarta o resto. E-mails que ele não consegue verificar esperam você conferir.",
      },
    },
    steps: {
      add: {
        title: "Adicione uma candidatura",
        text: "Digite a empresa, o cargo e o link, ou marque uma vaga salva como candidatura enviada. Escolha o currículo que você enviou.",
      },
      move: {
        title: "Mova adiante",
        text: "Arraste o card conforme tiver retorno e adicione a data da entrevista e anotações. No {pro}, seus e-mails de vagas fazem isso por você.",
      },
      followUp: {
        title: "Cobre retorno na hora certa",
        text: "Quando um lembrete vencer, cobre o retorno, adie o lembrete ou marque a vaga como sem resposta. No {pro}, o Otto escreve a mensagem de acompanhamento a partir do seu currículo e da vaga.",
      },
    },
    faq: {
      free: {
        question: "O controle de candidaturas é grátis?",
        answer:
          "O {free} acompanha {freeApplications} com um lembrete de retorno, para você experimentar. O {pro} acompanha até {proApplications} e adiciona atualizações pelos seus e-mails de vagas, e o {max} acompanha até {maxApplications}. O {pro} custa {price} por mês.",
      },
      email: {
        question: "Como ele se atualiza pelo meu e-mail?",
        answer:
          "No {pro}, você escolhe um nome para o seu próprio endereço do Otto, adiciona esse endereço nas configurações de encaminhamento do Gmail, confirma que o Gmail é seu e depois adiciona um filtro para e-mails de vagas. Leva alguns minutos e termina com um e-mail de teste. Depois disso, cada e-mail de vaga move o card correspondente, ou espera você conferir.",
      },
      privacy: {
        question: "O Otto lê todos os meus e-mails?",
        answer:
          "Não. Só os e-mails que o seu filtro do Gmail encaminha chegam ao Otto. Ele lê cada um com regras fixas, não com IA, guarda o domínio do remetente, o assunto e o que encontrou no e-mail, como a empresa, o cargo e a data da entrevista, e descarta o resto. Esses registros são excluídos depois de seis meses. A <link>política de privacidade</link> tem os detalhes.",
      },
      wrong: {
        question: "E se o Otto ler um e-mail errado?",
        answer:
          "Desfaça qualquer mudança na lista de e-mails que o Otto leu. Quando ele não consegue verificar quem enviou um e-mail, nada se move até você conferir.",
      },
      versions: {
        question: "Posso ver qual currículo consegue entrevistas?",
        answer:
          "Sim. Cada candidatura guarda o currículo que você enviou, então o quadro conta as entrevistas e ofertas que cada versão conseguiu. Quando duas versões tiverem {minForRate} ou mais candidaturas cada, o Otto compara as taxas de entrevista delas.",
      },
    },
  },
  interviewPrep: {
    meta: {
      title: "Preparação para entrevistas com IA a partir do seu currículo e da vaga",
      description:
        "Prepare-se para cada entrevista com perguntas prováveis, histórias das suas próprias linhas do currículo e perguntas para fazer. Cargos técnicos também ganham uma rodada técnica.",
    },
    crumb: "Preparação para entrevistas",
    eyebrow: "Preparação para entrevistas · {pro}",
    title: "Preparação para entrevistas com IA",
    titleEm: "feita a partir do seu próprio currículo.",
    action: "Me preparar para uma entrevista",
    planNote:
      "Vem com o {pro}, {price} por mês para {letters} preparações para entrevistas, cartas, mensagens e respostas.",
    check: {
      title: "Veja o que a vaga pede",
      text: "A verificação de compatibilidade lista as habilidades que uma vaga cita e onde seu currículo mostra cada uma, um bom ponto de partida para a sua preparação. É grátis, sem login.",
    },
    closing: {
      title: "Chegue sabendo o que vai dizer.",
      art: "Otto, a lontra, pensando numa pergunta de entrevista",
    },
    intro:
      "Escolha a vaga e o currículo que você enviou. O Otto monta sua preparação a partir dos dois: as perguntas que provavelmente vão fazer, histórias das suas próprias linhas do currículo e perguntas para você fazer a eles.",
    featuresTitle: "O que vem em cada kit de preparação",
    features: {
      questions: {
        title: "Perguntas prováveis, rodada por rodada",
        text: "Da abertura ao encerramento, cada pergunta diz o que o entrevistador está avaliando, os pontos que você deve abordar e a pergunta seguinte que pode vir.",
      },
      stories: {
        title: "Histórias das suas próprias linhas",
        text: "Cada história parte de uma linha do seu currículo, contada como situação, tarefa, ação e resultado. O que seu currículo não diz fica em branco para você preencher, nunca é inventado.",
      },
      technical: {
        title: "Uma rodada técnica para cargos técnicos",
        text: "Para {roles} tipos de cargo, de engenheiros e cientistas de dados a gerentes de produto e designers: análises aprofundadas do seu próprio trabalho, conceitos essenciais do cargo e uma pergunta de design, um caso ou um exercício. Cada item diz o que uma boa resposta cobre e os erros a evitar.",
      },
      ask: {
        title: "Perguntas para fazer a eles",
        text: "Quatro ou cinco perguntas para o final da entrevista, sobre o produto, a equipe ou as metas citadas na vaga. Nenhuma sobre salário ou folgas.",
      },
      practice: {
        title: "Modo de prática",
        text: "O Otto faz o papel de entrevistador, uma pergunta por vez. Responda em voz alta com o microfone ou digitando, com um cronômetro de dois minutos e o seu roteiro a um toque. Depois, refaça as que não foram bem.",
      },
      day: {
        title: "Pronto no dia",
        text: "Adicione a entrevista à sua agenda com um lembrete para praticar na manhã anterior, ou imprima o kit para ler no caminho.",
      },
    },
    steps: {
      job: {
        title: "Escolha a vaga",
        text: "Uma candidatura que chega a Em entrevista fica esperando com um botão Preparar. Ou comece pelo link de qualquer vaga, pelo texto dela ou só pelo cargo.",
      },
      setup: {
        title: "Confira a configuração",
        text: "Use o currículo que você enviou. O Otto escolhe a rodada técnica pela vaga; mude o cargo, ou o nível de {firstLevel} a {lastLevel}, se quiser.",
      },
      practice: {
        title: "Leia, preencha, pratique",
        text: "Passe pelas perguntas e histórias, preencha cada espaço em branco com seus próprios fatos e depois use o modo de prática.",
      },
    },
    faq: {
      free: {
        question: "A preparação para entrevistas com IA é grátis?",
        answer:
          "Ela vem com o {pro} e o {max}. Cada kit de preparação conta na mesma cota mensal das cartas de apresentação e mensagens: {letters} por mês no {pro} e {maxLetters} no {max}. O {pro} custa {price} por mês.",
      },
      backUp: {
        question: "Ela vai me dar respostas que eu não consigo sustentar?",
        answer:
          "Não. Fatos sobre você vêm só do seu currículo. Quando uma resposta precisa de algo que seu currículo não diz, o Otto deixa uma pergunta entre colchetes, como “[Quantas pessoas usaram?]”, para você responder. Na rodada técnica, o conhecimento geral é escrito como orientação, nunca como algo que você fez.",
      },
      roles: {
        question: "Quais cargos ganham uma rodada técnica?",
        answer:
          "{roles} tipos, de engenheiros de backend, frontend e IA/ML a analistas de dados, gerentes de produto e designers. O Otto escolhe um pelo cargo e pela vaga, e você pode mudar ou desativar.",
      },
      aloud: {
        question: "Posso praticar em voz alta?",
        answer:
          "Sim. No modo de prática, aperte o microfone e responda em voz alta, e sua resposta aparece como texto. Marque cada pergunta como feita ou para praticar de novo, e as anotações que você guardar ficam no seu navegador.",
      },
      noPost: {
        question: "Posso me preparar sem o texto da vaga?",
        answer:
          "Sim. Cole o texto inteiro da vaga para ter perguntas mais precisas, ou deixe de fora e o Otto trabalha a partir do cargo.",
      },
    },
    levels: { junior: "júnior", mid: "pleno", senior: "sênior", staff: "staff" },
  },
  portfolio: {
    meta: {
      title: "Do currículo a um site de portfólio em {designs} designs",
      description:
        "Transforme seu currículo em um site de portfólio. Escolha um de {designs} designs, o Otto preenche a partir do seu currículo e nós hospedamos no seu próprio link. Vem com o {pro}.",
    },
    crumb: "Criador de site de portfólio",
    eyebrow: "Portfólio · {pro}",
    title: "Do currículo ao site de portfólio,",
    titleEm: "hospedado no seu próprio link.",
    action: "Criar meu portfólio",
    planNote: "Vem com o {pro}, {price} por mês com hospedagem incluída.",
    check: {
      title: "Comece com um currículo fácil de ler",
      text: "Seu portfólio é feito a partir do seu currículo, então revise-o primeiro: veja o que o software de recrutamento lê do seu arquivo ou compare com uma vaga. As duas coisas são grátis.",
    },
    closing: {
      title: "Seu currículo, como um site próprio.",
      art: "Otto, a lontra, acenando",
    },
    intro:
      "Escolha um de {designs} designs e o Otto preenche a partir do seu currículo: seus projetos, experiências, habilidades e links. Nós hospedamos no seu próprio link, então não há nada para configurar.",
    featuresTitle: "O que você recebe",
    features: {
      designs: {
        title: "{designs} designs à escolha",
        text: "De uma coluna tranquila a uma página escura com grandes projetos em destaque. Abra cada um em tamanho real, com o seu próprio currículo dentro, antes de escolher.",
      },
      filled: {
        title: "Preenchido a partir do seu currículo",
        text: "O Otto redige o sobre, os projetos, a experiência, as habilidades, a formação e os links a partir do seu currículo. Edite qualquer parte ou oculte uma seção de que não precisa.",
      },
      hosted: {
        title: "Hospedado no seu próprio link",
        text: "A página ganha um link com o seu nome, e nós a hospedamos. Se você mudar o nome depois, o link antigo continua funcionando por {redirectDays} dias.",
      },
      sync: {
        title: "Em sintonia com o seu currículo",
        text: "Com a sincronização ativada, as edições no seu currículo aparecem na página sozinhas. Desative para atualizar a página só quando estiver pronto.",
      },
      private: {
        title: "Dados pessoais ficam de fora",
        text: "Seu e-mail e seu telefone começam ocultos, e os mecanismos de busca são instruídos a ignorar a página até você permitir que a encontrem.",
      },
      views: {
        title: "Visualizações e GitHub",
        text: "Veja quantas vezes sua página foi vista. Conecte o GitHub e a página também pode mostrar seus números do GitHub.",
      },
    },
    steps: {
      pick: {
        title: "Escolha um currículo e um design",
        text: "Veja cada design com o seu próprio currículo dentro e escolha um. O Otto preenche.",
      },
      check: {
        title: "Confira o que o Otto escreveu",
        text: "Edite o texto, oculte seções e escolha se quer mostrar seu e-mail e seu telefone.",
      },
      publish: {
        title: "Publique e compartilhe",
        text: "Nada vai ao ar até você publicar. Depois, envie o link para recrutadores ou coloque no seu currículo e no LinkedIn.",
      },
    },
    faq: {
      free: {
        question: "O site de portfólio é grátis?",
        answer:
          "Portfólios vêm com o {pro} e o {max}, com hospedagem incluída. O {pro} custa {price} por mês. Se o seu plano terminar, a página sai do ar, mas ela e as configurações dela ficam guardadas, então ela volta como estava quando você voltar.",
      },
      code: {
        question: "Preciso programar ou contratar hospedagem?",
        answer:
          "Não. O Otto cria a página a partir do seu currículo e nós hospedamos. Não há nada para instalar e nenhum domínio para comprar.",
      },
      google: {
        question: "O Google vai encontrar meu portfólio?",
        answer:
          "Só se você quiser. Até você ativar “Permitir que mecanismos de busca encontrem”, os mecanismos de busca são instruídos a manter a página fora dos resultados.",
      },
      update: {
        question: "O que acontece quando eu atualizo meu currículo?",
        answer:
          "Com a sincronização ativada, a página recebe a mudança sozinha. Com ela desativada, o Otto avisa que o currículo mudou, e você atualiza a página quando estiver pronto.",
      },
      design: {
        question: "Posso mudar o design depois?",
        answer:
          "Sim. Troque para qualquer um dos {designs} designs quando quiser. Sua página mantém o link e as configurações.",
      },
    },
  },
} satisfies Translation<Messages["product"]>;
