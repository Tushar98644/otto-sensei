import type { ExampleWords } from "../../../examples";

export const financialAnalyst: ExampleWords<"financial-analyst"> = {
  role: "Analista financeiro",
  card: "Previsões, modelos e orçamentos ligados a uma decisão que a empresa tomou.",
  description:
    "Exemplo de currículo de analista financeiro: linhas de FP&A com previsões, orçamentos e modelos que guiaram decisões, e as habilidades de Excel das vagas.",
  intro:
    "Um analista financeiro é avaliado por uma pergunta: a liderança confia nos números dele o bastante para agir? Por isso, cada linha aqui cita o modelo ou a previsão, o quanto chegou perto e a decisão que alimentou: um preço, um orçamento ou uma loja que nunca abriu.",
  person:
    "Ryan é inventado: um analista de FP&A com 4 anos numa varejista de artigos para casa em Dallas, que começou com um estágio de verão num banco. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de analista financeiro",
    basics: {
      headline: "Analista financeiro, FP&A",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Analista financeiro com 4 anos em FP&A numa varejista de US$ 600 milhões, criando as previsões, os orçamentos e os modelos de preço que a liderança usa para decidir. Trabalha com Excel, SQL e NetSuite e explica os números num memorando de uma página.",
    experience: [
      {
        title: "Analista financeiro sênior",
        bullets: [
          "Criei a previsão mensal de vendas de 85 lojas em Excel e SQL, reduzindo o erro de 9% para 3,5% ao incluir promoções e clima no modelo.",
          "Modelei o payback de 6 lojas propostas e recomendei descartar as 2 que não se pagavam em 3 anos, economizando US$ 7 milhões em capital.",
          "Conduzi a revisão mensal de orçado versus realizado com 9 gestores de área, explicando toda diferença acima de US$ 50.000 num memorando de uma página.",
          "Automatizei o pacote de variações do fechamento mensal com Power Query, reduzindo-o de 3 dias para 4 horas.",
        ],
      },
      {
        title: "Analista financeiro",
        bullets: [
          "Precifiquei uma nova taxa de entrega com um modelo de 400.000 pedidos, somando US$ 2,1 milhões por ano em margem sem queda mensurável no volume de pedidos.",
          "Preparei o orçamento anual de 4 departamentos, num total de US$ 38 milhões, e o entreguei 2 semanas antes do prazo do conselho.",
        ],
      },
      {
        title: "Estagiário em análise financeira",
        bullets: [
          "Criei um modelo de fluxo de caixa para 25 análises de empréstimos a pequenas empresas, usado por 3 analistas de crédito em seus pareceres de aprovação.",
        ],
      },
    ],
    education: [{ degree: "B.B.A.", field: "Finanças" }],
    skills: [
      {
        label: "Finanças",
        items: ["Modelagem financeira", "Previsões", "Orçamento", "Análise de variações", "FP&A"],
      },
      { label: "Ferramentas", items: ["Excel", "SQL", "Power Query", "NetSuite", "Power BI"] },
    ],
    certifications: [{ name: "CFA Level I (aprovado)" }],
  },
  lines: [
    {
      weak: "Preparei relatórios mensais de variações.",
      strong:
        "Conduzi a revisão mensal de orçado versus realizado com 9 gestores de área, explicando toda diferença acima de US$ 50.000 num memorando de uma página.",
    },
    {
      weak: "Encarregado de montar a previsão de vendas.",
      strong:
        "Criei a previsão mensal de vendas de 85 lojas em Excel e SQL, reduzindo o erro de 9% para 3,5% ao incluir promoções e clima no modelo.",
    },
    {
      weak: "Auxiliei na modelagem financeira para a abertura de novas lojas.",
      strong:
        "Modelei o payback de 6 lojas propostas e recomendei descartar as 2 que não se pagavam em 3 anos, economizando US$ 7 milhões em capital.",
    },
  ],
  skills: [
    { label: "Finanças" },
    { label: "Planilhas e dados" },
    { label: "Sistemas e certificações" },
  ],
  tips: [
    {
      title: "Diga o quanto a previsão acertou",
      text: "Erro de previsão, variação do orçamento, com que frequência a liderança usou o modelo. A precisão é o número que mais importa para um gestor de finanças, e poucos currículos a mostram.",
    },
    {
      title: "Ligue cada modelo a uma decisão",
      text: "Um modelo que não levou ninguém a agir é lição de casa. Diga o que a empresa fez por causa dele: um preço que mudou, uma loja que não abriu, um orçamento que remanejou.",
    },
    {
      title: "Mostre o tamanho do que você cobria",
      text: "Receita, orçamento ou tamanho da carteira dizem a quem lê o seu nível na hora. Escreva o valor em dólares dentro da linha, como um orçamento de US$ 38 milhões em 4 departamentos.",
    },
  ],
  mistakes: [
    {
      title: "“Preparei relatórios financeiros”",
      text: "Todo analista prepara. Diga qual relatório, quem o lia e o que essa pessoa mudou depois de ler.",
    },
    {
      title: "Listar o Excel e parar aí",
      text: "O Excel é esperado neste trabalho. Diga o que você construiu nele, como uma previsão por direcionadores, um modelo das três demonstrações ou um pacote de variações automatizado, e o que isso poupou.",
    },
    {
      title: "Assumir os resultados da empresa",
      text: "Se a empresa bateu as metas, essa linha não é sua. Fique na previsão, na análise ou na decisão que eram suas, com o número delas.",
    },
  ],
  faq: [
    {
      question: "Que habilidades um currículo de analista financeiro deve mostrar?",
      answer:
        "Modelagem financeira, previsões e orçamento, quase sempre Excel e, com frequência, SQL, uma ferramenta de BI e o ERP da empresa, como NetSuite ou SAP. Mostre cada uma dentro de uma linha em que ela gerou um número.",
    },
    {
      question: "Devo colocar meu progresso no CFA no currículo?",
      answer:
        "Sim, se fizer sentido para a vaga. Escreva o nível em que você passou e o ano, ou que você é candidato ao Level II, com a data da prova. Isso pesa mais em cargos de investimentos do que em FP&A.",
    },
    {
      question: "FP&A é o mesmo que analista financeiro?",
      answer:
        "FP&A é um tipo de analista financeiro: planejamento, orçamento e previsões dentro de uma empresa. Analistas de investimentos e de crédito são outros tipos. Use o cargo da vaga se o seu trabalho corresponder a ele.",
    },
  ],
};
