import type { ExampleWords } from "../../../examples";

export const graphicDesigner: ExampleWords<"graphic-designer"> = {
  role: "Designer gráfico",
  card: "Trabalho de marca, impressos e redes sociais, com o volume e os resultados por trás dele.",
  description:
    "Exemplo de currículo de designer gráfico: linhas de marca, impressos e redes sociais com volume, rapidez e resultados, e as habilidades de Adobe e Figma.",
  intro:
    "Seu portfólio mostra como o seu trabalho é; o seu currículo mostra como você trabalha. Quem contrata procura nele volume, rapidez, as marcas que você atendeu e o que os designs fizeram pelo negócio. Este exemplo coloca um número em cada um.",
  person:
    "Jasmine é inventada: uma designer gráfica com 5 anos entre um estúdio de design e uma equipe interna de marca, em Nashville, Tennessee. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de designer gráfica",
    basics: {
      headline: "Designer gráfica",
      links: [{ label: "Portfólio" }],
    },
    summary:
      "Designer gráfica com 5 anos em design de marca, embalagens e digital para marcas de alimentos e de música. Trabalha rápido no Adobe Creative Cloud e no Figma e cria templates que mantêm equipes pequenas dentro da identidade da marca.",
    experience: [
      {
        title: "Designer gráfica",
        bullets: [
          "Redesenhei as embalagens de 14 blends de café no Illustrator e no InDesign, ajudando a aumentar em 21% as vendas em supermercados no primeiro ano.",
          "Criei um kit de marca no Figma com 120 templates para posts, cardápios e sinalização, reduzindo os pedidos de design de 35 para 12 por semana.",
          "Desenvolvi 6 layouts de e-mail e landing page por mês com a equipe de marketing, elevando a taxa de cliques dos e-mails de 2,4% para 3,8%.",
          "Preparei 300 arquivos de impressão por ano para 4 gráficas sem nenhum trabalho recusado, mantendo cada lançamento sazonal na data prevista.",
        ],
      },
      {
        title: "Designer gráfica júnior",
        bullets: [
          "Criei 40 logos e identidades de marca para restaurantes, casas de show e gravadoras, com 90% aprovados em até 2 rodadas.",
          "Produzi 25 anúncios animados por mês no After Effects para uma produtora de shows, aumentando em 34% os cliques no link de ingressos.",
          "Tratei 2.000 fotos de produtos no Photoshop e no Lightroom para 3 lojas online, entregando cada lote em 48 horas.",
        ],
      },
    ],
    education: [{ degree: "B.F.A.", field: "Design Gráfico" }],
    skills: [
      { label: "Design", items: ["Illustrator", "Photoshop", "InDesign", "Figma"] },
      { label: "Motion e foto", items: ["After Effects", "Premiere Pro", "Lightroom"] },
      { label: "Técnica", items: ["Tipografia", "Embalagens", "Produção gráfica"] },
    ],
  },
  lines: [
    {
      weak: "Fiz design gráfico para redes sociais.",
      strong:
        "Produzi 25 anúncios animados por mês no After Effects para uma produtora de shows, aumentando em 34% os cliques no link de ingressos.",
    },
    {
      weak: "Responsável pelo design de embalagens.",
      strong:
        "Redesenhei as embalagens de 14 blends de café no Illustrator e no InDesign, ajudando a aumentar em 21% as vendas em supermercados no primeiro ano.",
    },
    {
      weak: "Criei vários templates para a equipe de marketing.",
      strong:
        "Criei um kit de marca no Figma com 120 templates para posts, cardápios e sinalização, reduzindo os pedidos de design de 35 para 12 por semana.",
    },
  ],
  skills: [
    { label: "Ferramentas de design" },
    { label: "Motion e foto" },
    { label: "Digital e sistemas" },
  ],
  tips: [
    {
      title: "Conte o que você entregou",
      text: "Peças por mês, campanhas por ano, arquivos enviados para a gráfica. O volume mostra a uma equipe interna que você acompanha o ritmo, e é um número que a maioria dos designers esquece de dar.",
    },
    {
      title: "Ligue o design a um resultado",
      text: "Vendas depois da nova embalagem, cliques depois de um novo anúncio, menos pedidos depois de um kit de templates. Você não precisa ficar com todo o crédito; “ajudando a aumentar as vendas” é honesto e continua útil.",
    },
    {
      title: "Deixe o portfólio mostrar",
      text: "Coloque o link no cabeçalho e cite o projeto correspondente numa linha. O currículo diz o que aconteceu; o portfólio mostra como ficou.",
    },
  ],
  mistakes: [
    {
      title: "Um currículo com cara de pôster",
      text: "Colunas, ícones e barras de habilidades ficam bonitos para você e quebram quando o software de recrutamento os lê. Mantenha o currículo simples e guarde o capricho para o portfólio.",
    },
    {
      title: "Notas de 1 a 5 para cada software",
      text: "Quatro estrelas em Photoshop não significam nada para quem lê. Liste as ferramentas e depois mostre-as em ação em linhas com projetos reais.",
    },
    {
      title: "Só descrever a aparência",
      text: "“Limpo, moderno, ousado” são palavras de gosto. Acrescente a marca, o formato e o que o trabalho fez, para que quem lê sem ser designer veja o valor.",
    },
  ],
  faq: [
    {
      question: "O que um currículo de designer gráfico deve incluir?",
      answer:
        "Suas ferramentas de design, as marcas e os formatos em que você trabalhou, o link do portfólio e números de volume, prazo ou resultados. Mantenha tudo em uma página, a menos que você tenha bem mais de 10 anos de trabalho.",
    },
    {
      question: "Preciso de diploma para ser contratado como designer gráfico?",
      answer:
        "Muitas vagas pedem graduação em design ou em área relacionada, mas um portfólio forte costuma pesar mais. Se você aprendeu sozinho, liste cursos e certificados em Formação e comece pelos seus melhores trabalhos para clientes.",
    },
    {
      question: "Designer gráfico é o mesmo que designer de UI?",
      answer:
        "Não. O designer gráfico trabalha com marca, impressos, embalagens e marketing; o designer de UI projeta as telas que as pessoas usam. Nas vagas compatíveis, o Otto trata os dois como trabalhos diferentes, então ajuste o seu título à vaga.",
    },
  ],
};
