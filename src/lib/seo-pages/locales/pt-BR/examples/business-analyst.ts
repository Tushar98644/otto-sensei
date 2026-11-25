import type { ExampleWords } from "../../../examples";

export const businessAnalyst: ExampleWords<"business-analyst"> = {
  role: "Analista de negócios",
  card: "Requisitos, mapas de processo e dados que mudaram o jeito de uma equipe trabalhar.",
  description:
    "Exemplo de currículo de analista de negócios: linhas de requisitos, processos e SQL que mostram o que mudou, e as habilidades e ferramentas das vagas.",
  intro:
    "Um analista de negócios fica entre as pessoas que tocam um processo e as que o mudam. O currículo precisa mostrar os dois lados: o que você descobriu, o que você documentou e o que melhorou depois que a mudança entrou no ar. Este exemplo faz isso para um banco e uma seguradora.",
  person:
    "Natalie é inventada: uma analista de negócios com 5 anos num banco e numa seguradora em Charlotte, que veio da área de operações de sinistros. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de analista de negócios",
    basics: {
      headline: "Analista de negócios",
      links: [{ label: "LinkedIn" }],
    },
    summary:
      "Analista de negócios com 5 anos em bancos e seguros, transformando processos confusos em requisitos claros e melhorias mensuráveis. Trabalha com SQL, Excel e Power BI, e fica tão à vontade com a equipe de operações quanto com engenheiros.",
    experience: [
      {
        title: "Analista de negócios sênior",
        bullets: [
          "Mapeei o processo de empréstimo para pequenas empresas em 4 equipes e 23 repasses, e escrevi os requisitos que reduziram o prazo de aprovação de 19 para 8 dias.",
          "Escrevi 140 histórias de usuário com critérios de aceite para um novo portal de empréstimos e conduzi testes com 12 analistas de crédito que acharam 31 defeitos antes do lançamento.",
          "Usei SQL em 3 anos de dados de empréstimos para mostrar que 40% do retrabalho vinha de 2 campos ausentes no formulário de solicitação, que a equipe tornou obrigatórios.",
          "Criei um dashboard no Power BI com os empréstimos por etapa que 15 gerentes de agência consultam todo dia, substituindo uma planilha enviada por e-mail toda semana.",
        ],
      },
      {
        title: "Analista de negócios",
        bullets: [
          "Documentei o processo de abertura de sinistros e encontrei 6 etapas duplicadas de digitação, eliminadas numa versão que poupou 5 horas por semana a cada regulador de sinistros.",
          "Levantei requisitos com 30 reguladores de sinistros para uma página de status, o que reduziu em 22% as ligações de status para a central de atendimento.",
        ],
      },
      {
        title: "Assistente de operações de sinistros",
        bullets: [
          "Processei 60 sinistros de automóveis por semana e escrevi o primeiro guia prático da equipe, que virou o material de treinamento para 25 novas contratações.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Administração de Empresas" }],
    skills: [
      {
        label: "Análise",
        items: [
          "Levantamento de requisitos",
          "Mapeamento de processos",
          "Histórias de usuário",
          "Testes de aceitação do usuário",
          "Análise de dados",
        ],
      },
      { label: "Ferramentas", items: ["SQL", "Excel", "Power BI", "Jira", "Confluence", "Visio"] },
    ],
    certifications: [{ name: "Certification of Capability in Business Analysis (CCBA)" }],
  },
  lines: [
    {
      weak: "Levantei requisitos com as partes interessadas.",
      strong:
        "Mapeei o processo de empréstimo para pequenas empresas em 4 equipes e 23 repasses, e escrevi os requisitos que reduziram o prazo de aprovação de 19 para 8 dias.",
    },
    {
      weak: "Envolvida em projetos de melhoria de processos.",
      strong:
        "Documentei o processo de abertura de sinistros e encontrei 6 etapas duplicadas de digitação, eliminadas numa versão que poupou 5 horas por semana a cada regulador de sinistros.",
    },
    {
      weak: "Realizei diversas tarefas de análise de dados usando SQL.",
      strong:
        "Usei SQL em 3 anos de dados de empréstimos para mostrar que 40% do retrabalho vinha de 2 campos ausentes no formulário de solicitação, que a equipe tornou obrigatórios.",
    },
  ],
  skills: [{ label: "Análise" }, { label: "Entrega" }, { label: "Ferramentas de dados" }],
  tips: [
    {
      title: "Mostre o processo antes e depois",
      text: "Dias para aprovar, etapas eliminadas, erros, horas poupadas. O trabalho de um analista de negócios aparece em como o processo roda depois da mudança, então meça antes de começar.",
    },
    {
      title: "Conte os documentos que você escreveu",
      text: "Histórias de usuário, mapas de processo, requisitos e casos de teste. Diga quantos e quem os aprovou; isso mostra que você leva uma mudança da sala de reunião até o lançamento.",
    },
    {
      title: "Coloque SQL numa linha, não só numa lista",
      text: "Muitas vagas de analista de negócios pedem SQL ou Excel avançado. Uma linha em que uma consulta achou a causa de um problema prova isso melhor do que uma lista de habilidades.",
    },
  ],
  mistakes: [
    {
      title: "“Atuei como ponte entre o negócio e a TI”",
      text: "Isso só repete o nome do cargo. Diga em que os dois lados concordaram por sua causa e o que foi entregue como resultado.",
    },
    {
      title: "Só as ferramentas, nunca a mudança",
      text: "Jira, Visio e Confluence são onde o trabalho fica, não o trabalho em si. Cada linha precisa de um processo, uma decisão ou um número que mudou.",
    },
    {
      title: "Esconder seus anos em operações",
      text: "O tempo em sinistros, cobrança ou numa central de atendimento é o motivo de você entender o processo. Mantenha esse emprego na página, com uma linha que mostre como você melhorou o funcionamento dele.",
    },
  ],
  faq: [
    {
      question: "O que um currículo de analista de negócios deve incluir?",
      answer:
        "Os processos ou sistemas que você analisou, os requisitos que escreveu, as ferramentas que usou e o que mudou depois: tempo poupado, erros reduzidos ou custos evitados. Inclua uma certificação ECBA, CCBA ou CBAP, se tiver.",
    },
    {
      question: "Analistas de negócios precisam ter SQL no currículo?",
      answer:
        "Nem toda vaga exige, mas muitas vagas nos EUA pedem, e isso permite que você mesmo confira um problema nos dados. Se já usou, mostre numa linha uma descoberta que veio de uma consulta.",
    },
    {
      question: "Como passar de operações para um cargo de analista de negócios?",
      answer:
        "Escreva seu emprego atual em torno da análise que existe nele: um processo que você mapeou, um relatório que criou, uma melhoria que propôs. O resumo pode dizer que você está migrando para análise de negócios.",
    },
    {
      question: "Analista de negócios é o mesmo que analista de dados?",
      answer:
        "Os dois se sobrepõem. Analistas de negócios focam em processos e nos requisitos de uma mudança; analistas de dados focam em relatórios e análises. Puxe suas linhas para o lado que a vaga pede.",
    },
  ],
};
