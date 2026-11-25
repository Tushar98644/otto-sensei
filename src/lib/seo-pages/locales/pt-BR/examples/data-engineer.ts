import type { ExampleWords } from "../../../examples";

export const dataEngineer: ExampleWords<"data-engineer"> = {
  role: "Engenheiro de dados",
  card: "Pipelines com volume, atualização, falhas e custo em cada linha.",
  description:
    "Exemplo de currículo de engenheiro de dados: linhas em Spark, Airflow e SQL com volume, atualização e custo, as habilidades das vagas e erros comuns.",
  intro:
    "O trabalho de um engenheiro de dados aparece em tabelas em que outras pessoas confiam. O currículo precisa dizer quantos dados passaram, quão atualizados chegaram, quantas vezes quebraram e quanto custou rodar. Este exemplo coloca um desses números em cada linha.",
  person:
    "Marcus é inventado: um engenheiro de dados com 5 anos em análise de dados para bancos e varejo, em Charlotte, Carolina do Norte. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de engenheiro de dados",
    basics: {
      headline: "Engenheiro de dados",
      links: [{ label: "GitHub" }],
    },
    summary:
      "Engenheiro de dados com 5 anos criando pipelines batch e de streaming em Python, SQL e Spark. Foca em tabelas que chegam no horário, passam nas verificações e custam menos para rodar a cada trimestre.",
    experience: [
      {
        title: "Engenheiro de dados",
        bullets: [
          "Refiz 40 pipelines noturnos do Airflow em Spark e Snowflake, reduzindo a execução de 6 horas para 70 minutos para que os relatórios de finanças saiam toda manhã antes das 7h.",
          "Migrei os eventos de transações de cartão de cargas batch horárias para streams no Kafka, reduzindo o atraso dos dashboards de fraude de 60 para menos de 2 minutos.",
          "Adicionei testes do dbt a 220 modelos, pegando cerca de 35 cargas quebradas por trimestre antes que analistas abrissem um relatório.",
          "Reduzi a conta do Snowflake em 31% clusterizando as 5 maiores tabelas e suspendendo warehouses ociosos após 5 minutos.",
        ],
      },
      {
        title: "Desenvolvedor ETL",
        bullets: [
          "Escrevi jobs de ETL em Python que carregavam toda noite as vendas de 180 lojas no Redshift, substituindo 12 exportações de planilhas feitas à mão.",
          "Projetei um esquema estrela de pedidos e devoluções que 30 analistas consultam no Tableau, reduzindo o carregamento dos dashboards de 40 para 6 segundos.",
          "Criei alertas para cargas atrasadas e vazias, baixando os relatórios matinais perdidos de 9 por mês para 1.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Ciência da Computação" }],
    skills: [
      { label: "Linguagens", items: ["Python", "SQL", "Scala"] },
      { label: "Pipelines de dados", items: ["Spark", "Airflow", "dbt", "Kafka"] },
      { label: "Data warehouses e nuvem", items: ["Snowflake", "Redshift", "PostgreSQL", "AWS"] },
    ],
    certifications: [{ name: "Databricks Certified Data Engineer Associate" }],
  },
  lines: [
    {
      weak: "Trabalhei em pipelines de dados para a equipe de finanças.",
      strong:
        "Refiz 40 pipelines noturnos do Airflow em Spark e Snowflake, reduzindo a execução de 6 horas para 70 minutos para que os relatórios de finanças saiam toda manhã antes das 7h.",
    },
    {
      weak: "Responsável pela qualidade dos dados no warehouse.",
      strong:
        "Adicionei testes do dbt a 220 modelos, pegando cerca de 35 cargas quebradas por trimestre antes que analistas abrissem um relatório.",
    },
    {
      weak: "Ajudei a levar os relatórios para streaming em tempo real.",
      strong:
        "Migrei os eventos de transações de cartão de cargas batch horárias para streams no Kafka, reduzindo o atraso dos dashboards de fraude de 60 para menos de 2 minutos.",
    },
  ],
  skills: [
    { label: "Linguagens e processamento" },
    { label: "Pipelines e modelagem" },
    { label: "Data warehouses e nuvem" },
  ],
  tips: [
    {
      title: "Dê a cada pipeline um tamanho e um horário",
      text: "Linhas por dia, terabytes por mês, quanto tempo uma execução leva e quando os dados chegam. Quem lê não consegue avaliar um pipeline sem o tamanho e o prazo dele, então coloque os dois na linha.",
    },
    {
      title: "Diga quem lê suas tabelas",
      text: "Relatórios de finanças, dashboards de fraude, um modelo de preços: dizer quem usa os dados mostra por que o pipeline importava, e dá a quem entrevista uma boa primeira pergunta.",
    },
    {
      title: "Conte as falhas que você evitou",
      text: "Cargas atrasadas, execuções com falha, dados quebrados pegos por testes antes que alguém visse. Equipes de dados acompanham isso, então um antes e depois diz mais do que “melhorei a qualidade dos dados”.",
    },
  ],
  mistakes: [
    {
      title: "Um stack sem dados",
      text: "Spark, Airflow, Kafka, Snowflake e dbt numa linha poderiam descrever qualquer engenheiro de dados. Coloque cada ferramenta ao lado do trabalho que ela fez e do número que mudou.",
    },
    {
      title: "“Big data” sem tamanho",
      text: "Dois terabytes por dia e 80 gigabytes por semana são trabalhos reais, e bem diferentes. Escreva o volume que você processou em vez do rótulo.",
    },
    {
      title: "Só o caminho feliz",
      text: "Entrevistadores perguntam sobre a noite em que um pipeline falhou. Uma linha sobre backfills, dados atrasados ou uma mudança de esquema que você absorveu mostra que você já rodou pipelines em produção, não só os escreveu.",
    },
  ],
  faq: [
    {
      question: "O que um currículo de engenheiro de dados deve incluir?",
      answer:
        "Os pipelines que você construiu, as ferramentas em que rodavam e números de volume, tempo de execução, atualização, falhas ou custo. Inclua as equipes que usavam os dados, uma lista curta de habilidades e uma certificação, se tiver.",
    },
    {
      question: "O currículo de engenheiro de dados é diferente do de analista de dados?",
      answer:
        "Sim. As linhas de um analista terminam com uma decisão que alguém tomou a partir dos números; as de um engenheiro terminam com dados que chegaram mais rápido, mais limpos ou mais baratos. Se você está passando da análise para a engenharia, comece pelos pipelines que construiu para os seus próprios relatórios.",
    },
    {
      question: "Preciso de uma certificação de nuvem como engenheiro de dados?",
      answer:
        "Ajuda quando a vaga cita uma, mas linhas mostrando que você rodou pipelines naquela nuvem contam mais. Uma certificação atual da plataforma que você mais usa já basta.",
    },
  ],
};
