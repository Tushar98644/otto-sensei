import type { ExampleWords } from "../../../examples";

export const accountExecutive: ExampleWords<"account-executive"> = {
  role: "Executivo de contas",
  card: "Cota, taxa de fechamento, ticket médio e ciclo de vendas em negócios de software.",
  description:
    "Exemplo de currículo de executivo de contas: linhas de vendas SaaS com cota, taxa de fechamento, ticket e ciclo, e as habilidades de CRM das vagas.",
  intro:
    "Um executivo de contas é contratado para fechar negócios, então quem lidera vendas lê primeiro a cota e o atingimento. Depois vêm ticket médio, taxa de fechamento e duração do ciclo, porque mostram como você fecha. Este exemplo coloca tudo isso onde quem lê encontra em segundos.",
  person:
    "Megan é inventada: uma executiva de contas com 5 anos vendendo software de finanças e análise de dados, em Chicago. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de executiva de contas",
    basics: {
      headline: "Executiva de contas enterprise",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Executiva de contas com 5 anos vendendo software para equipes de finanças de empresas mid-market e enterprise. Fechou US$ 2,4 milhões em nova receita anual no ano passado, 120% da cota, conduzindo negócios da primeira ligação ao contrato assinado.",
    experience: [
      {
        title: "Executiva de contas enterprise",
        bullets: [
          "Fechei US$ 2,4 milhões em nova receita recorrente anual em 2025 frente a uma cota de US$ 2,0 milhões, terminando em 2º lugar entre 14 executivos de contas.",
          "Aumentei a taxa de fechamento das oportunidades qualificadas de 22% para 31% com revisões MEDDICC em todo negócio acima de US$ 50.000.",
          "Encurtei o ciclo médio de vendas de 120 para 84 dias trazendo as revisões de segurança e jurídicas para o primeiro mês.",
          "Gerei 40% do pipeline com ligações de prospecção e abordagens pelo LinkedIn, marcando cerca de 25 primeiras reuniões por mês.",
        ],
      },
      {
        title: "Executiva de contas, mid-market",
        bullets: [
          "Superei a cota em 8 de 10 trimestres, com atingimento médio de 112% sobre uma meta anual de US$ 780.000.",
          "Aumentei o ticket médio de US$ 18.000 para US$ 29.000 oferecendo o módulo de folha de pagamento em toda primeira demo.",
          "Mantive a previsão trimestral no Salesforce com desvio de até 10% das vendas fechadas por 8 trimestres seguidos.",
        ],
      },
    ],
    education: [{ degree: "B.A.", field: "Comunicação" }],
    skills: [
      {
        label: "Vendas",
        items: [
          "Negociação",
          "Gestão de pipeline",
          "Previsão de vendas",
          "Prospecção por telefone",
          "MEDDICC",
        ],
      },
      { label: "Ferramentas", items: ["Salesforce", "Gong", "Salesloft", "HubSpot", "Excel"] },
    ],
  },
  lines: [
    {
      weak: "Bati e superei as metas de vendas de forma consistente.",
      strong:
        "Superei a cota em 8 de 10 trimestres, com atingimento médio de 112% sobre uma meta anual de US$ 780.000.",
    },
    {
      weak: "Lidei com negócios enterprise do início ao fim.",
      strong:
        "Fechei US$ 2,4 milhões em nova receita recorrente anual em 2025 frente a uma cota de US$ 2,0 milhões, terminando em 2º lugar entre 14 executivos de contas.",
    },
    {
      weak: "Fiz parte de uma equipe que melhorou a taxa de fechamento.",
      strong:
        "Aumentei a taxa de fechamento das oportunidades qualificadas de 22% para 31% com revisões MEDDICC em todo negócio acima de US$ 50.000.",
    },
  ],
  skills: [{ label: "Vendas" }, { label: "Negócios e contas" }, { label: "Ferramentas de vendas" }],
  tips: [
    {
      title: "Coloque cota e resultado na mesma linha",
      text: "“US$ 2,4 milhões frente a uma cota de US$ 2,0 milhões” deixa quem lidera vendas calcular o atingimento e o tamanho da sua meta num relance. Uma porcentagem sozinha esconde o tamanho da meta.",
    },
    {
      title: "Mostre seu ticket e seu ciclo",
      text: "Vender negócios de US$ 8.000 em duas semanas e de US$ 200.000 em seis meses são trabalhos diferentes. Dê os dois números para que quem contrata saiba que tipo de venda você conhece.",
    },
    {
      title: "Diga quanto pipeline você gerou",
      text: "A maioria das vagas de AE espera que você encontre parte do seu próprio pipeline. Uma linha sobre reuniões outbound marcadas ou pipeline criado mostra que você não espera o marketing mandar leads.",
    },
  ],
  mistakes: [
    {
      title: "Um prêmio sem números",
      text: "O President's Club diz a quem lê que você foi bem; a cota e o atingimento por trás dele dizem o quanto. Mantenha o prêmio e coloque os números na mesma linha.",
    },
    {
      title: "Uma colocação sem o tamanho do grupo",
      text: "“Top vendedor” vale mais quando quem lê sabe que foi o 2º de 14. Diga o tamanho da equipe com quem você foi comparado e o período.",
    },
    {
      title: "Cada funcionalidade que você demonstrou",
      text: "Funcionalidades do produto ficam na apresentação de vendas. O currículo precisa de quem comprou, quanto pagou e o que fez a pessoa assinar.",
    },
  ],
  faq: [
    {
      question: "O que um currículo de executivo de contas deve incluir?",
      answer:
        "Cota e atingimento de cada ano, ticket médio, ciclo de vendas, taxa de fechamento, o segmento para o qual você vendeu e o CRM que usou. Líderes de vendas querem dois ou três anos de números, não um único bom trimestre.",
    },
    {
      question: "Como passar de SDR para executivo de contas no currículo?",
      answer:
        "Comece pelos números que preveem fechamento: reuniões marcadas, pipeline criado e quanto dele virou receita. Inclua os negócios que você conduziu sozinho, mesmo os pequenos, e mostre a promoção, se teve uma.",
    },
    {
      question: "Devo mostrar minha cota se não bati?",
      answer:
        "Sim, com o contexto que torna a comparação justa: um território novo, um período de ramp-up ou um mercado que encolheu. Deixar a cota de fora faz quem lê supor o pior, e vão perguntar na entrevista de qualquer jeito.",
    },
  ],
};
