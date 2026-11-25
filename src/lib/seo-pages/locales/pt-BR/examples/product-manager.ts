import type { ExampleWords } from "../../../examples";

export const productManager: ExampleWords<"product-manager"> = {
  role: "Gerente de produto",
  card: "Resultados primeiro, com a pesquisa e os experimentos por trás deles.",
  description:
    "Exemplo de currículo de gerente de produto: linhas com o resultado, como você o encontrou e quem liderou, as habilidades das vagas e erros comuns.",
  intro:
    "Um gerente de produto não escreve o código nem desenha as telas, então o currículo precisa mostrar o que mudou por causa das decisões dele. Este exemplo abre cada linha com um resultado e o sustenta com o caminho que a equipe percorreu até lá.",
  person:
    "David é inventado: um gerente de produto com 6 anos, que passou da engenharia para produto numa empresa de viagens em Seattle. Nomes, empresas e números são inventados.",
  resume: {
    title: "Currículo de gerente de produto",
    basics: {
      headline: "Gerente de produto",
      links: [{ label: "Portfólio" }],
    },
    summary:
      "Gerente de produto com 3 anos em produto e 3 em engenharia, trabalhando com reservas e pagamentos de um app de viagens. Entrega em passos pequenos, mede com honestidade e põe as coisas por escrito.",
    experience: [
      {
        title: "Gerente de produto",
        bullets: [
          "Liderei uma equipe de 7 pessoas na reconstrução do checkout de hotéis, elevando a conclusão de reservas de 61% para 70% em dois trimestres.",
          "Descobri em 30 entrevistas com usuários que as pessoas desistiam na etapa da fatura para empresas, e reduzi essa etapa a um campo opcional.",
          "Criei revisões semanais de produto no Amplitude com design e engenharia, para que uma etapa quebrada do funil apareça em 7 dias em vez de 30.",
          "Escrevi o roadmap de pagamentos divididos com Apple Pay e cartões, lançado para 2 milhões de usuários com taxa de falha de 0,2%.",
        ],
      },
      {
        title: "Gerente de produto associado",
        bullets: [
          "Rodei 12 testes A/B de filtros de busca em 5 meses, mantendo os 3 que aumentaram as buscas por sessão.",
        ],
      },
      {
        title: "Engenheiro de software",
        bullets: [
          "Criei as APIs de reserva de um app de passagens de ônibus que processava 40.000 reservas por dia no pico.",
          "Comecei a fazer trabalho de produto escrevendo especificações de 2 funcionalidades, o que levou à mudança para um cargo de APM.",
        ],
      },
    ],
    education: [{ degree: "B.S.", field: "Engenharia Elétrica e de Computação" }],
    skills: [
      {
        label: "Produto",
        items: [
          "Gestão de produto",
          "Planejamento de roadmap",
          "Pesquisa com usuários",
          "Testes A/B",
          "Agile",
        ],
      },
      { label: "Ferramentas", items: ["Jira", "Amplitude", "SQL", "Figma", "Confluence"] },
    ],
  },
  lines: [
    {
      weak: "Gerenciei o roadmap do produto de checkout.",
      strong:
        "Liderei uma equipe de 7 pessoas na reconstrução do checkout de hotéis, elevando a conclusão de reservas de 61% para 70% em dois trimestres.",
    },
    {
      weak: "Conduzi pesquisas com usuários.",
      strong:
        "Descobri em 30 entrevistas com usuários que as pessoas desistiam na etapa da fatura para empresas, e reduzi essa etapa a um campo opcional.",
    },
    {
      weak: "Colaborei com equipes multifuncionais para entregar funcionalidades.",
      strong:
        "Escrevi o roadmap de pagamentos divididos com Apple Pay e cartões, lançado para 2 milhões de usuários com taxa de falha de 0,2%.",
    },
  ],
  skills: [
    { label: "Trabalho de produto" },
    { label: "Formas de trabalho" },
    { label: "Dados e design" },
  ],
  tips: [
    {
      title: "Comece pelo resultado",
      text: "Conversão, retenção, receita, tempo poupado, chamados de suporte evitados. Escolha o número que a empresa acompanhava e coloque-o primeiro; depois diga como a equipe o mudou.",
    },
    {
      title: "Mostre como você decidiu",
      text: "Uma linha sobre entrevistas, um experimento ou uma extração de dados mostra que você decide com base em evidências. Quem contrata procura isso em toda entrevista de produto.",
    },
    {
      title: "Deixe visível a mudança para produto",
      text: "Se você veio de engenharia, design ou suporte, mantenha esse emprego e acrescente uma linha sobre o trabalho de produto que fez lá. É um ponto forte, não uma lacuna.",
    },
  ],
  mistakes: [
    {
      title: "“Colaborei com equipes multifuncionais”",
      text: "Todo gerente de produto faz isso, então não diz nada. Diga o que a equipe lançou e o que mudou.",
    },
    {
      title: "Ficar com o crédito da empresa inteira",
      text: "Se a receita cresceu 40% enquanto você cuidava de uma funcionalidade, diga o que a sua funcionalidade fez. Entrevistadores conferem, e um número menor e honesto se sustenta.",
    },
    {
      title: "Só nomes de funcionalidades",
      text: "“Lancei os Filtros Inteligentes” não significa nada fora da empresa. Diga em poucas palavras simples o que isso fez pelos usuários.",
    },
  ],
  faq: [
    {
      question: "Como escrever um currículo de gerente de produto sem ter o cargo de PM?",
      answer:
        "Mantenha seus cargos reais e mostre o trabalho de produto dentro deles: especificações que você escreveu, pesquisas que conduziu, lançamentos que liderou. Uma linha curta no resumo pode dizer que você está migrando para produto.",
    },
    {
      question: "O currículo de gerente de produto deve ter uma página?",
      answer:
        "Uma página até uns 5 anos de experiência; duas páginas depois disso, se a segunda tiver resultados reais. Reduza empregos antigos a uma ou duas linhas em vez de diminuir a fonte.",
    },
    {
      question: "Que métricas um gerente de produto deve colocar no currículo?",
      answer:
        "As que a sua equipe acompanhava: conversão, ativação, retenção, receita ou custo. Mostre o antes e o depois, e quanto tempo levou.",
    },
  ],
};
