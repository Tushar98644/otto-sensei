import type { ExampleWords } from "../../../examples";

export const customerSupport: ExampleWords<"customer-support"> = {
  role: "Suporte ao cliente",
  card: "Volume, tempo de resposta e CSAT, de especialista a líder de equipe.",
  description:
    "Exemplo de currículo de suporte ao cliente: linhas com tempo de resolução, CSAT e volume, e as ferramentas de help desk e habilidades das vagas.",
  intro:
    "Equipes de suporte funcionam com números: tickets por dia, tempo de primeira resposta, CSAT, escalonamentos. Um currículo de suporte que usa esses números parece de alguém que já conhece o trabalho. Este exemplo vai do atendimento por telefone até um cargo de líder de equipe.",
  person:
    "Luis é inventado: um líder de equipe de suporte ao cliente com 5 anos em atendimento por telefone e chat para uma loja online, em San Antonio. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de suporte ao cliente",
    basics: {
      headline: "Líder de equipe de suporte ao cliente",
      links: [{ label: "Portfólio" }],
    },
    summary:
      "Líder de suporte ao cliente com 5 anos em atendimento por telefone, chat e e-mail para uma loja online com 2 milhões de clientes. Mantém as filas curtas, as respostas gentis e corrige as causas dos tickets repetidos.",
    experience: [
      {
        title: "Líder de equipe de suporte ao cliente",
        bullets: [
          "Lidero 12 pessoas no chat e no e-mail, mantendo a primeira resposta abaixo de 2 minutos e o CSAT em 92% na liquidação de fim de ano.",
          "Escrevi 45 artigos de ajuda no Zendesk sobre as principais dúvidas de reembolso e entrega, reduzindo esses tickets em 25%.",
          "Criei uma revisão semanal de tickets repetidos com a equipe de entregas, que corrigiu um bug de código postal por trás de 1.500 tickets por mês.",
        ],
      },
      {
        title: "Especialista em suporte ao cliente",
        bullets: [
          "Respondi de 70 a 90 chats e ligações por dia em espanhol e inglês, com CSAT de 94% ao longo de 2 anos.",
          "Treinei 20 pessoas recém-contratadas em reembolsos e escalonamentos, reduzindo de 6 para 4 semanas o tempo até a carga completa de trabalho.",
          "Ganhei 2 vezes o prêmio trimestral de qualidade entre 80 atendentes, por auditorias de ligações e tempo de resolução.",
        ],
      },
    ],
    education: [{ degree: "B.A.", field: "Inglês" }],
    skills: [
      {
        label: "Suporte",
        items: [
          "Suporte ao cliente",
          "Atendimento ao cliente",
          "Help desk",
          "Tratamento de escalonamentos",
        ],
      },
      { label: "Ferramentas", items: ["Zendesk", "Freshdesk", "Google Sheets", "Excel"] },
      { label: "Idiomas", items: ["Espanhol", "Inglês"] },
    ],
  },
  lines: [
    {
      weak: "Lidei com dúvidas de clientes por chat e telefone.",
      strong:
        "Respondi de 70 a 90 chats e ligações por dia em espanhol e inglês, com CSAT de 94% ao longo de 2 anos.",
    },
    {
      weak: "Profissional com espírito de equipe, que se dá bem em ambientes dinâmicos.",
      strong:
        "Lidero 12 pessoas no chat e no e-mail, mantendo a primeira resposta abaixo de 2 minutos e o CSAT em 92% na liquidação de fim de ano.",
    },
    {
      weak: "Ajudei novos funcionários a aprender o processo.",
      strong:
        "Treinei 20 pessoas recém-contratadas em reembolsos e escalonamentos, reduzindo de 6 para 4 semanas o tempo até a carga completa de trabalho.",
    },
  ],
  skills: [{ label: "Suporte" }, { label: "Ferramentas" }, { label: "Ferramentas de escritório" }],
  tips: [
    {
      title: "Cite as métricas que sua equipe reporta",
      text: "Tickets ou ligações por dia, tempo de primeira resposta, tempo de resolução, CSAT e notas de qualidade. Se você não sabe um número exato, use uma faixa que consiga defender.",
    },
    {
      title: "Mostre que você corrige causas, não só tickets",
      text: "Artigos de ajuda que reduziram um tipo de ticket, um bug que você conseguiu que corrigissem, um processo que você mudou. É isso que leva você de especialista a líder.",
    },
    {
      title: "Liste seus idiomas",
      text: "Muitas vagas de suporte na Índia e no exterior contratam por idioma. Cite cada um em que você consegue atender clientes, numa linha de habilidades ou numa seção de Idiomas.",
    },
  ],
  mistakes: [
    {
      title: "“Espírito de equipe em ambiente dinâmico”",
      text: "A verificação de linhas do Otto aponta isso como frase feita: todo currículo de suporte tem. Uma nota de CSAT sob pressão diz a mesma coisa e ainda prova.",
    },
    {
      title: "Nomes de processos que ninguém de fora conhece",
      text: "Nomes internos de filas e ferramentas não dizem nada a um novo empregador. Diga o que era o processo em palavras simples.",
    },
    {
      title: "Esconder a experiência em BPO",
      text: "Experiência em atendimento por telefone num BPO é experiência real de suporte. Cite o setor do cliente, se puder, e mostre os números.",
    },
  ],
  faq: [
    {
      question: "Que habilidades um currículo de suporte ao cliente deve mostrar?",
      answer:
        "Os canais em que você atendeu (telefone, chat, e-mail), as ferramentas de help desk que usou, seus idiomas e números de volume, tempo de resposta e CSAT.",
    },
    {
      question: "Como passar de suporte ao cliente para líder de equipe?",
      answer:
        "Mostre o trabalho de liderança que você já faz: treinar quem acabou de entrar, auditorias de qualidade, artigos de ajuda, cobrir a fila. Dê um número para cada um e diga no resumo a mudança que você quer.",
    },
    {
      question: "Devo mencionar turnos da noite ou turnos rotativos?",
      answer:
        "Só se a vaga pedir. Se uma vaga fala em turnos rotativos, uma linha dizendo que você já trabalhou neles responde à pergunta antes que ela seja feita.",
    },
  ],
};
