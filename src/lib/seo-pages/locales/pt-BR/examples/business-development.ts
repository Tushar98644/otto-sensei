import type { ExampleWords } from "../../../examples";

export const businessDevelopment: ExampleWords<"business-development"> = {
  role: "Desenvolvimento de negócios e vendas",
  card: "Cota, pipeline e ticket médio, do jeito que gerentes de vendas leem.",
  description:
    "Exemplo de currículo de desenvolvimento de negócios e vendas: linhas com cota, pipeline e ticket médio, as habilidades de CRM das vagas e erros comuns.",
  intro:
    "Vendas é o trabalho mais fácil de colocar em números e o lugar onde eles mais ficam de fora. Um gerente de vendas quer saber sua cota, com que frequência você a bate, seu ticket médio e como você encontrou os negócios. Este exemplo mostra os quatro.",
  person:
    "Andre é inventado: um gerente de desenvolvimento de negócios com 5 anos vendendo software para empresas de médio porte, em Atlanta. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de desenvolvimento de negócios",
    basics: {
      headline: "Gerente de desenvolvimento de negócios",
      links: [{ label: "Portfólio" }],
    },
    summary:
      "Gerente de desenvolvimento de negócios com 5 anos vendendo software de RH e folha de pagamento para empresas de 50 a 1.000 funcionários. Constrói pipeline com prospecção fria e fecha com líderes de finanças e RH.",
    experience: [
      {
        title: "Gerente de desenvolvimento de negócios",
        bullets: [
          "Fechei 128% da cota anual de novos negócios no ano fiscal de 2025, com 31 contas novas e ticket médio de US$ 10.500 por ano.",
          "Gerei 60% do pipeline pelo LinkedIn e por ligações de prospecção, com 2 SDRs marcando demos a partir de uma lista de alvos compartilhada.",
          "Reduzi o ciclo de vendas de negócios de médio porte de 74 para 52 dias adicionando um teste de folha de pagamento com os dados do próprio cliente.",
          "Mantive as notas e os próximos passos no Salesforce em dia, para que as reuniões de previsão caíssem de 45 para 20 minutos.",
        ],
      },
      {
        title: "Executivo de desenvolvimento de negócios",
        bullets: [
          "Assinei 22 novas contas de embarcadores em 2022, trazendo US$ 360.000 por ano em receita de frete.",
          "Liguei para 60 novos embarcadores por dia e converti 8% das primeiras reuniões em testes.",
          "Recuperei 9 contas perdidas oferecendo uma revisão de serviço de 30 dias com a equipe de operações de cada cliente.",
        ],
      },
    ],
    education: [
      { degree: "MBA", field: "Marketing" },
      { degree: "B.S.", field: "Administração de Empresas" },
    ],
    skills: [
      {
        label: "Vendas",
        items: [
          "Desenvolvimento de negócios",
          "Geração de leads",
          "Prospecção por telefone",
          "Negociação",
          "Gestão de contas",
        ],
      },
      {
        label: "Ferramentas",
        items: ["Salesforce", "HubSpot", "LinkedIn Sales Navigator", "Excel"],
      },
    ],
  },
  lines: [
    {
      weak: "Gerei leads e fechei negócios.",
      strong:
        "Fechei 128% da cota anual de novos negócios no ano fiscal de 2025, com 31 contas novas e ticket médio de US$ 10.500 por ano.",
    },
    {
      weak: "Excelentes habilidades de comunicação e histórico comprovado em vendas.",
      strong:
        "Reduzi o ciclo de vendas de negócios de médio porte de 74 para 52 dias adicionando um teste de folha de pagamento com os dados do próprio cliente.",
    },
    {
      weak: "Fiz ligações frias para potenciais clientes.",
      strong:
        "Liguei para 60 novos embarcadores por dia e converti 8% das primeiras reuniões em testes.",
    },
  ],
  skills: [{ label: "Vendas" }, { label: "Funil de vendas" }, { label: "Métodos" }],
  tips: [
    {
      title: "Primeiro a cota, depois o como",
      text: "Porcentagem da cota, o período, o número de negócios e o ticket médio. Depois, uma ou duas linhas sobre como você construiu o pipeline. Essa ordem segue o jeito como gerentes de vendas leem.",
    },
    {
      title: "Escreva valores na moeda do mercado em que você se candidata",
      text: "Lakh e crore soam naturais para empregadores indianos. Para vagas no exterior, converta para dólares americanos ou para a moeda local, para que o tamanho dos seus negócios fique claro num relance.",
    },
    {
      title: "Diga para quem você vendeu",
      text: "Porte da empresa, setor e o cargo de quem compra. Vender para diretores de RH em empresas de 200 pessoas é um trabalho diferente de vender para o setor de compras de um banco.",
    },
  ],
  mistakes: [
    {
      title: "Qualidades em vez de resultados",
      text: "“Excelentes habilidades de comunicação” é algo que todo mundo afirma. A verificação de linhas do Otto aponta isso como frase feita; um negócio fechado prova.",
    },
    {
      title: "Receita sem cota",
      text: "“Trouxe 2 crore” pode ser ótimo ou abaixo da meta. Diga a cota ou sua posição na equipe para o número ter uma escala.",
    },
    {
      title: "Esconder as partes difíceis",
      text: "Prospecção fria, ciclos longos e negócios perdidos que você recuperou são o que entrevistadores perguntam. Mostre que você sabe encontrar negócios, não só atendê-los.",
    },
  ],
  faq: [
    {
      question: "O que um currículo de vendas ou de desenvolvimento de negócios deve mostrar?",
      answer:
        "Atingimento da cota, número e tamanho dos negócios, ciclo de vendas e como você construiu o pipeline. Inclua o CRM que usou e o tipo de cliente para quem vendeu.",
    },
    {
      question: "Devo mostrar minhas metas em lakh ou em dólares?",
      answer:
        "Use a moeda com que o empregador trabalha. Lakh e crore servem para empregadores na Índia; para vagas no exterior, converta para dólares ou mostre porcentagens da cota.",
    },
    {
      question: "Posso incluir prêmios como melhor desempenho?",
      answer:
        "Sim, com a escala: “Top 3 entre 40 executivos de contas em 2024” diz mais que “Profissional destaque”. Deixe de fora prêmios que você não consegue explicar numa frase.",
    },
  ],
};
