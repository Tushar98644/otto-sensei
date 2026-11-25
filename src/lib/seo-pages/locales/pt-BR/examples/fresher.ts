import type { ExampleWords } from "../../../examples";

export const fresher: ExampleWords<"fresher"> = {
  role: "Recém-formado",
  card: "Um formado em ciência da computação com um estágio e dois projetos, em uma página.",
  description:
    "Exemplo de currículo de recém-formado em uma página, com projetos, estágios e GPA do jeito certo, as habilidades a listar e os erros a evitar.",
  intro:
    "Sem um emprego de tempo integral ainda, o currículo de recém-formado se apoia em projetos, estágios, notas e provas de que você termina o que começa. Este exemplo é de um formado em ciência da computação que se candidata a vagas de trainee e de engenheiro associado, e a mesma estrutura serve para qualquer recém-formado.",
  person:
    "Noah é inventado: formado em ciência da computação em 2026, em Raleigh, com um estágio e dois projetos. Nomes, faculdades, empresas e números são inventados.",
  resume: {
    title: "Currículo de recém-formado",
    basics: {
      headline: "Formado em Ciência da Computação",
      links: [{ label: "Portfólio" }],
    },
    summary:
      "Formado em ciência da computação (2026), em busca de uma vaga de trainee ou de engenheiro de software associado. Criou e lançou dois projetos full-stack e passou um verão corrigindo bugs reais numa startup.",
    education: [
      {
        degree: "B.S.",
        field: "Ciência da Computação",
        bullets: ["GPA 3,7/4,0. Projeto de conclusão: rastreador de ônibus do campus (abaixo)."],
      },
      { degree: "Ensino médio", field: "", bullets: ["GPA 3,9/4,0"] },
    ],
    experience: [
      {
        title: "Estagiário de engenharia de software",
        bullets: [
          "Corrigi 14 bugs no dashboard em React, incluindo um bug de data que mostrava dias de entrega errados para 3.000 usuários.",
          "Escrevi 40 testes unitários em Jest para o formulário de reserva, elevando a cobertura de 20% para 75%.",
        ],
      },
    ],
    projects: [
      {
        name: "Rastreador de ônibus do campus",
        tech: "React, Node.js, MongoDB",
        bullets: [
          "Criei um rastreador ao vivo para os 6 ônibus do campus com uma equipe de 3 pessoas, hoje usado por cerca de 900 alunos toda manhã.",
          "Reduzi o intervalo de atualização do mapa de 30 para 5 segundos enviando os pontos de GPS por WebSockets em vez de polling.",
        ],
      },
      {
        name: "Divisor de despesas",
        tech: "Python, Django, PostgreSQL",
        bullets: [
          "Criei um app web para dividir despesas do alojamento e de viagens, com links de pagamento do Venmo, usado por 120 amigos e colegas de turma.",
        ],
      },
    ],
    skills: [
      { label: "Linguagens", items: ["Java", "Python", "JavaScript", "SQL"] },
      { label: "Web", items: ["React", "Node.js", "Django", "HTML", "CSS"] },
      { label: "Ferramentas", items: ["Git", "Linux", "MongoDB", "PostgreSQL"] },
    ],
    certifications: [{ name: "freeCodeCamp: JavaScript Algorithms and Data Structures" }],
  },
  lines: [
    {
      weak: "Fiz um projeto de rastreamento de ônibus.",
      strong:
        "Criei um rastreador ao vivo para os 6 ônibus do campus com uma equipe de 3 pessoas, hoje usado por cerca de 900 alunos toda manhã.",
    },
    {
      weak: "Recém-formado esforçado e apaixonado por aprender.",
      strong:
        "Corrigi 14 bugs no dashboard em React, incluindo um bug de data que mostrava dias de entrega errados para 3.000 usuários.",
    },
    {
      weak: "Aprendi React e Node.js durante o estágio.",
      strong:
        "Escrevi 40 testes unitários em Jest para o formulário de reserva, elevando a cobertura de 20% para 75%.",
    },
  ],
  skills: [{ label: "Linguagens" }, { label: "Web" }, { label: "Ferramentas" }],
  tips: [
    {
      title: "A formação vem primeiro",
      text: "Até você ter um emprego de tempo integral, seu diploma, sua faculdade e seu GPA são os fatos mais fortes que você tem. Coloque Formação acima de Experiência e mantenha as notas do ensino médio enquanto as vagas para recém-formados ainda pedirem.",
    },
    {
      title: "Trate projetos como empregos",
      text: "Cada projeto ganha o mesmo tipo de linha que um emprego: o que você construiu, quem usou e um número. Um projeto com 10 usuários reais vale mais que um clone de tutorial sem nenhum.",
    },
    {
      title: "Uma página, sem exceções",
      text: "Recrutadores em processos seletivos nas faculdades e em contratações em massa leem centenas de currículos de recém-formados. Mantenha tudo em uma página; o Compact coloca mais conteúdo nela sem diminuir o texto.",
    },
  ],
  mistakes: [
    {
      title: "Um objetivo cheio de adjetivos",
      text: "“Recém-formado esforçado e apaixonado por aprender” está em milhares de currículos. A verificação de linhas do Otto aponta frases feitas como “apaixonado por”. Diga a vaga que você quer e uma coisa que você construiu.",
    },
    {
      title: "Dados pessoais e uma declaração",
      text: "Nome do pai, data de nascimento, foto e “Declaro que as informações acima são verdadeiras” vêm de modelos antigos. Os empregadores não precisam disso, e esses itens tiram espaço dos seus projetos.",
    },
    {
      title: "Listar disciplinas como habilidades",
      text: "“Sistemas Operacionais, SGBD, Redes de Computadores” são disciplinas, não habilidades. Liste as linguagens e ferramentas que você usou num projeto ou estágio.",
    },
  ],
  faq: [
    {
      question: "Qual é o melhor formato de currículo para recém-formados?",
      answer:
        "Uma página, uma coluna, com Formação primeiro e depois estágios, projetos, habilidades e certificações. O Classic e o Compact funcionam bem, e os dois são grátis para baixar em PDF.",
    },
    {
      question: "Recém-formado deve colocar o CGPA no currículo?",
      answer:
        "Sim, se ajudar você. Muitas vagas para recém-formados e trainees definem uma nota de corte, então deixar a nota de fora pode parecer que você está escondendo. Escreva como a sua faculdade escreve, por exemplo 3,7/4,0 ou 8,4/10.",
    },
    {
      question: "Dá para fazer um currículo de recém-formado sem estágio?",
      answer:
        "Sim. Comece com dois ou três projetos escritos como empregos, acrescente hackathons, grupos da faculdade ou trabalhos freelance com números, e mantenha a Formação no topo.",
    },
  ],
};
