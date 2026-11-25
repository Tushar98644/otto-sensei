import type { ExampleWords } from "../../../examples";

export const hr: ExampleWords<"hr"> = {
  role: "RH",
  card: "Recrutamento e trabalho generalista em números: tempo de contratação, retenção, casos encerrados.",
  description:
    "Exemplo de currículo de RH para generalistas e recrutadores: linhas de rapidez na contratação, retenção e processos, e as habilidades e ferramentas.",
  intro:
    "O pessoal de RH lê currículos o dia todo, então percebe na hora quando um é vago. O seu precisa das mesmas coisas que você procura nos outros: números de contratação e retenção, os sistemas que você gerenciou e os problemas que você resolveu. Este exemplo cobre recrutamento e trabalho generalista.",
  person:
    "Nadia é inventada: uma generalista de RH com 5 anos em serviços de TI e varejo em Phoenix, vinda do recrutamento. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de RH",
    basics: {
      headline: "Generalista de RH",
      links: [{ label: "Portfólio" }],
    },
    summary:
      "Generalista de RH com 5 anos em recrutamento, onboarding e relações com funcionários, para equipes de 300 a 1.200 pessoas. Resolve processos lentos com ferramentas simples e políticas claras.",
    experience: [
      {
        title: "Generalista de RH",
        bullets: [
          "Reduzi o tempo de contratação para vagas de engenharia de 52 para 34 dias com entrevistas estruturadas e uma regra de feedback em 48 horas.",
          "Reformulei o onboarding de 220 contratados por ano, elevando a retenção em 90 dias de 81% para 90%.",
          "Centralizei férias, controle de ponto e dados da folha num único HRIS, eliminando 3 planilhas e os erros mensais na folha de pagamento.",
          "Investiguei e encerrei 40 casos de relações com funcionários por ano, cada um com conclusões por escrito.",
        ],
      },
      {
        title: "Especialista em aquisição de talentos",
        bullets: [
          "Contratei 180 funcionários de loja e 25 gerentes em 2022 para 30 lojas, principalmente por indicações e recrutamento em faculdades.",
          "Criei um bônus por indicação de funcionários que trouxe 35% das contratações, a um terço do custo por contratação das agências.",
          "Organizei 6 eventos de recrutamento por ano em faculdades do Arizona e do Novo México, preenchendo 60 vagas de trainee.",
        ],
      },
    ],
    education: [{ degree: "MBA", field: "Recursos Humanos" }],
    skills: [
      {
        label: "RH",
        items: [
          "Aquisição de talentos",
          "Relações com funcionários",
          "Gestão de desempenho",
          "Onboarding",
          "Folha de pagamento",
        ],
      },
      {
        label: "Ferramentas",
        items: ["Workday", "Excel", "Google Workspace", "LinkedIn Recruiter"],
      },
    ],
  },
  lines: [
    {
      weak: "Responsável pelo recrutamento de ponta a ponta.",
      strong:
        "Reduzi o tempo de contratação para vagas de engenharia de 52 para 34 dias com entrevistas estruturadas e uma regra de feedback em 48 horas.",
    },
    {
      weak: "Lidei com o onboarding de funcionários.",
      strong:
        "Reformulei o onboarding de 220 contratados por ano, elevando a retenção em 90 dias de 81% para 90%.",
    },
    {
      weak: "Profissional de RH esforçada e com atenção aos detalhes.",
      strong:
        "Centralizei férias, controle de ponto e dados da folha num único HRIS, eliminando 3 planilhas e os erros mensais na folha de pagamento.",
    },
  ],
  skills: [{ label: "Gestão de pessoas" }, { label: "Operações" }, { label: "Ferramentas" }],
  tips: [
    {
      title: "Use os números que você já acompanha",
      text: "Tempo de contratação, aceite de ofertas, retenção em 90 dias, turnover, casos encerrados. As equipes de RH já acompanham esses números; um por linha transforma tarefas em resultados.",
    },
    {
      title: "Cite os sistemas",
      text: "Workday, SAP SuccessFactors, Darwinbox, Keka, Greenhouse: as vagas costumam citar o HRIS ou o sistema de recrutamento, então diga quais você operou.",
    },
    {
      title: "Mantenha sigiloso o que é sigiloso",
      text: "Conte os casos e diga como terminaram, mas nunca cite nomes nem descreva um caso em detalhes. Recrutadores percebem, e isso conta a seu favor.",
    },
  ],
  mistakes: [
    {
      title: "“Recrutamento de ponta a ponta”",
      text: "Diz que você fez o trabalho todo, mas não o quão bem. A verificação de linhas do Otto aponta aberturas com “Responsável por” como esta; acrescente quantas vagas, em quanto tempo e de quais fontes.",
    },
    {
      title: "Dados pessoais de um formato antigo",
      text: "Data de nascimento, estado civil e foto ainda aparecem em muitos modelos de currículo indianos. A maioria dos empregadores não precisa deles, e eles abrem espaço para preconceito. Deixe de fora.",
    },
    {
      title: "Um paredão de soft skills",
      text: "“Bom com pessoas, bom ouvinte, esforçado” é o que todo mundo escreve. Mostre a mesma coisa com uma linha sobre um caso que você encerrou ou uma política que você corrigiu.",
    },
  ],
  faq: [
    {
      question: "O que um currículo de RH deve incluir?",
      answer:
        "Suas áreas de RH (recrutamento, generalista, folha de pagamento ou treinamento), o tamanho do quadro de funcionários que você atendeu e números como tempo de contratação ou retenção. Inclua os sistemas de RH que você usou.",
    },
    {
      question: "Devo listar conhecimento de legislação trabalhista no currículo de RH?",
      answer:
        "Se a vaga pede, mostre numa linha: políticas que você escreveu ou auditorias em que passou. Uma lista solta de leis diz menos que um exemplo de como você as aplicou.",
    },
    {
      question: "Como passar do recrutamento para uma vaga de generalista de RH?",
      answer:
        "Mantenha seus resultados de recrutamento e acrescente qualquer trabalho de generalista que você fez: onboarding, políticas, relações com funcionários ou dados da folha. Uma linha no resumo pode citar a mudança que você quer.",
    },
  ],
};
