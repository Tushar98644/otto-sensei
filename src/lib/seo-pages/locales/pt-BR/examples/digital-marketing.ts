import type { ExampleWords } from "../../../examples";

export const digitalMarketing: ExampleWords<"digital-marketing"> = {
  role: "Marketing digital",
  card: "Orçamento, canal e resultado juntos, para mídia paga, busca e e-mail.",
  description:
    "Exemplo de currículo de marketing digital: linhas de SEO, anúncios e e-mail com investimento, leads e retorno, e as habilidades e ferramentas das vagas.",
  intro:
    "Marketing digital é medido no dólar, no clique e no lead, então um currículo sem números chama atenção pelo motivo errado. Este exemplo mostra orçamento, canal e resultado em cada linha, do jeito que quem lidera marketing lê.",
  person:
    "Rachel é inventada: uma profissional de marketing digital com 4 anos em marcas que vendem direto ao consumidor e em edtech, trabalhando de Los Angeles. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de marketing digital",
    basics: {
      headline: "Gerente de marketing digital",
      links: [{ label: "Portfólio" }],
    },
    summary:
      "Profissional de marketing digital com 4 anos cuidando de mídia paga, busca e e-mail para marcas de consumo. Gerencia orçamentos, reporta em números simples e corta o que não se paga.",
    experience: [
      {
        title: "Gerente de marketing digital",
        bullets: [
          "Conduzi campanhas no Google Ads e na Meta com orçamento mensal de US$ 21.000, elevando o retorno sobre o investimento em mídia de 2,1 para 3,4 em 9 meses.",
          "Aumentei o tráfego orgânico de 40.000 para 110.000 visitas por mês com um plano de SEO baseado em 60 páginas de produto e tutoriais.",
          "Criei e-mails de carrinho abandonado no HubSpot que hoje recuperam 9% dos carrinhos, cerca de 1.200 pedidos por mês.",
          "Troquei os relatórios semanais em capturas de tela por um dashboard no Looker Studio, poupando 4 horas de trabalho manual por semana.",
        ],
      },
      {
        title: "Analista de marketing digital",
        bullets: [
          "Reduzi o custo por lead das inscrições em cursos de US$ 4,80 para US$ 3,00 refazendo landing pages e pausando 30 palavras-chave fracas.",
          "Planejei 3 campanhas com criadores no Instagram e no YouTube que trouxeram 14.000 inscrições em testes grátis.",
          "Escrevi e testei 50 variações de anúncios por mês, mantendo os 10% melhores para a rodada seguinte.",
        ],
      },
    ],
    education: [{ degree: "BBA", field: "Marketing" }],
    skills: [
      {
        label: "Canais",
        items: [
          "SEO",
          "Google Ads",
          "Marketing de performance",
          "E-mail marketing",
          "Redes sociais",
        ],
      },
      { label: "Ferramentas", items: ["Google Analytics", "HubSpot", "Canva", "Excel"] },
    ],
    certifications: [{ name: "Google Ads Search Certification" }],
  },
  lines: [
    {
      weak: "Gerenciei redes sociais e campanhas pagas.",
      strong:
        "Conduzi campanhas no Google Ads e na Meta com orçamento mensal de US$ 21.000, elevando o retorno sobre o investimento em mídia de 2,1 para 3,4 em 9 meses.",
    },
    {
      weak: "Lidei com o SEO do site da empresa.",
      strong:
        "Aumentei o tráfego orgânico de 40.000 para 110.000 visitas por mês com um plano de SEO baseado em 60 páginas de produto e tutoriais.",
    },
    {
      weak: "Responsável pelo e-mail marketing.",
      strong:
        "Criei e-mails de carrinho abandonado no HubSpot que hoje recuperam 9% dos carrinhos, cerca de 1.200 pedidos por mês.",
    },
  ],
  skills: [{ label: "Canais" }, { label: "Análise de dados" }, { label: "Plataformas" }],
  tips: [
    {
      title: "Mostre orçamento e retorno juntos",
      text: "Um valor de investimento sozinho parece custo; um retorno sozinho parece sorte. Juntos, mostram que dá para confiar dinheiro a você: orçamento, canal, resultado.",
    },
    {
      title: "Escreva valores do jeito que o empregador lê",
      text: "Para vagas na Índia, lakh e rúpias soam naturais. Para vagas no exterior, converta para dólares americanos ou para a moeda local, ou use uma porcentagem, para ninguém precisar fazer conta.",
    },
    {
      title: "Cite as ferramentas da vaga",
      text: "Google Ads, Meta, HubSpot, GA4: vagas de marketing citam ferramentas com precisão, e a verificação de compatibilidade do Otto também. Diga a ferramenta dentro da linha em que você a usou.",
    },
  ],
  mistakes: [
    {
      title: "Métricas de vaidade",
      text: "Seguidores e impressões sem leads, vendas ou custo parecem enchimento. Junte o alcance ao resultado que ele gerou.",
    },
    {
      title: "“Lidei com as redes sociais”",
      text: "A verificação de linhas do Otto aponta aberturas fracas como “Lidei com” porque elas escondem o que você fez. Comece pela ação e termine com o número.",
    },
    {
      title: "Todo certificado que você tem",
      text: "Dois ou três certificados atuais das plataformas que você usa bastam. Uma lista longa de cursos curtos empurra seus resultados para baixo na página.",
    },
  ],
  faq: [
    {
      question: "O que um currículo de marketing digital deve incluir?",
      answer:
        "Os canais que você conduziu, os orçamentos que gerenciou e um resultado para cada um: leads, vendas, custo por lead ou retorno sobre o investimento em mídia. Inclua as ferramentas que usou e dois ou três certificados atuais.",
    },
    {
      question: "Como mostrar resultados se eu não sei os números exatos?",
      answer:
        "Use o que você consegue defender: uma faixa, uma porcentagem ou um antes e depois tirado dos seus relatórios. O Otto pede o número quando ajusta uma linha e nunca inventa um.",
    },
    {
      question: "Devo incluir um portfólio para marketing digital?",
      answer:
        "Um curto ajuda: duas ou três campanhas com o objetivo, o que você fez e o resultado. Deixe de fora qualquer coisa que seu empregador não gostaria de ver compartilhada.",
    },
  ],
};
