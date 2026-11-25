import type { ExampleWords } from "../../../examples";

export const accountant: ExampleWords<"accountant"> = {
  role: "Contador",
  card: "Um fechamento mais rápido e limpo: conciliações, auditorias e os controles por trás deles.",
  description:
    "Exemplo de currículo de contador: fechamento mensal, conciliações e auditorias em números, e as habilidades de GAAP, ERP e Excel que as vagas pedem.",
  intro:
    "A maioria dos currículos de contador lista as mesmas tarefas: lançamentos contábeis, conciliações, fechamento mensal. O que faz um se destacar é o quanto essas tarefas deram certo. Este exemplo mede o fechamento em dias, as conciliações em contas e dólares, e a auditoria em ajustes.",
  person:
    "Megan é inventada: uma CPA com 6 anos, primeiro em auditoria num escritório pequeno e depois numa indústria em Indianápolis. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de contadora",
    basics: {
      headline: "Contadora sênior, CPA",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "CPA com 6 anos em auditoria e contabilidade corporativa, hoje à frente do fechamento mensal de uma indústria de US$ 240 milhões. Mantém as conciliações em ordem, os papéis de auditoria claros e o fechamento dentro do calendário.",
    experience: [
      {
        title: "Contadora sênior",
        bullets: [
          "Reduzi o fechamento mensal de 9 para 5 dias úteis levando 120 lançamentos recorrentes para modelos do NetSuite e criando um calendário diário de fechamento.",
          "Conciliei 65 contas do balanço patrimonial todo mês, regularizando US$ 410.000 em pendências antigas que estavam sem explicação havia mais de um ano.",
          "Liderei a auditoria de fim de ano com uma firma externa, entregando 180 solicitações no prazo e com zero ajustes de auditoria.",
          "Criei um modelo de custeio de estoque no Excel para 3 fábricas, encontrando US$ 260.000 de estoque em processo superestimado antes da auditoria.",
        ],
      },
      {
        title: "Contadora",
        bullets: [
          "Registrei adições e depreciação de 1.400 ativos imobilizados e corrigi um erro de US$ 95.000 num cronograma de arrendamento sob o ASC 842.",
          "Escrevi guias passo a passo para 14 tarefas de fechamento, para que 2 pessoas recém-contratadas fechassem suas contas sozinhas até o segundo mês.",
        ],
      },
      {
        title: "Assistente de auditoria",
        bullets: [
          "Auditei 11 clientes industriais e sem fins lucrativos com receita de US$ 5 milhões a US$ 90 milhões, testando receita, estoque e folha de pagamento.",
          "Encontrei um pagamento duplicado de US$ 70.000 a um fornecedor numa ONG cliente, o que levou a um novo controle de aprovação para pagamentos acima de US$ 10.000.",
        ],
      },
    ],
    education: [
      { degree: "M.Acc.", field: "Contabilidade" },
      { degree: "B.S.", field: "Contabilidade" },
    ],
    skills: [
      {
        label: "Contabilidade",
        items: [
          "GAAP",
          "Fechamento mensal",
          "Conciliação de contas",
          "Lançamentos contábeis",
          "Suporte a auditoria",
          "ASC 842",
        ],
      },
      { label: "Sistemas", items: ["NetSuite", "Excel", "BlackLine", "QuickBooks"] },
    ],
    certifications: [{ name: "Certified Public Accountant (CPA)" }],
  },
  lines: [
    {
      weak: "Responsável pelo fechamento mensal.",
      strong:
        "Reduzi o fechamento mensal de 9 para 5 dias úteis levando 120 lançamentos recorrentes para modelos do NetSuite e criando um calendário diário de fechamento.",
    },
    {
      weak: "Realizei conciliações de contas.",
      strong:
        "Conciliei 65 contas do balanço patrimonial todo mês, regularizando US$ 410.000 em pendências antigas que estavam sem explicação havia mais de um ano.",
    },
    {
      weak: "Auxiliei na auditoria anual.",
      strong:
        "Liderei a auditoria de fim de ano com uma firma externa, entregando 180 solicitações no prazo e com zero ajustes de auditoria.",
    },
  ],
  skills: [
    { label: "Contabilidade" },
    { label: "Sistemas" },
    { label: "Planilhas e certificações" },
  ],
  tips: [
    {
      title: "Meça o fechamento",
      text: "Dias para fechar, contas conciliadas, lançamentos automatizados. O fechamento é o coração do trabalho, então dê a ele um número de antes e depois.",
    },
    {
      title: "Cite as normas e o sistema",
      text: "Diga quais tópicos do GAAP você tratou, como receita no ASC 606 ou arrendamentos no ASC 842, e o ERP em que você fechava. As vagas costumam citar os dois, e a correspondência ajuda o recrutador a situar você.",
    },
    {
      title: "Coloque o CPA onde ele é visto",
      text: "Coloque CPA depois do seu nome ou no título, e liste a licença com o estado e o ano. Se você ainda está fazendo os exames, diga em quais seções já passou.",
    },
  ],
  mistakes: [
    {
      title: "Copiar a descrição da vaga",
      text: "“Preparei lançamentos contábeis e conciliações” é o que a vaga já diz. Acrescente quantos, em quanto tempo e o que você pegou no caminho.",
    },
    {
      title: "Deixar de fora os resultados da auditoria",
      text: "É na auditoria que o trabalho de um contador recebe nota. Se a sua voltou sem ajustes, ou com menos apontamentos que no ano anterior, diga isso com os números.",
    },
    {
      title: "Todo sistema que você já usou",
      text: "Uma lista longa de softwares contábeis empurra o que importa para baixo na página. Comece pelo ERP que a vaga cita e deixe os sistemas mais antigos curtos ou de fora.",
    },
  ],
  faq: [
    {
      question: "O que um currículo de contador deve incluir?",
      answer:
        "Sua situação de CPA, o tamanho da contabilidade que você mantinha, o fechamento e as conciliações sob sua responsabilidade, os resultados de auditoria e suas habilidades em ERP e Excel. Use números para dias, contas e dólares.",
    },
    {
      question: "Devo listar as seções do exame de CPA em que já passei?",
      answer:
        "Sim. Escreva “candidato a CPA” com as seções aprovadas, como AUD e FAR, e o ano, para que recrutadores vejam que você está a caminho. Quando tiver a licença, liste a licença no lugar.",
    },
    {
      question: "Como sair da auditoria externa para trabalhar numa empresa?",
      answer:
        "Mantenha o emprego de auditoria e mostre o trabalho com clientes em números: quantos clientes, de que porte, o que você testou. Depois acrescente qualquer trabalho de fechamento, conciliação ou sistemas, para que um controller veja que você consegue cuidar da contabilidade.",
    },
  ],
};
