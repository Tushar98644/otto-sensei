import type { ExampleWords } from "../../../examples";

export const dataScientist: ExampleWords<"data-scientist"> = {
  role: "Cientista de dados",
  card: "Modelos ligados a um resultado de negócio, e como cada um chegou à produção.",
  description:
    "Exemplo de currículo de cientista de dados: linhas de machine learning com o resultado de negócio e o caminho até a produção, e as habilidades das vagas.",
  intro:
    "Currículos de ciência de dados muitas vezes parecem ementas de curso: modelos, bibliotecas, métricas. Quem contrata quer saber qual modelo chegou à produção e o que ele mudou. Este exemplo liga cada modelo a um resultado que importaria para alguém de fora da equipe.",
  person:
    "Maya é inventada: uma cientista de dados com 4 anos em seguros e fintech em Boston. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de cientista de dados",
    basics: {
      headline: "Cientista de dados",
      links: [{ label: "Portfólio" }],
    },
    summary:
      "Cientista de dados com 4 anos criando modelos de precificação e fraude em Python, do primeiro notebook à produção. Fica à vontade explicando um modelo para as pessoas que precisam confiar nele.",
    experience: [
      {
        title: "Cientista de dados sênior",
        bullets: [
          "Criei em Python um modelo de fraude em sinistros com gradient boosting que aponta 2 em cada 3 fraudes confirmadas, contra 1 em cada 3 com as regras antigas.",
          "Coloquei o modelo em produção como serviço FastAPI na AWS com monitoramento de drift, pontuando 40.000 sinistros por dia.",
          "Conduzi um experimento de preços em 6 regiões com um grupo de controle, mostrando um ganho de margem de 3% antes da implantação completa.",
        ],
      },
      {
        title: "Cientista de dados",
        bullets: [
          "Treinei um modelo de churn com scikit-learn que permitiu ao suporte ligar para 500 clientes em risco por mês, reduzindo o churn nesse grupo em 11%.",
          "Criei um pipeline de features em Spark e Airflow que reduziu o preparo de dados de treino de 2 dias para 3 horas.",
          "Ensinei machine learning básico a 25 analistas num curso interno de 6 semanas com exercícios semanais.",
        ],
      },
    ],
    projects: [
      {
        name: "Previsão de atrasos no transporte público",
        tech: "PyTorch, Pandas",
        bullets: [
          "Previ atrasos de ônibus a partir de dados abertos da cidade com uma pequena rede neural, superando em 14% uma linha de base sazonal num mês separado para teste.",
        ],
      },
    ],
    education: [
      { degree: "M.S.", field: "Estatística" },
      { degree: "B.S.", field: "Matemática" },
    ],
    skills: [
      { label: "Linguagens", items: ["Python", "SQL", "R"] },
      {
        label: "Modelagem",
        items: ["scikit-learn", "PyTorch", "Machine learning", "Estatística", "Testes A/B"],
      },
      { label: "Dados e deploy", items: ["Spark", "Airflow", "AWS", "Docker", "MLOps"] },
    ],
  },
  lines: [
    {
      weak: "Criei modelos de machine learning usando Python.",
      strong:
        "Criei em Python um modelo de fraude em sinistros com gradient boosting que aponta 2 em cada 3 fraudes confirmadas, contra 1 em cada 3 com as regras antigas.",
    },
    {
      weak: "Coloquei modelos em produção.",
      strong:
        "Coloquei o modelo em produção como serviço FastAPI na AWS com monitoramento de drift, pontuando 40.000 sinistros por dia.",
    },
    {
      weak: "Trabalhei com as partes interessadas em experimentos.",
      strong:
        "Conduzi um experimento de preços em 6 regiões com um grupo de controle, mostrando um ganho de margem de 3% antes da implantação completa.",
    },
  ],
  skills: [{ label: "Código" }, { label: "Modelagem" }, { label: "Dados e produção" }],
  tips: [
    {
      title: "Traduza a métrica",
      text: "AUC de 0,91 diz pouco a quem contrata fora da equipe. “Aponta 2 em cada 3 fraudes em vez de 1 em cada 3” diz o mesmo, e qualquer pessoa entende. Se quiser, dê os dois.",
    },
    {
      title: "Mostre o caminho até a produção",
      text: "Diga como o modelo era servido, com que frequência roda e como você sabia que ele ainda funcionava. É isso que separa um cientista de dados de um notebook.",
    },
    {
      title: "Descreva o trabalho com LLMs de forma simples",
      text: "Se você já criou algo com grandes modelos de linguagem, diga o que o sistema fazia, como você mediu e quanto custava. “Trabalhei com GenAI” não diz nada a quem lê.",
    },
  ],
  mistakes: [
    {
      title: "Uma lista de algoritmos",
      text: "Random forests, XGBoost, k-means e LSTMs em sequência parecem uma ementa. Cite o método dentro da linha em que ele resolveu um problema.",
    },
    {
      title: "Acurácia num problema desbalanceado",
      text: "“98% de acurácia” em fraude é fácil se a fraude é 1% dos casos, e entrevistadores sabem disso. Use a métrica que combina com o problema e diga por quê.",
    },
    {
      title: "Nenhuma noção de escala",
      text: "Linhas, usuários, previsões por dia, dinheiro em jogo. Sem um desses, quem lê não distingue um projeto de faculdade de um sistema em produção.",
    },
  ],
  faq: [
    {
      question: "Um currículo de cientista de dados deve listar competições do Kaggle?",
      answer:
        "Só uma boa colocação, e só se você souber falar sobre ela. Trabalho de emprego e um projeto bem explicado costumam contar mais.",
    },
    {
      question: "Preciso de mestrado no currículo?",
      answer:
        "Liste seu diploma mais alto e a área. Muitas equipes contratam sem mestrado se o trabalho mostra as habilidades; a seção de experiência é onde você prova isso.",
    },
    {
      question: "Quão técnico deve ser um currículo de cientista de dados?",
      answer:
        "Técnico o bastante para quem entrevista e simples o bastante para o recrutador que lê primeiro. Cite o método e as ferramentas, e termine a linha com o resultado de negócio.",
    },
  ],
};
