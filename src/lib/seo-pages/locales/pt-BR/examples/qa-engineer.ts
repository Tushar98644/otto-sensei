import type { ExampleWords } from "../../../examples";

export const qaEngineer: ExampleWords<"qa-engineer"> = {
  role: "Engenheiro de QA",
  card: "Bugs pegos antes do lançamento, testes mais rápidos e uma cobertura que cresceu.",
  description:
    "Exemplo de currículo de engenheiro de QA: linhas de Playwright, Selenium e API com bugs em produção, tempo de teste e cobertura, habilidades e erros.",
  intro:
    "Um bom teste se mede pelo que nunca chega aos clientes. Um currículo de QA precisa mostrar isso: bugs pegos antes do lançamento, execuções de teste mais curtas e quanto do produto os seus testes cobrem hoje. Este exemplo dá um número a cada um deles.",
  person:
    "Kevin é inventado: um engenheiro de QA com 5 anos testando apps de pagamentos e de reservas de viagem, em Austin, Texas. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de engenheiro de QA",
    basics: {
      headline: "Engenheiro de QA",
      links: [{ label: "GitHub" }],
    },
    summary:
      "Engenheiro de QA com 5 anos testando apps web e mobile de pagamentos e viagens. Cria suítes automatizadas em Playwright e Java que pegam bugs antes do lançamento e mantêm as execuções de teste curtas.",
    experience: [
      {
        title: "Engenheiro de QA",
        bullets: [
          "Criei uma suíte de 640 testes end-to-end no Playwright para reservas e checkout, reduzindo a regressão de 3 dias de testes manuais para 40 minutos.",
          "Adicionei testes de API para 85 endpoints REST ao pipeline de CI/CD, reduzindo os bugs encontrados em produção de 14 para 4 por mês.",
          "Monitorei testes instáveis num dashboard do Jira e corrigi os 30 piores, elevando a taxa de aprovação em builds limpos de 82% para 99%.",
        ],
      },
      {
        title: "Analista de QA",
        bullets: [
          "Escrevi 400 casos de teste manuais para um app de pagamentos com cartão e automatizei os 150 mais usados em Selenium com Java.",
          "Encontrei um bug de arredondamento na conversão de moeda 3 dias antes do lançamento, que teria cobrado a mais em 2% dos pagamentos com cartões estrangeiros.",
          "Rodei verificações de acessibilidade em 25 telas de checkout e registrei 60 problemas, todos resolvidos antes da auditoria anual do banco.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Sistemas de Informação" }],
    skills: [
      { label: "Automação", items: ["Playwright", "Selenium", "Cypress", "Java", "TypeScript"] },
      { label: "Testes", items: ["Testes de API", "Testes de regressão", "Acessibilidade"] },
      { label: "Ferramentas", items: ["Jira", "Postman", "Git", "Jenkins"] },
    ],
    certifications: [{ name: "ISTQB Certified Tester Foundation Level" }],
  },
  lines: [
    {
      weak: "Fiz testes manuais e automatizados no app de reservas.",
      strong:
        "Criei uma suíte de 640 testes end-to-end no Playwright para reservas e checkout, reduzindo a regressão de 3 dias de testes manuais para 40 minutos.",
    },
    {
      weak: "Testei APIs e reportei bugs aos desenvolvedores.",
      strong:
        "Adicionei testes de API para 85 endpoints REST ao pipeline de CI/CD, reduzindo os bugs encontrados em produção de 14 para 4 por mês.",
    },
    {
      weak: "Trabalhei na correção de testes instáveis.",
      strong:
        "Monitorei testes instáveis num dashboard do Jira e corrigi os 30 piores, elevando a taxa de aprovação em builds limpos de 82% para 99%.",
    },
  ],
  skills: [
    { label: "Automação" },
    { label: "Linguagens e APIs" },
    { label: "Processo e ferramentas" },
  ],
  tips: [
    {
      title: "Conte bugs que escaparam, não casos de teste",
      text: "Escrever 400 casos de teste é esforço; menos bugs chegando à produção é o resultado. Junte a suíte que você criou à queda de bugs em produção ou de chamados de suporte que veio depois.",
    },
    {
      title: "Mostre quanto tempo leva uma execução de testes",
      text: "As equipes esperam a regressão antes de cada lançamento. Dias que viraram minutos são um resultado que qualquer gestor de engenharia sente, então dê o antes e o depois.",
    },
    {
      title: "Cite o bug de que você mais se orgulha",
      text: "Uma linha sobre um bug grave que você pegou, e o que ele teria custado, mostra o discernimento que um número de cobertura não mostra.",
    },
  ],
  mistakes: [
    {
      title: "Listar todo tipo de teste",
      text: "Smoke, sanidade, regressão, UAT, caixa-preta, caixa-branca: a lista ocupa espaço sem mostrar habilidade. Cite os tipos de teste dentro de linhas que mostrem o que eles pegaram.",
    },
    {
      title: "Trabalho manual primeiro numa vaga de automação",
      text: "Se a vaga pede automação, coloque suas suítes automatizadas no topo, mesmo as pequenas. Teste manual ainda conta, mas comece pelo código que você escreveu.",
    },
    {
      title: "“Garanti a qualidade do produto”",
      text: "Ninguém consegue verificar uma afirmação dessas. Diga o que você testou, quanto disso e o que mudou: menos bugs escapando, uma execução mais curta, uma taxa de aprovação maior.",
    },
  ],
  faq: [
    {
      question: "O que um currículo de engenheiro de QA deve incluir?",
      answer:
        "Os produtos que você testou, suas ferramentas e linguagens de automação e números de bugs pegos, bugs que chegaram à produção, tempo de execução dos testes ou cobertura. Inclua um certificado ISTQB se tiver, mas deixe as suas linhas carregarem o peso.",
    },
    {
      question: "Como mostrar no currículo a passagem do teste manual para a automação?",
      answer:
        "Mostre a automação que você já fez, mesmo como tarefa paralela: scripts que escreveu, casos manuais que automatizou, uma etapa de pipeline que adicionou. Um pequeno projeto público ajuda se o código do seu trabalho for privado.",
    },
    {
      question: "SDET é um trabalho diferente de engenheiro de QA?",
      answer:
        "Um SDET escreve mais código e muitas vezes constrói o próprio framework de testes, mas nas vagas compatíveis o Otto trata os dois como o mesmo tipo de trabalho. Se você se candidatar a vagas de SDET, coloque primeiro as suas linhas com mais código.",
    },
  ],
};
