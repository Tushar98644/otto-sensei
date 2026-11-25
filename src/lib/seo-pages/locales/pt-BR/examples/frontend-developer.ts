import type { ExampleWords } from "../../../examples";

export const frontendDeveloper: ExampleWords<"frontend-developer"> = {
  role: "Desenvolvedor frontend",
  card: "React e TypeScript, com velocidade e acessibilidade em números.",
  description:
    "Exemplo de currículo de desenvolvedor frontend: React e TypeScript com resultados, as habilidades das vagas e como mostrar velocidade e acessibilidade.",
  intro:
    "Um currículo de frontend precisa provar duas coisas em poucos segundos: que você constrói interfaces que as pessoas usam e que você se importa com o quanto elas são rápidas e acessíveis. Este exemplo mostra as duas com números que quem contrata consegue verificar.",
  person:
    "Daniel é inventado: um desenvolvedor frontend com 5 anos em empresas de produto, trabalhando remotamente de Minneapolis. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de desenvolvedor frontend",
    basics: {
      headline: "Desenvolvedor frontend",
      links: [{ label: "Portfólio" }],
    },
    summary:
      "Desenvolvedor frontend com 5 anos criando apps em React e TypeScript para lojas online e dashboards SaaS. Conhecido por páginas rápidas, design systems organizados e formulários acessíveis.",
    experience: [
      {
        title: "Desenvolvedor frontend sênior",
        bullets: [
          "Reconstruí a página de produto em Next.js com renderização no servidor, reduzindo o Largest Contentful Paint de 3,9 s para 1,6 s em celulares intermediários.",
          "Liderei a migração de 120 componentes para um design system compartilhado no Storybook, usado por 4 equipes de produto.",
          "Corrigi 64 problemas de WCAG no checkout após uma auditoria e adicionei verificações no Playwright para que novos problemas façam o build falhar.",
          "Mentorei 2 desenvolvedores juniores com code reviews e pair programming; hoje os dois cuidam de funcionalidades de ponta a ponta.",
        ],
      },
      {
        title: "Desenvolvedor frontend",
        bullets: [
          "Criei o dashboard de análise em React, TypeScript e D3.js que 900 contas de clientes abrem toda semana.",
          "Reduzi o bundle principal de JavaScript de 780 KB para 310 KB dividindo as rotas e substituindo duas bibliotecas pesadas de gráficos.",
          "Escrevi testes unitários em Jest para as telas de cobrança, elevando a cobertura de 35% para 80% em 6 meses.",
        ],
      },
    ],
    projects: [
      {
        name: "Verificador de contraste de cores",
        tech: "TypeScript, Vite",
        bullets: [
          "Criei uma ferramenta gratuita no navegador que confere as cores do texto pelas razões de contraste da WCAG, com 2.000 visitantes por mês.",
        ],
      },
    ],
    education: [{ degree: "Bacharelado", field: "Ciência da Computação" }],
    skills: [
      { label: "Linguagens", items: ["TypeScript", "JavaScript", "HTML", "CSS"] },
      {
        label: "Frameworks",
        items: ["React", "Next.js", "Redux", "Tailwind CSS", "D3.js"],
      },
      { label: "Qualidade", items: ["Jest", "Playwright", "Storybook", "WCAG", "Figma"] },
    ],
  },
  lines: [
    {
      weak: "Desenvolvi vários componentes de interface para o site.",
      strong:
        "Liderei a migração de 120 componentes para um design system compartilhado no Storybook, usado por 4 equipes de produto.",
    },
    {
      weak: "Melhorei o desempenho do site.",
      strong:
        "Reconstruí a página de produto em Next.js com renderização no servidor, reduzindo o Largest Contentful Paint de 3,9 s para 1,6 s em celulares intermediários.",
    },
    {
      weak: "Deixei o site acessível.",
      strong:
        "Corrigi 64 problemas de WCAG no checkout após uma auditoria e adicionei verificações no Playwright para que novos problemas façam o build falhar.",
    },
  ],
  skills: [{ label: "Linguagens" }, { label: "Frameworks" }, { label: "Testes e qualidade" }],
  tips: [
    {
      title: "Meça a velocidade como as equipes medem",
      text: "Diga a métrica e o aparelho: Largest Contentful Paint num celular intermediário, tamanho do bundle em KB, time to interactive. “Deixei mais rápido” não dá ao entrevistador nada sobre o que perguntar.",
    },
    {
      title: "Coloque o link de algo no ar",
      text: "Um portfólio ou um projeto no ar deixa quem lê clicar em vez de confiar na sua palavra. Coloque o link no cabeçalho e confira se ele carrega no celular.",
    },
    {
      title: "Cite o framework que a vaga cita",
      text: "Se a vaga pede React e o seu trabalho foi em React, escreva React na linha, não só “frameworks JavaScript”. A verificação de compatibilidade do Otto procura as palavras da própria vaga.",
    },
  ],
  mistakes: [
    {
      title: "Um portfólio de capturas de tela dentro do currículo",
      text: "Imagens e layouts de ferramentas de design ficam bonitos para as pessoas e não dizem nada ao software de recrutamento. Mantenha o currículo em texto e coloque o link para o visual.",
    },
    {
      title: "Toda biblioteca que você já importou",
      text: "Lodash e Axios não garantem entrevistas. Liste os frameworks e as ferramentas que você escolheu e sabe defender, e deixe o resto para a conversa.",
    },
    {
      title: "Palavras vagas como “vários” e “diversos”",
      text: "A verificação de linhas do Otto aponta essas palavras porque elas escondem o tamanho. Em vez disso, conte os componentes, as páginas ou as equipes.",
    },
  ],
  faq: [
    {
      question: "O currículo de desenvolvedor frontend deve ter um design elaborado?",
      answer:
        "Mantenha simples. Seu portfólio mostra seu senso de design; o currículo precisa ser lido sem erros pelo software de recrutamento, que embaralha colunas, ícones e caixas de texto. Uma coluna de texto real é o mais seguro.",
    },
    {
      question: "React basta ou preciso de outros frameworks?",
      answer:
        "Siga a vaga. Muitas equipes contratam para React com TypeScript, mas algumas pedem Vue ou Angular. Cite o que você realmente usou e ajuste a ordem para cada vaga.",
    },
    {
      question: "Preciso de um portfólio como desenvolvedor frontend?",
      answer:
        "Ajuda muito. Um ou dois projetos no ar com uma nota curta sobre o que você construiu e por quê valem mais que uma longa lista de tutoriais.",
    },
  ],
};
