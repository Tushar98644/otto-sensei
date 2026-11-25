import type { ExampleWords } from "../../../examples";

export const projectManager: ExampleWords<"project-manager"> = {
  role: "Gerente de projetos",
  card: "Projetos entregues no prazo e no orçamento, com o escopo, a equipe e os riscos por trás deles.",
  description:
    "Exemplo de currículo de gerente de projetos: linhas com escopo, orçamento, prazo e equipe, as habilidades de PMP e Agile, dicas e erros comuns.",
  intro:
    "Quem contrata lê um currículo de gerente de projetos com três perguntas em mente: qual era o tamanho dos projetos, se eles saíram no prazo e no orçamento, e o que você fez quando um atrasou. Este exemplo responde às três em cada emprego.",
  person:
    "Nicole é inventada: uma gerente de projetos com certificação PMP e 7 anos conduzindo implantações de software e mudanças de escritório para uma rede de saúde em Chicago. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de gerente de projetos",
    basics: {
      headline: "Gerente de projetos, PMP",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Gerente de projetos com 7 anos liderando implantações de software, aberturas de clínicas e mudanças de escritório para uma rede de saúde. Planeja em detalhes, sinaliza riscos cedo e mantém no rumo orçamentos de até US$ 4 milhões.",
    experience: [
      {
        title: "Gerente de projetos sênior",
        bullets: [
          "Liderei a implantação do novo sistema de agendamento de pacientes em 42 clínicas em 14 meses, 3 semanas antes do prazo e US$ 180.000 abaixo do orçamento de US$ 2,6 milhões.",
          "Coordenei uma equipe de 11 pessoas de TI, operações das clínicas e do fornecedor, com um registro semanal de riscos que pegou 2 problemas de migração de dados antes do go-live.",
          "Reduzi as faltas de pacientes de 14% para 9% incluindo lembretes por SMS no escopo da implantação após um piloto em 6 clínicas.",
          "Criei um fluxo de entrada de projetos no Jira e no Confluence que classifica 60 pedidos por ano por custo e valor, para a liderança aprovar o trabalho numa só reunião.",
        ],
      },
      {
        title: "Gerente de projetos",
        bullets: [
          "Gerenciei a mudança de 380 funcionários para a nova sede em 2 fins de semana, sem dias de trabalho perdidos e com todas as mesas prontas na segunda de manhã.",
          "Entreguei 3 aberturas de clínicas no prazo com um plano único para obras, contratações e equipamentos, depois reutilizado em mais 5 unidades.",
        ],
      },
      {
        title: "Coordenadora de projetos",
        bullets: [
          "Acompanhei cronogramas e orçamentos de 9 obras que somavam US$ 22 milhões, enviando um relatório semanal de status aos clientes e aos líderes de obra.",
          "Criei um registro de ordens de mudança no Excel que reduziu o prazo de aprovação de 12 para 5 dias.",
        ],
      },
    ],
    education: [{ degree: "B.A.", field: "Administração de Empresas" }],
    skills: [
      {
        label: "Gestão de projetos",
        items: [
          "Gestão de projetos",
          "Gestão de riscos",
          "Orçamento",
          "Gestão de stakeholders",
          "Gestão de fornecedores",
          "Gestão de mudanças",
        ],
      },
      {
        label: "Métodos e ferramentas",
        items: ["Agile", "Scrum", "Jira", "Confluence", "Smartsheet", "Microsoft Project", "Excel"],
      },
    ],
    certifications: [
      { name: "Project Management Professional (PMP)" },
      { name: "Certified ScrumMaster (CSM)" },
    ],
  },
  lines: [
    {
      weak: "Encarregada do planejamento e da execução dos projetos.",
      strong:
        "Liderei a implantação do novo sistema de agendamento de pacientes em 42 clínicas em 14 meses, 3 semanas antes do prazo e US$ 180.000 abaixo do orçamento de US$ 2,6 milhões.",
    },
    {
      weak: "Trabalhei com stakeholders para manter os projetos no rumo.",
      strong:
        "Coordenei uma equipe de 11 pessoas de TI, operações das clínicas e do fornecedor, com um registro semanal de riscos que pegou 2 problemas de migração de dados antes do go-live.",
    },
    {
      weak: "Gerenciei múltiplos projetos ao mesmo tempo.",
      strong:
        "Acompanhei cronogramas e orçamentos de 9 obras que somavam US$ 22 milhões, enviando um relatório semanal de status aos clientes e aos líderes de obra.",
    },
  ],
  skills: [{ label: "Entrega" }, { label: "Métodos" }, { label: "Ferramentas" }],
  tips: [
    {
      title: "Dê um tamanho a cada projeto",
      text: "Orçamento, tamanho da equipe, número de unidades ou usuários e quanto tempo durou. Quem lê não distingue um projeto de US$ 50.000 de um de US$ 5 milhões se você não disser, e o tamanho define o seu nível.",
    },
    {
      title: "Mostre o que aconteceu quando deu errado",
      text: "Todo projeto enfrenta algum problema. Uma linha sobre um risco que você pegou cedo ou um atraso que você recuperou diz mais a quem contrata do que qualquer afirmação de que você é organizado.",
    },
    {
      title: "Alinhe o método à vaga",
      text: "Se a vaga pede Agile, mostre um projeto conduzido em sprints. Se pede PMP ou waterfall, mostre fases, aprovações e controle de mudanças. Comece pelo que a vaga quer.",
    },
  ],
  mistakes: [
    {
      title: "“Gerenciei projetos do início ao fim”",
      text: "Essa é a definição do trabalho, não um resultado. Troque por um projeto, o tamanho dele e se ele saiu no prazo e no orçamento.",
    },
    {
      title: "Toda ferramenta que você já abriu",
      text: "Jira, Asana, Trello, Monday, Smartsheet e Wrike numa só lista parecem enchimento. Cite as duas ou três em que você conduziu projetos de verdade e mostre-as numa linha.",
    },
    {
      title: "Esconder o PMP",
      text: "Se você tem o PMP ou o CSM, coloque no título e de novo em certificações, com o ano. Vagas nos EUA costumam listá-lo como requisito, e recrutadores fazem buscas por ele.",
    },
  ],
  faq: [
    {
      question: "Devo colocar o PMP no meu currículo de gerente de projetos?",
      answer:
        "Sim, se você tem: no título e numa seção de certificações, com o ano. Se ainda está estudando, escreva que a sua prova do PMP está marcada e dê o mês, em vez de dar a entender que já tem.",
    },
    {
      question: "Como mostrar experiência em gestão de projetos sem ter o cargo?",
      answer:
        "Mantenha seu cargo real e escreva linhas sobre os projetos que você conduziu nele: escopo, orçamento, equipe e resultado. Coordenadores, engenheiros e analistas muitas vezes lideram projetos sem ter o cargo.",
    },
    {
      question: "Que números devem estar num currículo de gerente de projetos?",
      answer:
        "Orçamento, tamanho da equipe, datas previstas versus reais, custo versus orçamento e o resultado que o projeto buscava, como menos faltas de pacientes ou uma aprovação mais rápida.",
    },
    {
      question: "O currículo de gerente de programas é diferente do de gerente de projetos?",
      answer:
        "Um gerente de programas conduz um grupo de projetos relacionados rumo a um objetivo, então o currículo mostra o portfólio: quantos projetos, o orçamento somado e o objetivo a que serviam. Um gerente de projetos mostra cada projeto com mais detalhes.",
    },
  ],
};
