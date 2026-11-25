import type { ExampleWords } from "../../../examples";

export const uiUxDesigner: ExampleWords<"ui-ux-designer"> = {
  role: "Designer de UI/UX",
  card: "Texto simples com link para o portfólio, com pesquisa e resultados em cada linha.",
  description:
    "Exemplo de currículo de designer de UI/UX em texto simples que o software de recrutamento lê, com linhas de pesquisa e resultados, habilidades e dicas.",
  intro:
    "Designers ficam tentados a transformar o currículo numa vitrine, mas o software de recrutamento lê um layout elaborado como texto embaralhado. A solução é um currículo simples com link para o seu portfólio, com linhas que mostram a pesquisa por trás de cada design e o que mudou depois do lançamento.",
  person:
    "Hannah é inventada: uma designer de produto com 4 anos em edtech e fintech em Denver. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de designer de UI/UX",
    basics: {
      headline: "Designer de produto (UI/UX)",
      links: [{ label: "Portfólio" }],
    },
    summary:
      "Designer de produto com 4 anos criando apps de aprendizado e de pagamentos usados em celulares Android baratos. Começa pela pesquisa, desenha no Figma e confere os números depois do lançamento.",
    experience: [
      {
        title: "Designer de produto",
        bullets: [
          "Redesenhei o player de cursos após 18 testes de usabilidade com alunos em 3 cidades, elevando a conclusão de aulas de 42% para 55%.",
          "Criei um design system no Figma com 90 componentes e modo escuro, reduzindo em cerca de metade o tempo entre o design e o desenvolvimento de novas telas.",
          "Desenhei um fluxo de onboarding em espanhol e inglês que elevou a retenção de novos alunos no 7º dia de 21% para 27%.",
        ],
      },
      {
        title: "Designer de UI/UX",
        bullets: [
          "Redesenhei o fluxo de pagamento de contas de 7 telas para 4, o que reduziu em 30% as ligações ao suporte sobre pagamentos com falha.",
          "Conduzi 2 rodadas de card sorting com 40 clientes para refazer o menu do app e depois o testei com um protótipo clicável.",
          "Escrevi diretrizes de acessibilidade para contraste de cores e áreas de toque que as 3 equipes de app hoje seguem.",
        ],
      },
    ],
    education: [{ degree: "B.F.A.", field: "Design de Interação" }],
    skills: [
      {
        label: "Design",
        items: [
          "Design de UX",
          "Design de UI",
          "Design de interação",
          "Design systems",
          "Prototipagem",
        ],
      },
      {
        label: "Pesquisa",
        items: ["Pesquisa com usuários", "Testes de usabilidade", "Wireframes"],
      },
      { label: "Ferramentas", items: ["Figma", "Framer", "Miro", "Adobe Illustrator"] },
    ],
  },
  lines: [
    {
      weak: "Desenhei telas para o app mobile.",
      strong:
        "Redesenhei o fluxo de pagamento de contas de 7 telas para 4, o que reduziu em 30% as ligações ao suporte sobre pagamentos com falha.",
    },
    {
      weak: "Fiz pesquisa com usuários e testes de usabilidade.",
      strong:
        "Redesenhei o player de cursos após 18 testes de usabilidade com alunos em 3 cidades, elevando a conclusão de aulas de 42% para 55%.",
    },
    {
      weak: "Criei um design system.",
      strong:
        "Criei um design system no Figma com 90 componentes e modo escuro, reduzindo em cerca de metade o tempo entre o design e o desenvolvimento de novas telas.",
    },
  ],
  skills: [{ label: "Design" }, { label: "Pesquisa" }, { label: "Ferramentas" }],
  tips: [
    {
      title: "Deixe o visual com o portfólio",
      text: "Coloque o link do portfólio no cabeçalho e mantenha o currículo em texto simples. O recrutador passa os olhos pelo currículo primeiro; é no portfólio que ele vê o seu trabalho.",
    },
    {
      title: "Junte cada design a uma pesquisa e a um resultado",
      text: "Com quantas pessoas você testou, o que mudou por causa disso e o que melhorou depois do lançamento. Essa linha em três partes é o que líderes de design procuram.",
    },
    {
      title: "Diga quem eram os usuários",
      text: "Estudantes com celulares baratos, clientes de banco pagando contas, equipe de armazém usando luvas. O contexto mostra que você projetou para pessoas reais, não para um post no Dribbble.",
    },
  ],
  mistakes: [
    {
      title: "Um currículo feito numa ferramenta de design",
      text: "Colunas, caixas de texto e ícones de uma ferramenta de design muitas vezes saem do software de recrutamento na ordem errada, ou nem saem. A visão do recrutador do Otto mostra exatamente o que ele lê.",
    },
    {
      title: "Barras e notas de habilidade",
      text: "“Figma: 4 de 5 estrelas” não pode ser lido por software e não significa nada para as pessoas. Liste as ferramentas; mostre a habilidade nas suas linhas.",
    },
    {
      title: "Só telas, sem resultados",
      text: "“Desenhei o onboarding” é uma tarefa. Acrescente o que mudou: conclusão, retenção, menos chamados de suporte ou desenvolvimento mais rápido.",
    },
  ],
  faq: [
    {
      question: "Um designer de UI/UX deve ter um currículo criativo?",
      answer:
        "Mantenha o currículo simples e deixe o portfólio ser criativo. Muitos empregadores leem currículos primeiro pelo software de recrutamento, e layouts elaborados muitas vezes saem embaralhados.",
    },
    {
      question: "Devo colocar o link do meu portfólio no currículo?",
      answer:
        "Sim, no topo, ao lado do seu e-mail. Confira se ele abre rápido no celular e se o primeiro estudo de caso é o melhor.",
    },
    {
      question: "Designer de produto é o mesmo que designer de UI/UX?",
      answer:
        "Os cargos se sobrepõem muito, e nas vagas compatíveis o Otto trata os dois como o mesmo tipo de trabalho. Use no seu título o cargo da vaga a que você está se candidatando.",
    },
  ],
};
