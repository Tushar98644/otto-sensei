import type { Messages } from "..";
import type { Translation } from "../../types";

// The free job match tool's own words, in Brazilian Portuguese.
export default {
  privacy: {
    pasted: "O texto colado é verificado no seu navegador e nunca sai dele.",
    uploaded: "A verificação roda no seu navegador. Nada é armazenado.",
  },
  sample: {
    try: "Testar com um exemplo",
    putBack: "Restaurar meu texto",
    clear: "Limpar o exemplo",
  },
  submit: "Verificar a compatibilidade",
  failed: { title: "A verificação não carregou", body: "Confira sua conexão e tente de novo." },
  stale: {
    title: "Você mudou o texto depois desta verificação",
    body: "Verifique a compatibilidade de novo para atualizar.",
  },
  pasteText: "Colar texto",
  resume: {
    title: "Seu currículo",
    tabs: "Como adicionar seu currículo",
    upload: "Enviar um arquivo",
    label: "Texto do currículo",
    placeholder: "Cole seu currículo aqui",
    hint: "Copie do seu arquivo ou do seu perfil, com títulos e tudo.",
    problems: {
      reading: "Aguarde um momento enquanto o Otto lê seu arquivo.",
      noFile: "Escolha o arquivo do seu currículo ou cole o texto.",
      empty: "Cole seu currículo primeiro.",
      short: "Está um pouco curto. Cole o currículo inteiro.",
      long: "Isso é mais longo que um currículo. Cole só o seu currículo.",
    },
  },
  upload: {
    label: "Envie seu currículo, um arquivo PDF ou Word",
    reading: "Lendo {name}…",
    read: "{words} palavras lidas. Escolha outro arquivo para trocar.",
    drop: "Solte seu currículo aqui ou escolha um arquivo",
    formats: "PDF ou Word (.docx), até {size}",
    kept: "Seu arquivo é lido no nosso servidor para extrair o texto e depois é descartado. Não o armazenamos.",
    failed: "Algo deu errado ao ler esse arquivo. Tente de novo ou cole o texto.",
    pictureOnly:
      "Esse arquivo é só uma imagem, então o software de recrutamento vê uma página em branco. Cole o texto do seu currículo.",
  },
  post: {
    title: "A vaga",
    tabs: "Como adicionar a vaga",
    link: "Colar um link",
    label: "Texto da vaga",
    placeholder: "Cole a vaga aqui, ou o link dela",
    hint: "Cole tudo: atividades, requisitos e diferenciais.",
    problems: {
      empty: "Cole a vaga primeiro.",
      short: "Está um pouco curto. Cole a vaga inteira, não só o título.",
      long: "Passou de {max} caracteres. Corte a apresentação da empresa ou os benefícios.",
    },
  },
  link: {
    label: "Link da vaga",
    hint: "Cole o link e o Otto lê na hora. Funciona com a maioria dos sites de vagas, mas não com o LinkedIn nem com o Indeed.",
    reading: "O Otto está lendo a vaga…",
    readingStatus: "O Otto está lendo a vaga.",
    readStatus: "Vaga lida: {title}.",
    untitledStatus: "sem título",
    from: "Do link",
    untitled: "Vaga sem título",
    seeText: "Ver o texto que o Otto leu",
    pasteInstead: "Colar o texto da vaga",
    system: "Esta vaga usa o {name}.",
    guide: "Ler o guia do {name}",
    newTab: "(abre em uma nova aba)",
    problems: {
      empty: "Cole o link da vaga primeiro.",
      notLink: "Isso não parece um link. Copie da barra de endereço do navegador.",
      tooLong: "Esse link é longo demais. Copie o endereço da própria vaga.",
      offline: "Parece que você está offline. Confira sua conexão ou cole o texto da vaga.",
      failed: "O Otto não conseguiu ler esse link agora. Cole o texto da vaga.",
    },
  },
  result: {
    eyebrow: "Verificação de palavras grátis",
    headline: {
      one: "O Otto encontrou {found} de {count} habilidade citada na vaga",
      other: "O Otto encontrou {found} de {count} habilidades citadas na vaga",
    },
    none: "Nenhuma habilidade ou ferramenta que o Otto conhece nesta vaga",
    noneBody:
      "O Otto procura as habilidades, ferramentas, licenças e idiomas que ele conhece, e esta vaga não cita nenhum deles. Cole a vaga inteira, com os requisitos, e verifique de novo.",
    body: "O Otto procurou cada habilidade, ferramenta e licença que a vaga cita, palavra por palavra, do jeito que os filtros de palavras-chave fazem. É uma contagem, não uma nota.",
    count: "{label}: {found} de {total} encontrados",
    listed: {
      one: "Uma aparece só numa lista, como suas habilidades. Recrutadores procuram uma linha que diga onde você a usou.",
      other:
        "{count} aparecem só numa lista, como suas habilidades. Recrutadores procuram uma linha que diga onde você as usou.",
    },
    groups: {
      must: "Obrigatórios",
      nice: "Diferenciais",
      alsoNamed: "Também citadas na vaga",
      all: "Habilidades citadas na vaga",
    },
    status: {
      shown: "Em uma linha",
      listed: "Listada, não demonstrada",
      missing: "Não encontrada",
    },
    missingHint:
      "Se você já usou, adicione uma linha dizendo onde e o que você fez. Use as palavras da própria vaga.",
    asks: {
      label: "Também na vaga",
      title: "A vaga também pede",
      note: "Uma verificação de palavras não consegue avaliar anos de experiência ou diplomas. Compare esses pedidos com suas datas e sua formação você mesmo.",
    },
  },
  otto: {
    none: "Não encontrei habilidades ou ferramentas que eu conheça nesta vaga. Uma vaga que lista os requisitos funciona melhor.",
    all: {
      one: "Seu currículo menciona a única habilidade citada nesta vaga.",
      other: "Seu currículo menciona todas as {count} habilidades citadas nesta vaga.",
    },
    mustLeft: {
      one: "{count} dos {total} requisitos obrigatórios da vaga ainda não está no seu currículo. Comece por aí.",
      other:
        "{count} dos {total} requisitos obrigatórios da vaga ainda não estão no seu currículo. Comece por aí.",
    },
    some: {
      one: "Seu currículo menciona {found} de {count} habilidade citada nesta vaga. Veja onde.",
      other:
        "Seu currículo menciona {found} das {count} habilidades citadas nesta vaga. Veja onde.",
    },
  },
  studio: {
    title: "Leve os dois para o estúdio",
    opens: {
      file: "O estúdio grátis lê seu arquivo",
      sample: "O estúdio grátis abre com o currículo de exemplo",
      pasted: "O estúdio grátis abre com o currículo que você colou",
    },
    body: "{opens} e guarda esta vaga para o Personalizar. Ajuste linhas à mão ou com o Otto ({fixes} ajustes de linha grátis por mês) e baixe um PDF limpo. No Pro, o Otto personaliza seu currículo para esta vaga.",
    cta: "Ajustar estas linhas com o Otto",
    failed: "O estúdio não abriu. Confira sua conexão e tente de novo.",
  },
} satisfies Translation<Messages["matchCheck"]>;
