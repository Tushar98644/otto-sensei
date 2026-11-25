import type { AtsTranslation } from "../../ats";

// The ATS guides' introductions, sourced notes and general advice, in Brazilian Portuguese.
const ANSWER_THE_SAME = "Responda a essas perguntas com sinceridade e sempre do mesmo jeito.";

const GREENHOUSE_HELP = "Central de ajuda do Greenhouse";
const WORKDAY_DOCS = "Documentação do Workday";
const ORACLE_DOCS = "Documentação do Oracle Taleo";
const SAP_NOTE = "Nota de suporte da SAP";
const SAP_LEARNING = "SAP Learning";
const WORKABLE_HELP = "Central de ajuda do Workable";

export default {
  intros: {
    greenhouse: {
      what: "O Greenhouse é um software de recrutamento (um sistema de rastreamento de candidatos, ou ATS) que os empregadores usam para publicar vagas, receber candidaturas e avaliar candidatos.",
      spot: "O formulário costuma ficar em boards.greenhouse.io ou job-boards.greenhouse.io, ou o link traz gh_jid= e um número.",
    },
    lever: {
      what: "O Lever é um software de recrutamento (um sistema de rastreamento de candidatos, ou ATS) que os empregadores usam para publicar vagas e avaliar candidatos.",
      spot: "A vaga costuma ficar em jobs.lever.co.",
    },
    ashby: {
      what: "O Ashby é um software de recrutamento (um sistema de rastreamento de candidatos, ou ATS) que os empregadores usam para publicar vagas e avaliar candidatos.",
      spot: "A vaga costuma ficar em jobs.ashbyhq.com, ou o link traz ashby_jid=.",
    },
    workday: {
      what: "O Workday é um software de RH. Os empregadores que usam as ferramentas de recrutamento dele recebem candidaturas pelo Workday.",
      spot: "O formulário costuma ficar em um endereço que termina em myworkdayjobs.com ou myworkdaysite.com.",
    },
    icims: {
      what: "O iCIMS é um software de recrutamento (um sistema de rastreamento de candidatos, ou ATS) que os empregadores usam para publicar vagas e fazer a triagem de candidatos.",
      spot: "O formulário costuma ficar em um endereço que termina em icims.com.",
    },
    taleo: {
      what: "O Taleo é o software de recrutamento da Oracle (um sistema de rastreamento de candidatos, ou ATS) para publicar vagas e fazer a triagem de candidatos.",
      spot: "O formulário costuma ficar em um endereço que termina em taleo.net.",
    },
    successfactors: {
      what: "O SAP SuccessFactors é o software de RH da SAP. A parte de recrutamento dele recebe candidaturas e faz a triagem de candidatos.",
      spot: "O formulário costuma ficar em um endereço como career4.successfactors.com, ou em um que termina em jobs2web.com.",
    },
    smartrecruiters: {
      what: "O SmartRecruiters é um software de recrutamento (um sistema de rastreamento de candidatos, ou ATS) que os empregadores usam para publicar vagas e fazer a triagem de candidatos. A IA dele se chama Winston.",
      spot: "A vaga costuma ficar em jobs.smartrecruiters.com ou careers.smartrecruiters.com.",
    },
    workable: {
      what: "O Workable é um software de recrutamento (um sistema de rastreamento de candidatos, ou ATS) que os empregadores usam para publicar vagas e fazer a triagem de candidatos.",
      spot: "O formulário costuma ficar em apply.workable.com.",
    },
    bamboohr: {
      what: "O BambooHR é um software de RH para empresas, com uma ferramenta de recrutamento para publicar vagas e avaliar candidatos.",
      spot: "O formulário costuma ficar em um endereço que termina em bamboohr.com.",
    },
    jobvite: {
      what: "O Jobvite é um software de recrutamento (um sistema de rastreamento de candidatos, ou ATS) que os empregadores usam para publicar vagas e avaliar candidatos.",
      spot: "A vaga costuma ficar em jobs.jobvite.com.",
    },
    recruitee: {
      what: "O Recruitee é um software de recrutamento (um sistema de rastreamento de candidatos, ou ATS) que os empregadores usam para publicar vagas e fazer a triagem de candidatos.",
      spot: "O formulário costuma ficar em um endereço que termina em recruitee.com.",
    },
    teamtailor: {
      what: "O Teamtailor é um software de recrutamento (um sistema de rastreamento de candidatos, ou ATS) que os empregadores usam para publicar vagas e avaliar candidatos. O assistente de IA dele se chama Co-pilot.",
      spot: "O formulário costuma ficar em um endereço que termina em teamtailor.com.",
    },
  },
  notes: {
    greenhouse: [
      {
        fact: "Os empregadores podem configurar o formulário para rejeitar você automaticamente por algumas respostas a perguntas de sim/não e de escolher em uma lista.",
        todo: ANSWER_THE_SAME,
        source: { label: GREENHOUSE_HELP },
      },
      {
        fact: "O Greenhouse diz que a maioria dos recrutadores avalia as candidaturas na ordem em que elas chegam.",
        todo: "Candidate-se logo depois que a vaga for publicada.",
        source: { label: "Blog do Greenhouse" },
      },
      {
        fact: "O Greenhouse não consegue ler currículos com mais de 2,5 MB. Colunas, tabelas e dados de contato em cabeçalho, rodapé ou caixa de texto também o atrapalham.",
        todo: "Use uma coluna só, com menos de 2,5 MB e os dados de contato no texto principal.",
        source: { label: GREENHOUSE_HELP },
      },
      {
        fact: "No filtro de palavras-chave do Greenhouse, uma palavra da sua candidatura só conta se for exatamente igual à palavra que o recrutador buscou.",
        todo: "Use as próprias palavras da vaga para as habilidades que você tem, como “JavaScript”.",
        source: { label: GREENHOUSE_HELP },
      },
      {
        fact: "Com o Talent Matching ativado, a IA classifica cada candidato de Strong match (compatibilidade forte) a Limited match (compatibilidade limitada). O Greenhouse diz que ela nunca avança nem rejeita ninguém sozinha.",
        todo: "Deixe as principais habilidades da vaga fáceis de achar no seu currículo.",
        source: { label: GREENHOUSE_HELP },
      },
    ],
    lever: [
      {
        fact: "O Lever oferece aos recrutadores o Talent Fit, uma porcentagem de quanto as suas habilidades combinam com a vaga. O Lever diz que os recrutadores tomam a decisão final.",
        todo: "Use as palavras da vaga para as habilidades que você realmente tem.",
        source: { label: "Lever" },
      },
    ],
    ashby: [
      {
        fact: "Com a avaliação por IA ativada, o Ashby confere seu currículo com cada critério da equipe: meets (atende), does not meet (não atende) ou undecided (indefinido).",
        todo: "Deixe fácil de achar cada requisito que você atende.",
        source: { label: "Documentação do Ashby" },
      },
      {
        fact: "A equipe escolhe esses critérios: sugestões da IA a partir da vaga, critérios reaproveitados de outras vagas ou critérios próprios.",
        todo: "Cubra os requisitos da vaga com palavras suas, e verdadeiras.",
        source: { label: "Documentação do Ashby" },
      },
      {
        fact: "Os recrutadores podem ordenar os candidatos pela proporção de critérios atendidos, então os mais compatíveis são lidos primeiro.",
        todo: "Mostre cada requisito listado que você realmente atende.",
        source: { label: "Documentação do Ashby" },
      },
      {
        fact: "Os empregadores podem criar regras que rejeitam uma candidatura automaticamente no envio, com base nas respostas do formulário. O e-mail pode ser retido por dias.",
        todo: ANSWER_THE_SAME,
        source: { label: "Documentação do Ashby" },
      },
    ],
    workday: [
      {
        fact: "O leitor de currículos do Workday nunca preenche os campos de Habilidades ou de Idiomas.",
        todo: "Digite você mesmo suas habilidades e idiomas nesses campos.",
        source: { label: WORKDAY_DOCS },
      },
      {
        fact: "O Workday diz que o que ele lê varia com o layout e a ordem das palavras do arquivo, e que arquivos sem imagens funcionam melhor.",
        todo: "Confira cada campo que ele preencher antes de enviar.",
        source: { label: WORKDAY_DOCS },
      },
      {
        fact: "Os empregadores podem criar regras que recusam candidatos automaticamente, como quem não tem permissão para trabalhar no país da vaga.",
        todo: "Responda às perguntas sobre permissão de trabalho com sinceridade e sempre do mesmo jeito.",
        source: { label: WORKDAY_DOCS },
      },
      {
        fact: "Quando o empregador adota a avaliação mais recente do HiredScore, ela confere cada qualificação listada, uma por uma, com o seu currículo. Atender a todas as básicas rende um A ou B.",
        todo: "Sustente cada requisito obrigatório com uma linha que o mostre com clareza.",
        source: { label: "Notas de versão do Workday HiredScore" },
      },
    ],
    icims: [
      {
        fact: "Empregadores no iCIMS podem adicionar perguntas eliminatórias que tiram candidatos do processo na hora da candidatura.",
        todo: ANSWER_THE_SAME,
        source: { label: "Blog do iCIMS" },
      },
      {
        fact: "O iCIMS oferece o Candidate Ranking, que usa IA para comparar suas habilidades e experiência com a vaga e mostrar primeiro os candidatos mais compatíveis.",
        todo: "Descreva sua experiência nos termos da vaga, quando eles forem verdadeiros.",
        source: { label: "Blog do iCIMS" },
      },
    ],
    taleo: [
      {
        fact: "A busca por palavras-chave do Taleo encontra só palavras exatas, a menos que o recrutador ative Related Terms (termos relacionados).",
        todo: "Use as palavras exatas da vaga, e escreva as abreviações das duas formas uma vez: “Kubernetes (K8s)”.",
        source: { label: ORACLE_DOCS },
      },
      {
        fact: "A busca por palavras-chave do Taleo lê os arquivos PDF, Word, RTF, de texto e HTML que você anexa.",
        todo: "Anexe um arquivo PDF ou Word, nunca uma foto ou um documento escaneado.",
        source: { label: ORACLE_DOCS },
      },
      {
        fact: "As perguntas de desqualificação são obrigatórias, e suas respostas podem desqualificar você automaticamente.",
        todo: ANSWER_THE_SAME,
        source: { label: ORACLE_DOCS },
      },
      {
        fact: "Os empregadores marcam habilidades e perguntas como Required (obrigatória) ou Asset (diferencial). Os recrutadores podem listar só as pessoas que atendem a todas as Required.",
        todo: "Responda às perguntas de habilidades com precisão: as Required decidem se sua candidatura será considerada.",
        source: { label: ORACLE_DOCS },
      },
    ],
    successfactors: [
      {
        fact: "Uma resposta errada a uma pergunta de desqualificação rejeita você automaticamente.",
        todo: ANSWER_THE_SAME,
        source: { label: SAP_NOTE },
      },
      {
        fact: "Os empregadores podem definir uma nota mínima para perguntas com pontuação. Ficar abaixo dela desqualifica você automaticamente.",
        todo: "Responda às perguntas com pontuação por completo. Não diminua uma experiência real.",
        source: { label: SAP_NOTE },
      },
      {
        fact: "PDFs escaneados, ou feitos a partir de imagens, não são lidos direito. Campos de lista suspensa nunca são preenchidos a partir do seu currículo.",
        todo: "Use um PDF com texto real e preencha as listas suspensas à mão.",
        source: { label: SAP_NOTE },
      },
      {
        fact: "A leitura de currículos só funciona em alguns idiomas, como inglês, alemão, francês, espanhol e holandês.",
        todo: "Se o seu estiver em outro idioma, confira cada campo que o sistema preencher.",
        source: { label: SAP_NOTE },
      },
      {
        fact: "Com a correspondência de habilidades por IA ativada, a SAP extrai habilidades do seu currículo e as separa em correspondências exatas e habilidades que faltam.",
        todo: "Cite as habilidades da vaga que você tem, palavra por palavra.",
        source: { label: SAP_LEARNING },
      },
    ],
    smartrecruiters: [
      {
        fact: "Qualquer pergunta de sim/não ou de lista suspensa pode ser eliminatória. Uma resposta eliminatória rejeita você automaticamente, por padrão com um e-mail uma hora depois.",
        todo: ANSWER_THE_SAME,
        source: { label: SAP_LEARNING },
      },
      {
        fact: "O Winston Match avalia suas habilidades, experiência e formação em relação à vaga, de 1 a 4 estrelas, para ajudar os recrutadores a escolher quem ler primeiro.",
        todo: "Deixe suas habilidades, empregos e formação fáceis de achar.",
        source: { label: SAP_LEARNING },
      },
      {
        fact: "O Winston deduz habilidades a partir dos seus cargos.",
        todo: "Use nomes de cargo claros e padronizados.",
        source: { label: SAP_LEARNING },
      },
    ],
    workable: [
      {
        fact: "As perguntas eliminatórias são só de sim/não. A resposta eliminatória desqualifica você, e você não fica sabendo.",
        todo: ANSWER_THE_SAME,
        source: { label: WORKABLE_HELP },
      },
      {
        fact: "O formulário de candidatura do Workable aceita currículos de até 5 MB, em PDF, DOC, DOCX, RTF, HTML ou ODT.",
        todo: "Envie um PDF ou DOCX com menos de 5 MB.",
        source: { label: WORKABLE_HELP },
      },
      {
        fact: "Quando o empregador usa o Workable Agent, ele dá uma nota a você com base nos requisitos da equipe, e os obrigatórios contam em dobro.",
        todo: "Mostre em palavras simples cada requisito obrigatório que você atende.",
        source: { label: WORKABLE_HELP },
      },
      {
        fact: "Quando seu currículo e suas respostas não dizem o bastante sobre um requisito, o Agent o marca como Unknown (desconhecido).",
        todo: "Diga com clareza cada requisito que você atende.",
        source: { label: WORKABLE_HELP },
      },
    ],
    bamboohr: [
      {
        fact: "Na ferramenta de recrutamento do BambooHR, pessoas da equipe leem seu currículo e suas respostas e avaliam você elas mesmas.",
        todo: "Responda a todas as perguntas por completo: pessoas vão lê-las.",
        source: { label: "BambooHR" },
      },
    ],
    jobvite: [
      {
        fact: "A IA do Jobvite extrai uma lista de habilidades do seu currículo, e os resultados de compatibilidade chegam aos recrutadores como notas.",
        todo: "Cite as habilidades da vaga que você tem, palavra por palavra.",
        source: { label: "Jobvite" },
      },
      {
        fact: "O Jobvite diz que o modelo dele deixa de fora seu nome, dados de contato, idade, raça, gênero e etnia.",
        todo: "Gaste suas palavras com habilidades e resultados.",
        source: { label: "Jobvite" },
      },
    ],
    recruitee: [
      {
        fact: "Perguntas eliminatórias (sim/não, escolha única ou múltipla escolha) desqualificam a resposta errada automaticamente, e também podem enviar o e-mail de recusa.",
        todo: ANSWER_THE_SAME,
        source: { label: "Central de ajuda do Recruitee" },
      },
    ],
    teamtailor: [
      {
        fact: "Com o Co-pilot ativado, a IA confere você com critérios que a equipe escreve: met (atendido), not met (não atendido) ou um traço quando há pouca informação.",
        todo: "Diga com clareza cada requisito provável.",
        source: { label: "Central de ajuda do Teamtailor" },
      },
      {
        fact: "O Co-pilot lê seu currículo, sua carta de apresentação, suas respostas e seu endereço, e o empregador pode mover pessoas para outra etapa com base no resultado dele.",
        todo: "Mantenha sua carta e suas respostas alinhadas com seu currículo.",
        source: { label: "Central de ajuda do Teamtailor" },
      },
    ],
  },
  general: [
    {
      title: "Envie texto real, não uma imagem dele",
      text: "Envie um arquivo PDF ou Word feito de texto. Um documento escaneado ou a foto de uma página pode não ser lido direito.",
    },
    {
      title: "Use uma só coluna",
      text: "Coloque seus dados de contato no texto principal, não em cabeçalho, rodapé, tabela ou caixa de texto.",
    },
    {
      title: "Use as palavras da vaga para as habilidades que você tem",
      text: "Algumas buscas só encontram palavras exatas. Escreva uma abreviação das duas formas uma vez, como “Kubernetes (K8s)”.",
    },
    {
      title: "Use cargos claros",
      text: "Algumas IAs, como o Winston do SmartRecruiters, deduzem suas habilidades a partir dos seus cargos.",
    },
    {
      title: "Responda às perguntas de triagem com sinceridade, sempre do mesmo jeito",
      text: "Muitos sistemas deixam os empregadores recusar candidatos automaticamente por algumas respostas.",
    },
    {
      title: "Confira o que o formulário preenche",
      text: "Quando um formulário preenche os campos a partir do seu currículo, leia cada um antes de enviar.",
    },
  ],
  screeningTip: "Responda às perguntas de triagem com sinceridade e sempre do mesmo jeito.",
} satisfies AtsTranslation;
