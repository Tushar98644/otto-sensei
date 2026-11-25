import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  results: {
    textReadable: {
      title: "O texto pode ser lido",
      detail: "O software de recrutamento consegue tirar o texto deste arquivo.",
    },
    textMissing: {
      title: "Nenhum texto legível",
      detail:
        "O software de recrutamento não consegue ler nenhum texto neste arquivo. Provavelmente é uma digitalização ou uma imagem.",
    },
    emailNotChecked: {
      title: "E-mail não verificado",
      detail: "Não há texto legível, então não deu para procurar um e-mail.",
    },
    emailFound: {
      title: "E-mail encontrado",
      detail: "Encontramos {email}, então os recrutadores conseguem falar com você.",
    },
    emailMissing: {
      title: "Nenhum e-mail",
      detail:
        "Não encontramos um e-mail no texto principal. Sem ele, os recrutadores não conseguem falar com você.",
    },
    phoneNotChecked: {
      title: "Telefone não verificado",
      detail: "Não há texto legível, então não deu para procurar um telefone.",
    },
    phoneFound: { title: "Telefone encontrado", detail: "Encontramos {phone}." },
    phoneMissing: {
      title: "Nenhum telefone",
      detail:
        "Não encontramos um telefone. Muitos recrutadores ligam ou mandam mensagem antes do e-mail.",
    },
    headerPdf: {
      title: "Nada escondido no cabeçalho",
      detail: "Em um PDF, o cabeçalho faz parte da página, então o software de recrutamento lê.",
    },
    headerClear: {
      title: "Nada escondido no cabeçalho",
      detail: "Nenhum dos seus contatos está escondido no cabeçalho ou no rodapé.",
    },
    headerEmail: {
      title: "Contatos no cabeçalho",
      detail:
        "Seu e-mail só está no cabeçalho ou no rodapé. Muitos sistemas pulam essas partes, então nunca o veem.",
    },
    headerPhone: {
      title: "Contatos no cabeçalho",
      detail:
        "Seu telefone só está no cabeçalho ou no rodapé. Muitos sistemas pulam essas partes, então nunca o veem.",
    },
    headerBoth: {
      title: "Contatos no cabeçalho",
      detail:
        "Seu e-mail e seu telefone só estão no cabeçalho ou no rodapé. Muitos sistemas pulam essas partes, então nunca os veem.",
    },
    sectionsNotChecked: {
      title: "Seções não verificadas",
      detail: "Não há texto legível, então não deu para verificar os títulos das seções.",
    },
    sectionsProjectsOnly: {
      title: "Nenhuma seção de experiência profissional",
      detail:
        "Encontramos Projetos, mas nenhum título de Experiência. Tudo bem no começo, mas empregos ficam em Experiência.",
    },
    sectionsNoWork: {
      title: "Nenhuma seção de experiência profissional",
      detail:
        "Não encontramos um título como “Experiência” ou “Experiência profissional”. Sem ele, muitos sistemas não conseguem separar seus empregos.",
    },
    sectionsNoSkillsOrEducation: {
      title: "Nenhuma seção de Habilidades ou Formação",
      detail:
        "Não encontramos títulos de Habilidades nem de Formação. Muitos sistemas usam os dois para ligar você às vagas.",
    },
    sectionsNoSkills: {
      title: "Nenhuma seção de Habilidades",
      detail:
        "Não encontramos um título de Habilidades. Muitos sistemas usam ele para ligar você às vagas.",
    },
    sectionsNoEducation: {
      title: "Nenhuma seção de Formação",
      detail: "Não encontramos um título de Formação. Muitos sistemas esperam um, mesmo que curto.",
    },
    sectionsFound: { title: "Títulos de seção claros", detail: "Encontramos {sections}." },
    layoutNotChecked: {
      title: "Layout não verificado",
      detail: "Não há texto legível, então não deu para verificar o layout.",
    },
    singleColumn: {
      title: "Uma coluna",
      detail: "Seu texto é lido de cima para baixo, em uma coluna.",
    },
    columnsPdf: {
      title: "Layout em duas colunas",
      detail:
        "Sua página tem colunas lado a lado. Alguns sistemas leem direto de um lado ao outro e misturam tudo.",
    },
    columnsDocument: {
      title: "Layout em duas colunas",
      detail:
        "Seu documento está montado em colunas. Alguns sistemas leem direto de um lado ao outro e misturam tudo.",
    },
    tablesPdf: {
      title: "Sem problemas com tabelas",
      detail:
        "Tabelas só atrapalham o software de recrutamento em arquivos do Word. Em um PDF elas são texto comum, e a verificação do layout já cobre isso.",
    },
    tablesNone: {
      title: "Sem tabelas",
      detail: "Seu texto não está dentro de tabelas, que alguns sistemas leem errado.",
    },
    tablesFound: {
      title: "Há tabelas",
      detail: {
        one: "Seu arquivo tem {count} tabela. Alguns sistemas leem as células fora de ordem ou pulam elas.",
        other:
          "Seu arquivo tem {count} tabelas. Alguns sistemas leem as células fora de ordem ou pulam elas.",
      },
    },
    textBoxesPdf: {
      title: "Sem problemas com caixas de texto",
      detail:
        "Em um PDF, caixas de texto viram texto comum que o software de recrutamento consegue ler.",
    },
    textBoxesNone: {
      title: "Sem caixas de texto",
      detail: "Todo o seu texto está na página principal.",
    },
    textBoxesFound: {
      title: "Há caixas de texto",
      detail: {
        one: "Seu arquivo tem {count} caixa de texto. Muitos sistemas pulam caixas de texto por inteiro, então esse texto pode nunca ser lido.",
        other:
          "Seu arquivo tem {count} caixas de texto. Muitos sistemas pulam caixas de texto por inteiro, então esse texto pode nunca ser lido.",
      },
    },
    imagesNone: { title: "Sem imagens", detail: "Nada importante está escondido em uma imagem." },
    imagePages: {
      title: "As páginas são imagens",
      detail: "Suas páginas são imagens. O software de recrutamento não vê o que tem nelas.",
    },
    imagesFound: {
      title: "Há imagens",
      detail: {
        one: "Encontramos {count} imagem. Logos, fotos e barras de habilidade são invisíveis para o software de recrutamento.",
        other:
          "Encontramos {count} imagens. Logos, fotos e barras de habilidade são invisíveis para o software de recrutamento.",
      },
    },
    iconsNotChecked: {
      title: "Ícones não verificados",
      detail: "Não há texto legível, então não deu para procurar caracteres de ícone.",
    },
    iconsNone: {
      title: "Sem caracteres de ícone",
      detail: "Nenhum símbolo que apareceria como texto estranho.",
    },
    iconsFound: {
      title: "Há caracteres de ícone",
      detail: {
        one: "Encontramos {count} caractere de ícone, como símbolos de telefone ou e-mail. Muitos sistemas mostram eles como quadrados ou lixo.",
        other:
          "Encontramos {count} caracteres de ícone, como símbolos de telefone ou e-mail. Muitos sistemas mostram eles como quadrados ou lixo.",
      },
    },
    datesNotChecked: {
      title: "Datas não verificadas",
      detail: "Não há texto legível, então não deu para verificar suas datas.",
    },
    datesNone: {
      title: "Nenhuma data encontrada",
      detail:
        "Não encontramos datas para seus empregos. Muitos sistemas usam elas para calcular seus anos de experiência.",
    },
    datesFound: {
      title: "Há datas",
      detail:
        "Encontramos datas como “{sample}”, então os sistemas conseguem calcular sua experiência.",
    },
    datesMixed: {
      title: "Formatos de data misturados",
      detail:
        "Suas datas misturam estilos, como “{main}” e “{other}”. Alguns sistemas leem errado formatos misturados ao somar sua experiência.",
    },
    datesConsistent: {
      title: "Datas consistentes",
      detail: "Todas as datas dos seus empregos usam um só estilo, como “{sample}”.",
    },
    lengthNotChecked: {
      title: "Tamanho não verificado",
      detail: "Não há texto legível, então não deu para verificar o tamanho.",
    },
    lengthShort: {
      title: "Muito pouco texto",
      detail: {
        one: "Encontramos só {count} palavra. Isso dá ao software de recrutamento pouco para comparar com uma vaga.",
        other:
          "Encontramos só {count} palavras. Isso dá ao software de recrutamento pouco para comparar com uma vaga.",
      },
    },
    lengthLong: {
      title: "Mais de duas páginas",
      detail: {
        one: "Seu currículo tem {count} página. Recrutadores leem por cima, e muitos esperam uma ou duas.",
        other:
          "Seu currículo tem {count} páginas. Recrutadores leem por cima, e muitos esperam uma ou duas.",
      },
    },
    lengthGood: {
      title: "Bom tamanho",
      detail:
        "{pages} e {words}: o bastante para combinar com vagas, curto o bastante para ler por cima.",
    },
    bulletsNotChecked: {
      title: "Tópicos não verificados",
      detail: "Não há texto legível, então não deu para verificar seus tópicos.",
    },
    bulletsParagraphs: {
      title: "Parágrafos longos nos seus empregos",
      detail:
        "Os detalhes dos seus empregos estão em parágrafos longos. Tópicos curtos são mais fáceis de ler e de combinar.",
    },
    bulletsGood: {
      title: "Fácil de ler por cima",
      detail: "Sem parágrafos longos, então seus empregos são rápidos de ler.",
    },
  },
  fixes: {
    scan: "Envie um PDF exportado do Word ou do Google Docs, não uma digitalização ou foto.",
    moveEmail: "Tire seu e-mail do cabeçalho e coloque no texto principal.",
    addEmail: "Coloque seu e-mail como texto comum perto do topo da página.",
    movePhone: "Tire seu telefone do cabeçalho e coloque no texto principal.",
    addPhone: "Coloque seu telefone ao lado do seu e-mail.",
    moveContact: "Coloque seus contatos no corpo da página.",
    addExperience: "Se você teve empregos ou estágios, liste eles sob um título de “Experiência”.",
    nameExperience: "Coloque seus empregos sob um título claro, como “Experiência”.",
    addSkillsAndEducation: "Adicione seções curtas de “Habilidades” e “Formação”.",
    addSkills: "Adicione uma seção de “Habilidades” com as ferramentas que você usa.",
    addEducation: "Adicione uma seção de “Formação”, mesmo que tenha uma linha.",
    oneColumn: "Mude para um layout de uma coluna.",
    noTables: "Troque as tabelas por linhas de texto comum.",
    noTextBoxes: "Tire o texto das caixas de texto e coloque na página principal.",
    noImages: "Tire as imagens, ou repita o que importa como texto comum.",
    noIcons: "Troque os ícones por palavras como “E-mail” e “Telefone”.",
    addDates: "Adicione datas de início e fim a cada emprego, como “jan 2021 - mar 2023”.",
    oneDateStyle: "Escreva todas as datas do mesmo jeito, como “{main}”.",
    addLines: "Adicione alguns tópicos sobre o que você fez em cada cargo.",
    trim: "Corte os cargos mais antigos ou menos relevantes para caber em duas páginas.",
    bullets: "Divida cada emprego em 3 a 5 tópicos curtos que comecem com um verbo.",
  },
  units: {
    pages: { one: "{count} página", other: "{count} páginas" },
    words: { one: "{count} palavra", other: "{count} palavras" },
  },
  sections: {
    summary: "Resumo",
    experience: "Experiência",
    projects: "Projetos",
    education: "Formação",
    skills: "Habilidades",
    certifications: "Certificações",
  },
} satisfies Translation<Messages["fileChecks"]>;
