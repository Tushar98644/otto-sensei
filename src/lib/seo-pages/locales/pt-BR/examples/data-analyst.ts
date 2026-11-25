import type { ExampleWords } from "../../../examples";

export const dataAnalyst: ExampleWords<"data-analyst"> = {
  role: "Analista de dados",
  card: "Trabalho em SQL, Python e Power BI que termina numa decisão que alguém tomou.",
  description:
    "Exemplo de currículo de analista de dados: linhas em SQL, Excel e Power BI que mostram a decisão que cada análise mudou, e as habilidades das vagas.",
  intro:
    "Todo analista de dados sabe SQL e uma ferramenta de dashboards, então só isso não diferencia você. O que diferencia é a decisão que o seu trabalho mudou: um preço, um orçamento, um processo. Este exemplo termina cada linha com uma.",
  person:
    "Emily é inventada: uma analista de dados com 3 anos em varejo e delivery de comida em Houston. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de analista de dados",
    basics: {
      headline: "Analista de dados",
      links: [{ label: "Portfólio" }],
    },
    summary:
      "Analista de dados com 3 anos transformando dados de vendas e entregas em decisões para equipes de operações e marketing. Trabalha principalmente com SQL, Python e Power BI.",
    experience: [
      {
        title: "Analista de dados",
        bullets: [
          "Criei um dashboard no Power BI com os tempos de entrega por região que 30 gerentes de cidade usam na revisão semanal.",
          "Descobri que 18% dos atrasos vinham de 4 cozinhas com um só grupo de entregadores, o que levou a uma mudança de escala que cortou os atrasos em um terço.",
          "Escrevi modelos SQL no BigQuery para as métricas diárias de pedidos, substituindo 12 relatórios manuais em Excel e poupando 10 horas por semana à equipe.",
          "Rodei um teste A/B da mensagem sobre a taxa de entrega em 200.000 pedidos, o que levou a manter uma mudança que aumentou em 4% os pedidos recorrentes.",
        ],
      },
      {
        title: "Analista de MIS",
        bullets: [
          "Automatizei o relatório semanal de estoque com Python e Pandas, reduzindo-o de 6 horas de copiar e colar para 15 minutos.",
          "Criei um modelo no Excel de giro de vendas por loja que remanejou estoque parado entre 45 lojas antes da liquidação de fim de estação.",
        ],
      },
    ],
    projects: [
      {
        name: "Chuva e pedidos na cidade",
        tech: "Python, Tableau",
        bullets: [
          "Cruzei dados públicos de chuva com 2 anos de pedidos para mostrar como a chuva muda a demanda por hora, e publiquei o resultado numa história do Tableau.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Estatística" }],
    skills: [
      {
        label: "Análise",
        items: ["SQL", "Python", "Pandas", "Excel", "Estatística", "Testes A/B"],
      },
      { label: "Ferramentas de BI", items: ["Power BI", "Tableau", "BigQuery", "Google Sheets"] },
    ],
    certifications: [{ name: "Microsoft Certified: Power BI Data Analyst Associate" }],
  },
  lines: [
    {
      weak: "Criei dashboards e relatórios para a gestão.",
      strong:
        "Criei um dashboard no Power BI com os tempos de entrega por região que 30 gerentes de cidade usam na revisão semanal.",
    },
    {
      weak: "Analisei dados para encontrar insights.",
      strong:
        "Descobri que 18% dos atrasos vinham de 4 cozinhas com um só grupo de entregadores, o que levou a uma mudança de escala que cortou os atrasos em um terço.",
    },
    {
      weak: "Responsável pelos relatórios semanais em Excel.",
      strong:
        "Automatizei o relatório semanal de estoque com Python e Pandas, reduzindo-o de 6 horas de copiar e colar para 15 minutos.",
    },
  ],
  skills: [{ label: "Consultas e código" }, { label: "Planilhas e BI" }, { label: "Métodos" }],
  tips: [
    {
      title: "Termine cada linha com a decisão",
      text: "“Criei um dashboard” é uma tarefa. “Criei um dashboard que 30 gerentes usam para planejar a equipe” é um resultado. A decisão é o que quem contrata está pagando.",
    },
    {
      title: "Diga qual ferramenta, na linha",
      text: "As vagas costumam citar SQL e mais uma entre Power BI, Tableau ou Looker. Se você usou a que elas citam, diga isso na linha em que a usou, para que a verificação de compatibilidade do Otto a encontre demonstrada, não só listada.",
    },
    {
      title: "Cargos de MIS contam",
      text: "Na Índia, muitos analistas começam como executivos de MIS. Mantenha o cargo como era e deixe as linhas mostrarem a análise: automações, modelos e relatórios que mudaram alguma coisa.",
    },
  ],
  mistakes: [
    {
      title: "Listar todo tipo de gráfico",
      text: "Gráficos de pizza e tabelas dinâmicas não são habilidades por si só. Cite as ferramentas e depois mostre o que uma análise mudou.",
    },
    {
      title: "Insights sem número",
      text: "“Encontrei insights que melhoraram as vendas” não dá para verificar. Diga o que você encontrou, de que tamanho era e o que a equipe fez depois.",
    },
    {
      title: "Uma lista do Kaggle no lugar de trabalho",
      text: "Um projeto com dados reais e bagunçados e uma pergunta clara vale mais que cinco notebooks de tutorial. Coloque o trabalho de emprego primeiro, se tiver.",
    },
  ],
  faq: [
    {
      question: "Que habilidades um currículo de analista de dados deve mostrar?",
      answer:
        "SQL e uma ferramenta de dashboards quase sempre, Excel quase sempre também, e Python ou R com frequência. Estatística e testes A/B importam para equipes de produto e marketing. Mostre cada uma dentro de uma linha em que você a usou.",
    },
    {
      question: "Devo incluir um portfólio como analista de dados?",
      answer:
        "Sim, se você tiver um projeto que saiba explicar bem. Coloque o link de um texto curto ou de um dashboard com a pergunta, os dados, o que você encontrou e o que alguém deveria fazer a respeito.",
    },
    {
      question: "O currículo de analista de dados é diferente do de cientista de dados?",
      answer:
        "Principalmente na ênfase. Analistas mostram decisões tomadas a partir de relatórios e análises; cientistas de dados mostram modelos, experimentos e como eles chegaram à produção.",
    },
  ],
};
