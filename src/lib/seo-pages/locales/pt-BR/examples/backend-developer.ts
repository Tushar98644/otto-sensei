import type { ExampleWords } from "../../../examples";

export const backendDeveloper: ExampleWords<"backend-developer"> = {
  role: "Desenvolvedor backend",
  card: "Serviços que mostram carga, latência, disponibilidade e quanto custam para rodar.",
  description:
    "Exemplo de currículo de desenvolvedor backend: linhas em Java e Python com escala, disponibilidade e custo, as habilidades das vagas e erros comuns.",
  intro:
    "O trabalho de backend costuma ser invisível, então o currículo precisa torná-lo visível: quanto tráfego, quanta confiabilidade, quanto custou e o que mudou por sua causa. Este exemplo transforma cada uma dessas coisas em um número.",
  person:
    "Ethan é inventado: um desenvolvedor backend com 3 anos em software de logística em Columbus, Ohio. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de desenvolvedor backend",
    basics: {
      headline: "Desenvolvedor backend",
      links: [{ label: "Portfólio" }],
    },
    summary:
      "Desenvolvedor backend com 3 anos criando serviços de pedidos e rastreamento em Java, Python e PostgreSQL. Foca em serviços que continuam no ar em horários de pico e custam menos para rodar.",
    experience: [
      {
        title: "Desenvolvedor backend",
        bullets: [
          "Criei a API de rastreamento de entregas em Spring Boot, que atende 1.200 requisições por segundo no pico com p99 abaixo de 150 ms.",
          "Passei os eventos de pedidos do polling no banco de dados para o Kafka, reduzindo em 60% a carga do PostgreSQL nas vendas de fim de ano.",
          "Reduzi em 28% a conta mensal da AWS ajustando o tamanho das instâncias e movendo logs frios para um armazenamento mais barato.",
        ],
      },
      {
        title: "Engenheiro de software associado",
        bullets: [
          "Escrevi um serviço em Python com FastAPI que coleta preços de commodities de 40 fontes a cada hora para a equipe de precificação.",
          "Adicionei Docker e GitHub Actions a 6 serviços, reduzindo o tempo entre o merge e a produção de 2 dias para 25 minutos.",
          "Corrigi uma condição de corrida na atualização de estoque que fazia 3% dos pedidos venderem além do estoque, encontrada ao reproduzir logs de produção.",
        ],
      },
    ],
    projects: [
      {
        name: "Limitador de requisições",
        tech: "Go, Redis",
        bullets: [
          "Escrevi um limitador de requisições token bucket com Redis no backend e o testei sob carga até 20.000 requisições por segundo.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Tecnologia da Informação" }],
    skills: [
      { label: "Linguagens", items: ["Java", "Python", "Go", "SQL"] },
      {
        label: "Serviços e dados",
        items: ["Spring Boot", "FastAPI", "Kafka", "PostgreSQL", "Redis", "Microsserviços"],
      },
      { label: "Infraestrutura", items: ["AWS", "Docker", "GitHub Actions", "Linux", "Datadog"] },
    ],
  },
  lines: [
    {
      weak: "Lidei com o desenvolvimento backend do sistema de rastreamento.",
      strong:
        "Criei a API de rastreamento de entregas em Spring Boot, que atende 1.200 requisições por segundo no pico com p99 abaixo de 150 ms.",
    },
    {
      weak: "Ajudei a reduzir custos de nuvem.",
      strong:
        "Reduzi em 28% a conta mensal da AWS ajustando o tamanho das instâncias e movendo logs frios para um armazenamento mais barato.",
    },
    {
      weak: "Estive envolvido em montar o CI/CD.",
      strong:
        "Adicionei Docker e GitHub Actions a 6 serviços, reduzindo o tempo entre o merge e a produção de 2 dias para 25 minutos.",
    },
  ],
  skills: [
    { label: "Linguagens" },
    { label: "Dados e mensageria" },
    { label: "Arquitetura e nuvem" },
  ],
  tips: [
    {
      title: "Mostre carga, latência e disponibilidade",
      text: "Requisições por segundo, latência p99, taxa de erros, disponibilidade. São os números sobre os quais entrevistadores de backend perguntam, então colocar um numa linha começa a conversa que você quer.",
    },
    {
      title: "Dinheiro também é resultado",
      text: "Uma conta de nuvem menor, menos servidores ou menos tempo de plantão é um resultado que qualquer gestor entende. Diga quanto e o que você mudou para chegar lá.",
    },
    {
      title: "Explique o domínio em poucas palavras",
      text: "“Rastreamento de entregas”, “estornos de cartão”, “preços de commodities”: um substantivo curto diz a quem lê o que o sistema fazia, e assim os números fazem sentido.",
    },
  ],
  mistakes: [
    {
      title: "Só listar tecnologias",
      text: "Uma linha que diz “Java, Spring Boot, Kafka, Docker” mostra o que você usou, não o que você fez. Coloque as ferramentas dentro de uma linha com um resultado.",
    },
    {
      title: "Se esconder atrás de “estive envolvido em”",
      text: "A verificação de linhas do Otto aponta aberturas passivas e fracas como essa, porque quem lê não consegue saber o que você fez. Comece com o seu próprio verbo: criei, reduzi, migrei, corrigi.",
    },
    {
      title: "Deixar a escala de fora",
      text: "Uma fila que processa 50 mensagens por dia e outra que processa 50.000 por segundo são trabalhos diferentes. Diga qual era a sua.",
    },
  ],
  faq: [
    {
      question: "O que um currículo de desenvolvedor backend deve incluir?",
      answer:
        "Suas linguagens e frameworks, os sistemas que você construiu e números de carga, latência, disponibilidade ou custo. Inclua um projeto se o trabalho do seu emprego estiver sob acordo de confidencialidade (NDA), e mantenha o currículo com uma ou duas páginas.",
    },
    {
      question: "Devo mencionar design de sistemas no currículo?",
      answer:
        "Mostre em vez de afirmar. Uma linha sobre dividir um serviço, adicionar uma fila ou projetar para picos de tráfego diz mais a quem lê do que as palavras “design de sistemas” numa lista de habilidades.",
    },
    {
      question: "Qual formato combina com um currículo de backend?",
      answer:
        "Qualquer formato simples, de uma coluna. Este exemplo usa o Minimal, que vem com o Pro; o Classic e o Compact são grátis e são lidos com a mesma facilidade.",
    },
  ],
};
