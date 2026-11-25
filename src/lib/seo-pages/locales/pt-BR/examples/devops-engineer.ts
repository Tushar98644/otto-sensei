import type { ExampleWords } from "../../../examples";

export const devopsEngineer: ExampleWords<"devops-engineer"> = {
  role: "Engenheiro de DevOps",
  card: "Deploys, tempo de recuperação e custo de nuvem, os números que guiam equipes de plantão.",
  description:
    "Exemplo de currículo de engenheiro de DevOps: linhas de Kubernetes, Terraform e CI/CD com deploys, uptime e custo de nuvem, habilidades e erros comuns.",
  intro:
    "DevOps é avaliado pelo que para de acontecer: deploys com falha, quedas longas, contas de nuvem que pegam todo mundo de surpresa. O currículo precisa transformar esse silêncio em números, como a frequência com que as equipes entregam, a rapidez com que se recuperam e quanto a plataforma custa. Este exemplo mostra cada um deles.",
  person:
    "Sofia é inventada: uma engenheira de DevOps com 5 anos em software de saúde e varejo online, em Salt Lake City, Utah. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de engenheira de DevOps",
    basics: {
      headline: "Engenheira de DevOps",
      links: [{ label: "GitHub" }],
    },
    summary:
      "Engenheira de DevOps com 5 anos operando plataformas AWS e Kubernetes para equipes de produto. Cria pipelines e infraestrutura como código para que as equipes publiquem todo dia e se recuperem de incidentes em minutos.",
    experience: [
      {
        title: "Engenheira de DevOps",
        bullets: [
          "Migrei 45 serviços de servidores EC2 montados à mão para Kubernetes com Helm, aumentando os deploys de 3 por semana para 20 por dia.",
          "Escrevi módulos de Terraform para redes, bancos de dados e clusters que 9 equipes de produto usam hoje, reduzindo a criação de ambientes de 2 semanas para 1 dia.",
          "Configurei alertas no Prometheus e no Grafana ligados a objetivos de nível de serviço, reduzindo o tempo médio de recuperação de 75 para 18 minutos.",
          "Reduzi a conta da AWS em US$ 38.000 por mês levando jobs batch para instâncias spot e apagando 600 volumes sem uso.",
        ],
      },
      {
        title: "Engenheira de nuvem",
        bullets: [
          "Criei um pipeline no GitHub Actions com testes automatizados e rollback em um clique, reduzindo as versões com falha de 1 em 8 para 1 em 40.",
          "Escrevi playbooks de Ansible que aplicaram patches em 300 servidores Linux numa só noite, em vez de ao longo de 2 fins de semana.",
          "Conduzi 4 simulações de recuperação de desastres por ano, reduzindo o tempo de restauração do banco de dados de 6 horas para 45 minutos.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Engenharia da Computação" }],
    skills: [
      { label: "Nuvem", items: ["AWS", "Terraform", "Kubernetes", "Helm", "Docker"] },
      {
        label: "Entrega e monitoramento",
        items: ["GitHub Actions", "Jenkins", "Prometheus", "Grafana", "Datadog"],
      },
      { label: "Scripts", items: ["Python", "Bash", "Go", "Linux"] },
    ],
    certifications: [{ name: "Certified Kubernetes Administrator (CKA)" }],
  },
  lines: [
    {
      weak: "Estive envolvida em migrar serviços para Kubernetes.",
      strong:
        "Migrei 45 serviços de servidores EC2 montados à mão para Kubernetes com Helm, aumentando os deploys de 3 por semana para 20 por dia.",
    },
    {
      weak: "Lidei com o monitoramento e o plantão de produção.",
      strong:
        "Configurei alertas no Prometheus e no Grafana ligados a objetivos de nível de serviço, reduzindo o tempo médio de recuperação de 75 para 18 minutos.",
    },
    {
      weak: "Responsável pelo pipeline de releases.",
      strong:
        "Criei um pipeline no GitHub Actions com testes automatizados e rollback em um clique, reduzindo as versões com falha de 1 em 8 para 1 em 40.",
    },
  ],
  skills: [
    { label: "Nuvem e infraestrutura" },
    { label: "Containers e entrega" },
    { label: "Monitoramento e scripts" },
  ],
  tips: [
    {
      title: "Use os quatro números de entrega",
      text: "Com que frequência você faz deploy, quanto tempo uma mudança leva até a produção, quantas versões falham e com que rapidez você se recupera. Líderes de engenharia acompanham esses números, então um deles numa linha mostra que você fala a língua.",
    },
    {
      title: "Conte as equipes que você destravou",
      text: "Trabalho de plataforma é feito para outros engenheiros. Diga quantas equipes ou serviços usam o que você construiu e quanta espera isso tirou da semana delas.",
    },
    {
      title: "Coloque um valor em dólares na economia de nuvem",
      text: "Uma economia mensal ou anual em dólares é uma linha que finanças e engenharia leem. Diga o que você mudou para chegar nela, como instâncias spot, ajuste de tamanho ou camadas de armazenamento.",
    },
  ],
  mistakes: [
    {
      title: "Um mural de selos de certificação",
      text: "Seis selos de nuvem acima do seu trabalho empurram a prova para baixo na página. Mantenha os um ou dois que a vaga pede e deixe suas linhas mostrarem o resto.",
    },
    {
      title: "Nenhum incidente à vista",
      text: "Quase toda entrevista de DevOps pergunta sobre uma queda. Uma linha sobre tempo de recuperação, uma correção depois de um postmortem ou uma simulação que você conduziu mostra que você já segurou o plantão, não só escreveu YAML.",
    },
    {
      title: "A ferramenta mudou, mas o que melhorou?",
      text: "“Implementei Kubernetes” diz o que você instalou, não o que ficou melhor. Acrescente o número de deploys, o tempo de recuperação ou o custo de antes e depois.",
    },
  ],
  faq: [
    {
      question: "O que um currículo de engenheiro de DevOps deve incluir?",
      answer:
        "As nuvens e ferramentas que você opera, as plataformas que construiu e números de frequência de deploy, disponibilidade, tempo de recuperação ou custo. Inclua as equipes que dependiam do seu trabalho e uma ou duas certificações atuais.",
    },
    {
      question: "Engenheiro de DevOps é o mesmo que engenheiro de confiabilidade de sites (SRE)?",
      answer:
        "O trabalho se sobrepõe bastante, e a busca de vagas compatíveis do Otto trata os dois cargos como o mesmo tipo de trabalho. Use no título o cargo da vaga, e comece com linhas de disponibilidade e recuperação para vagas de SRE e linhas de entrega para vagas de DevOps.",
    },
    {
      question: "Como passar de administração de sistemas para DevOps?",
      answer:
        "Mostre a automação no seu emprego atual: scripts que substituíram etapas manuais, servidores em que você aplicou patches com Ansible, um pipeline que você configurou. Essas linhas mostram trabalho de DevOps, seja qual for o seu cargo.",
    },
  ],
};
