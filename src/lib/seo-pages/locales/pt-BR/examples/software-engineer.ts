import type { ExampleWords } from "../../../examples";

export const softwareEngineer: ExampleWords<"software-engineer"> = {
  role: "Engenheiro de software",
  card: "Quatro anos em sistemas de pagamento, com a stack e um número em cada linha.",
  description:
    "Exemplo de currículo de engenheiro de software: linhas com impacto, as habilidades das vagas, dicas de cargo para qualquer mercado e erros a evitar.",
  intro:
    "Quem contrata lê um currículo de engenharia de software procurando três coisas: o que você entregou, qual era o tamanho e com que stack você fez. Este exemplo coloca as três em cada linha, para que tanto as pessoas quanto o software de recrutamento as encontrem.",
  person:
    "Imani é inventada: uma engenheira com perfil mais backend e 4 anos em sistemas de pagamento em Nova York. Nomes, empresas e números são inventados; copie a estrutura, não os fatos.",
  resume: {
    title: "Currículo de engenheira de software",
    basics: {
      headline: "Engenheira de software",
      links: [{ label: "Portfólio" }],
    },
    summary:
      "Engenheira de software com 4 anos em sistemas de pagamento com Java, Go e AWS. Cuida de serviços da revisão de design ao plantão e os mede depois do lançamento.",
    experience: [
      {
        title: "Engenheira de software II",
        bullets: [
          "Criei uma camada de idempotência em Go para os callbacks de pagamentos ACH, reduzindo os reembolsos duplicados de 0,4% dos repasses para menos de 0,05%.",
          "Passei o relatório de liquidação de um job noturno em lote para streams no Kafka, para que os lojistas vejam os valores liquidados em até 10 minutos.",
          "Liderei com outro engenheiro a migração de 14 serviços do EC2 para Kubernetes na AWS, sem indisponibilidade para os clientes.",
          "Escrevi o runbook de plantão e as regras de alerta no Grafana, reduzindo os acionamentos semanais de 22 para 6 em dois trimestres.",
        ],
      },
      {
        title: "Engenheira de software",
        bullets: [
          "Lancei uma API REST de exportação de faturas em Java e Spring Boot, hoje usada por 1.800 pequenas empresas todo mês.",
          "Reduzi a latência p95 do endpoint de busca de faturas de 1,2 s para 280 ms adicionando índices compostos e um cache Redis.",
          "Adicionei testes de contrato ao pipeline de CI/CD que pegaram 9 mudanças incompatíveis na API antes do lançamento em um ano.",
        ],
      },
    ],
    projects: [
      {
        name: "ledgerlite",
        tech: "Go, PostgreSQL",
        bullets: [
          "Publiquei uma biblioteca open source de razão contábil de partidas dobradas que 3 equipes da Paysprout hoje usam para saldos de carteiras.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Ciência da Computação" }],
    skills: [
      { label: "Linguagens", items: ["Java", "Go", "Python", "SQL"] },
      {
        label: "Backend",
        items: ["Spring Boot", "Kafka", "PostgreSQL", "Redis", "REST", "gRPC"],
      },
      { label: "Nuvem", items: ["AWS", "Kubernetes", "Docker", "Terraform", "Grafana"] },
    ],
    certifications: [{ name: "AWS Certified Developer – Associate" }],
  },
  lines: [
    {
      weak: "Responsável pela manutenção do backend de pagamentos.",
      strong:
        "Mantive o backend de pagamentos com 99,95% de disponibilidade por um ano adicionando health checks, novas tentativas e um runbook de failover testado.",
    },
    {
      weak: "Trabalhei na melhoria do desempenho das nossas APIs.",
      strong:
        "Reduzi a latência p95 da API de busca de faturas de 1,2 s para 280 ms adicionando índices compostos e um cache Redis.",
    },
    {
      weak: "Migramos nossos serviços para Kubernetes.",
      strong:
        "Migrei com outro engenheiro 14 serviços do EC2 para Kubernetes na AWS, sem indisponibilidade para os clientes.",
    },
  ],
  skills: [{ label: "Linguagens" }, { label: "Frameworks e dados" }, { label: "Nuvem e entrega" }],
  tips: [
    {
      title: "Coloque a stack dentro da linha",
      text: "“Reduzi a latência com um cache Redis” mostra o Redis em ação. Uma habilidade que só aparece na sua lista de habilidades conta menos, para recrutadores e para a verificação de compatibilidade do Otto, que a marca como listada e não como demonstrada.",
    },
    {
      title: "Dê um tamanho a cada linha",
      text: "Requisições por segundo, usuários, serviços, dinheiro movimentado, minutos poupados. Um número basta para transformar uma tarefa num resultado, e dá ao entrevistador algo sobre o que perguntar.",
    },
    {
      title: "Escreva o cargo das duas formas",
      text: "Se a sua empresa diz SDE-2, escreva “Software Engineer II (SDE-2)”. Recrutadores na Índia buscam cargos SDE; empregadores de outros países buscam “software engineer”, e os dois devem encontrar você.",
    },
  ],
  mistakes: [
    {
      title: "Uma lista de 40 ferramentas",
      text: "Liste aquilo sobre o que você ficaria feliz em ser entrevistado. Ferramentas que você usou uma vez trazem perguntas que você não sabe responder e escondem as que importam para a vaga.",
    },
    {
      title: "Linhas sobre a equipe, não sobre você",
      text: "“Migramos nossos serviços” esconde a sua parte. A verificação de linhas do Otto aponta palavras como “nós” e “nossos” por isso: diga o que você fez, mesmo que outras pessoas tenham ajudado.",
    },
    {
      title: "Duas colunas e barras de habilidades",
      text: "O software de recrutamento lê direto através das colunas e não consegue ler uma barra. Uma coluna de texto real mantém seus empregos, datas e habilidades na ordem certa.",
    },
  ],
  faq: [
    {
      question: "Qual deve ser o tamanho de um currículo de engenheiro de software?",
      answer:
        "Uma página para a maioria das pessoas com menos de 5 anos de trabalho. Depois disso, duas páginas estão bem se cada linha merecer o seu lugar. A visão do recrutador do Otto aponta tudo o que passar de duas páginas.",
    },
    {
      question: "Devo incluir o link do meu GitHub ou portfólio?",
      answer:
        "Sim, se ele mostra trabalho sobre o qual você gostaria de falar. Um link para repositórios vazios ou abandonados faz mais mal do que nenhum link. Fixe primeiro os seus dois ou três melhores projetos.",
    },
    {
      question: "Devo colocar meu CTC ou meu aviso prévio no currículo?",
      answer:
        "Não. Recrutadores na Índia pedem o CTC atual, o CTC esperado e o aviso prévio no formulário de candidatura ou na primeira ligação. Deixe o currículo para o seu trabalho; informe esses números quando pedirem.",
    },
  ],
};
