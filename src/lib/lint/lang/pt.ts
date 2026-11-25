import { indexPhrases, vagueOf, wordSet, type LintLanguage } from "./types";

// Brazilian and European Portuguese; CVs often lead with a noun ("Gestão de…"), which reads as strong.

const STOCK_PHRASES = [
  "altamente motivada",
  "altamente motivado",
  "ampla experiência",
  "apaixonada por",
  "apaixonado por",
  "atenção aos detalhes",
  "atento aos detalhes",
  "automotivada",
  "automotivado",
  "boa comunicação",
  "boas habilidades de comunicação",
  "capacidade de adaptação",
  "comprometido com resultados",
  "comprometida com resultados",
  "espírito de equipe",
  "excelente comunicação",
  "excelentes habilidades de comunicação",
  "facilidade de aprendizado",
  "facilidade de comunicação",
  "focada em resultados",
  "focado em resultados",
  "foco em resultados",
  "fora da caixa",
  "jogador de equipe",
  "orientada a resultados",
  "orientada para resultados",
  "orientado a resultados",
  "orientado para resultados",
  "paixão por",
  "pensar fora da caixa",
  "perfil dinâmico",
  "proatividade",
  "proativa",
  "proativo",
  "sinergia",
  "sinergias",
  "sob pressão",
  "sólida experiência",
  "trabalhar sob pressão",
  "trabalho em equipa",
  "trabalho em equipe",
  "trabalho sob pressão",
  "valor acrescentado",
  "valor agregado",
  "vestir a camisa",
];

const DUTY_STARTS = [
  "a cargo de",
  "atuação em",
  "atuação na",
  "atuação no",
  "atuando em",
  "atuando na",
  "atuando no",
  "atuei em",
  "atuei na",
  "atuei no",
  "encarregada da",
  "encarregada de",
  "encarregada do",
  "encarregado da",
  "encarregado de",
  "encarregado do",
  "fui responsável pela",
  "fui responsável pelo",
  "fui responsável por",
  "minhas atividades",
  "minhas funções",
  "minhas responsabilidades",
  "responsável pela",
  "responsável pelas",
  "responsável pelo",
  "responsável pelos",
  "responsável por",
  "trabalhando em",
  "trabalhando na",
  "trabalhando no",
  "trabalhei em",
  "trabalhei na",
  "trabalhei no",
];

const WEAK_STARTS = [
  "ajuda com",
  "ajuda na",
  "ajuda no",
  "ajudando",
  "ajudei",
  "ajudei a",
  "ajudei com",
  "ajudei na",
  "ajudei no",
  "apoiando",
  "apoiei",
  "apoio a",
  "apoio ao",
  "apoio na",
  "apoio no",
  "auxiliando",
  "auxiliei",
  "auxiliei na",
  "auxiliei no",
  "auxílio na",
  "auxílio no",
  "colaboração em",
  "colaboração na",
  "colaboração no",
  "colaborei",
  "colaborei em",
  "colaborei na",
  "colaborei no",
  "envolvida em",
  "envolvido em",
  "estive envolvida em",
  "estive envolvido em",
  "fiz",
  "fiz parte da",
  "fiz parte de",
  "fiz parte do",
  "fui",
  "lidei com",
  "participação em",
  "participação na",
  "participação no",
  "participei",
  "participei da",
  "participei de",
  "participei do",
  "participei em",
  "trabalhei com",
];

const RESULT_WORDS = wordSet(`
  aceleração acelerando acelerei acelerou alcancei alcançou atingi atingindo atingiu
  aumentada aumentado aumentando aumentei aumento aumentou conquistei conquistou corte cortei
  cortou cresceu crescendo cresci crescimento diminuição diminuí diminuindo diminuiu dobrei
  dobrou dupliquei duplicou economia economizando economizei economizou elevei elevou
  eliminação eliminando eliminei eliminou encurtei encurtou evitei evitou expandi expandiu
  expansão ganhei ganhou gerando gerei gerou impulsionando impulsionei impulsionou maximizei
  maximizou melhorada melhorado melhorando melhorei melhoria melhorias melhorou minimizei
  minimizou permitindo permitiu possibilitando possibilitou poupei poupou preveni preveniu
  recuperei recuperou redução reduzi reduzida reduzidas reduzido reduzidos reduzimos reduzindo
  reduziu superando superei superou tripliquei triplicou
`);
const RESULT_PHRASES = indexPhrases([
  "adotada por",
  "adotado por",
  "de modo que",
  "levando a",
  "mais rápida",
  "mais rápido",
  "o que permitiu",
  "para que",
  "resultando em",
  "usada por",
  "usado por",
  "utilizada por",
  "utilizado por",
]);
const RESULT_OPENERS = wordSet(`
  acelerei cortei cresci diminuí diminuiu dobrei dobrou dupliquei economizei economizou gerei
  gerou impulsionei aumentei aumentou aumento melhorei melhorou melhoria redução reduzi reduziu
  tripliquei
`);

const NUMBER_WORDS = wordSet(`
  zero dois duas três quatro cinco seis sete oito nove dez onze doze treze catorze quatorze
  quinze dezesseis dezessete dezoito dezenove vinte trinta quarenta cinquenta sessenta setenta
  oitenta noventa cem cento centenas duzentos trezentos quinhentos mil milhares milhão milhões
  bilhão bilhões dobro triplo metade dúzia dúzias
`);

export const pt: LintLanguage = {
  lang: "pt",
  openerSkips: wordSet("eu nós"),
  elisions: false,
  abbreviations: wordSet("etc aprox sr sra dr dra ltda cia vs pag"),
  stock: indexPhrases(STOCK_PHRASES),
  duty: indexPhrases(DUTY_STARTS),
  weakStart: indexPhrases(WEAK_STARTS),
  // "me" and "nos" are left out: one is a reflexive in verbs, the other means "in the".
  firstPerson: {
    words: wordSet("eu meu minha meus minhas mim comigo nós nosso nossa nossos nossas"),
    team: wordSet("nós nosso nossa nossos nossas"),
  },
  result: { words: RESULT_WORDS, phrases: RESULT_PHRASES, suffixes: [], openers: RESULT_OPENERS },
  method: {
    words: wordSet("com usando utilizando através via após mediante"),
    phrases: indexPhrases([
      "através da",
      "através de",
      "através do",
      "por meio da",
      "por meio de",
      "por meio do",
    ]),
    gerund: /^(?!(?:quando|comando|mando)$).{2,}(?:ando|endo|indo)$/u,
    lead: null,
  },
  numberWords: NUMBER_WORDS,
  vague: vagueOf(
    {
      count: [
        "diversas",
        "diversos",
        "inúmeras",
        "inúmeros",
        "muitas",
        "muitos",
        "múltiplas",
        "múltiplos",
        "um monte de",
        "uma série de",
        "uma variedade de",
        "várias",
        "vários",
      ],
      list: ["entre outras", "entre outros", "etc"],
      thing: ["coisas"],
    },
    ["etc"],
  ),
};
