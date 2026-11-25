import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  quote: "“{text}”",
  issues: {
    stock: {
      one: "{phrases} é uma frase que recrutadores ignoram. Mostre o resultado.",
      other: "{phrases} são frases que recrutadores ignoram. Mostre o resultado.",
    },
    weakStart: "Troque {phrase} pelo que você fez, como “Criei”, “Reduzi” ou “Liderei”.",
    duty: "{phrase} parece descrição de cargo. Diga o que você fez e o que mudou.",
    tense: "Este trabalho já terminou, então escreva {past}, não {phrase}.",
    noResult: "O que mudou por causa disso? Inclua o resultado e, se souber, quanto.",
    noNumber: "Quantos, quanto ou com que rapidez? Inclua um número se souber.",
    noNumberWord: "{word} quanto, ou para quantos? Inclua um número se souber.",
    noMethod: "Diga como você fez: o que criou, mudou ou colocou em prática?",
    firstPersonTeam: "{word} esconde a sua parte. Diga o que você fez.",
    firstPersonSelf: "Tire {word}. No currículo não se escreve “eu”, “meu” nem “nós”.",
    passive: "{phrase} esconde quem fez. Diga o que você fez.",
    vagueList: "{phrase} é vago. Diga o que importa ou corte.",
    vagueThing: "{phrase} é vago. Diga exatamente o quê.",
    vagueCount: "{phrase} é vago. Dê o número real.",
    tooLongWords:
      "Esta linha tem {count} palavras. Reduza para duas linhas para facilitar a leitura rápida.",
    tooLongChars:
      "Esta linha tem {count} caracteres. Reduza para duas linhas para facilitar a leitura rápida.",
    tooShort:
      "Esta linha é curta demais para mostrar muita coisa. Diga o que você fez e o que mudou.",
    duplicate: "Esta linha repete outra. Mantenha uma ou faça cada uma dizer algo novo.",
    stopMost: "A maioria das linhas aqui termina com ponto final. Coloque um aqui também.",
    stopFirst: "Sua primeira linha aqui termina com ponto final. Coloque um aqui também.",
    noneMost: "A maioria das linhas aqui termina sem ponto final. Tire este para combinar.",
    noneFirst: "Sua primeira linha aqui termina sem ponto final. Tire este para combinar.",
  },
  help: {
    duty: {
      why: "Recrutadores procuram o que você fez e o que mudou, não a descrição do cargo.",
      before: "Responsável pela manutenção do banco de dados",
      after: "Mantive o banco de dados com 99,9% de disponibilidade com backups automáticos",
    },
    "no-result": {
      why: "Uma linha que termina em um resultado mostra por que seu trabalho importou.",
      before: "Desenvolvi APIs REST em Node.js",
      after: "Criei APIs REST em Node.js que reduziram o carregamento da página de 3 s para 0,8 s",
    },
    "no-number": {
      why: "Um número mostra o tamanho do resultado: quantos, quanto ou com que rapidez.",
      before: "Melhorei o fluxo de checkout",
      after: "Melhorei o fluxo de checkout e aumentei em 12% os pedidos concluídos",
    },
    "no-method": {
      why: "Dizer como você chegou ao resultado o torna crível.",
      before: "Reduzi em 30% os custos de nuvem",
      after: "Reduzi em 30% os custos de nuvem ao mover jobs em lote para servidores mais baratos",
    },
    "weak-start": {
      why: "A primeira palavra é lida primeiro. Um verbo forte mostra que você fez o trabalho.",
      before: "Ajudei a migrar o portal de pacientes para React",
      after: "Migrei para React o portal de pacientes usado por 40.000 pacientes",
    },
    "first-person": {
      why: "Linhas de currículo não usam “eu” nem “nós”. É o seu currículo, então fica claro quem fez.",
      before: "Eu criei o sistema de cobrança",
      after: "Criei o sistema de cobrança usado por 40 clientes",
    },
    tense: {
      why: "Trabalhos que você já deixou ficam no passado.",
      before: "Crio ferramentas internas para o time de suporte",
      after: "Criei ferramentas internas que pouparam 5 horas por semana ao suporte",
    },
    "too-long": {
      why: "Linhas longas são lidas por alto. Uma ou duas linhas cada fica mais fácil de ler.",
      after: "Reduzi em 40% o tempo de deploy ao mover os builds para um cache compartilhado",
    },
    "too-short": {
      why: "Poucas palavras não mostram o que você fez e o que mudou.",
      before: "Corrigi bugs",
      after: "Corrigi 120 bugs do checkout e reduzi em 18% os pagamentos com falha",
    },
    passive: {
      why: "Dizer o que você fez deixa clara a sua parte.",
      before: "O banco de dados foi migrado para PostgreSQL",
      after: "Migrei o banco de dados para PostgreSQL em 3 semanas",
    },
    vague: {
      why: "Palavras como “vários” ou “diversos” ficam no lugar de um número ou nome real.",
      before: "Conduzi vários webinars",
      after: "Conduzi 14 webinars com parceiros que trouxeram 2.300 inscrições",
    },
    "stock-phrase": {
      why: "Frases que todo currículo tem são ignoradas. Um resultado diz melhor.",
      before: "Profissional proativo e focado em resultados",
      after: "Liderei um time de 4 pessoas que lançou o app 2 semanas antes do prazo",
    },
    duplicate: { why: "Uma linha repetida ocupa o espaço de outro resultado." },
    punctuation: { why: "Linhas que terminam do mesmo jeito parecem organizadas e cuidadosas." },
  },
  checks: {
    result: "Diz o que mudou",
    start: "Começa forte",
    voice: "Sem eu ou nós",
    stock: "Sem frases feitas",
    length: "Tamanho certo",
    numbers: "Tem números",
    method: "Diz como",
    tense: "No passado",
    passive: "Diz quem fez",
    vague: "Sem palavras vagas",
    repeat: "Sem linhas repetidas",
    stops: "Pontos finais iguais",
  },
  review: {
    groups: {
      duty: {
        title: {
          one: "{count} linha parece descrição de cargo",
          other: "{count} linhas parecem descrição de cargo",
        },
        reason: "Recrutadores procuram o que você fez e o que mudou, não a tarefa em si.",
      },
      "no-result": {
        title: {
          one: "{count} linha não diz o que mudou",
          other: "{count} linhas não dizem o que mudou",
        },
        reason:
          "Cada linha deve terminar em um resultado: o que melhorou, para quem e quanto, se você souber.",
      },
      "weak-start": {
        title: { one: "{count} linha começa fraca", other: "{count} linhas começam fracas" },
        reason: "Comece com o que você fez, como Criei, Reduzi, Liderei ou Escrevi.",
      },
      "first-person": {
        title: { one: "{count} linha usa eu ou nós", other: "{count} linhas usam eu ou nós" },
        reason: "Linhas de currículo não usam eu, meu nem nós.",
      },
      "stock-phrase": {
        title: {
          one: "{count} linha usa frases feitas",
          other: "{count} linhas usam frases feitas",
        },
        reason: "Frases que todo currículo tem são ignoradas. Mostre o resultado.",
      },
      "too-long": {
        title: {
          one: "{count} linha passa de duas linhas",
          other: "{count} linhas passam de duas linhas",
        },
        reason: "Linhas longas são puladas. Deixe cada uma com uma ou duas linhas.",
      },
      tense: {
        title: {
          one: "{count} linha de trabalhos anteriores está no presente",
          other: "{count} linhas de trabalhos anteriores estão no presente",
        },
        reason: "Trabalhos que você deixou ficam no passado: Criei, não Crio.",
      },
      passive: {
        title: {
          one: "{count} linha esconde quem fez o trabalho",
          other: "{count} linhas escondem quem fez o trabalho",
        },
        reason: "Diga o que você fez, não o que foi feito.",
      },
      vague: {
        title: {
          one: "{count} linha usa palavras vagas",
          other: "{count} linhas usam palavras vagas",
        },
        reason: "Palavras como vários ou diversos ficam no lugar de um número ou nome real.",
      },
      duplicate: {
        title: { one: "{count} linha repete outra", other: "{count} linhas repetem outra" },
        reason: "Mantenha uma ou faça cada uma dizer algo novo.",
      },
      "too-short": {
        title: { one: "{count} linha é curta demais", other: "{count} linhas são curtas demais" },
        reason: "Poucas palavras não mostram o que você fez e o que mudou.",
      },
      "no-method": {
        title: {
          one: "{count} resultado não diz como",
          other: "{count} resultados não dizem como",
        },
        reason: "Um resultado convence mais quando diz como você chegou lá.",
      },
      "no-number": {
        title: {
          one: "{count} linha ficaria melhor com um número",
          other: "{count} linhas ficariam melhores com um número",
        },
        reason: "Quando você souber, um número mostra o tamanho: quantos, quanto, com que rapidez.",
      },
      punctuation: {
        title: {
          one: "Os pontos finais não combinam em {count} linha",
          other: "Os pontos finais não combinam em {count} linhas",
        },
        reason:
          "Linhas de um mesmo trabalho ou projeto ficam mais organizadas quando terminam do mesmo jeito: com ponto final ou sem.",
      },
    },
    summary: {
      place: "Resumo",
      both: "Seu resumo usa frases feitas e eu",
      firstPerson: "Seu resumo usa eu ou nós",
      stock: "Seu resumo usa frases feitas",
      reason: "O topo da página é lido primeiro, então deve soar como suas linhas: fatos, sem eu.",
    },
    firstLook: {
      title: {
        one: "{count} trabalho está sem cargo, empresa ou datas",
        other: "{count} trabalhos estão sem cargo, empresa ou datas",
      },
      reason: "O primeiro olhar de um recrutador vai para seus cargos, empresas e datas.",
      missing: "Sem {parts}.",
      parts: { title: "cargo", company: "empresa", dates: "datas" },
      at: "{title} em {company}",
      aJob: "Um trabalho",
    },
    headline: {
      title: "Nenhum cargo abaixo do seu nome",
      reason:
        "Coloque no topo o cargo que você quer, para quem lê saber a que vaga você está se candidatando.",
    },
    skills: {
      title: {
        one: "{count} habilidade só aparece na sua lista de habilidades",
        other: "{count} habilidades só aparecem na sua lista de habilidades",
      },
      reason: {
        one: "{skills}: nenhuma linha de trabalho ou projeto mostra você usando essa habilidade. Recrutadores e filtros confiam mais em uma habilidade que aparece no que você fez.",
        other:
          "{skills}: nenhuma linha de trabalho ou projeto mostra você usando essas habilidades. Recrutadores e filtros confiam mais em uma habilidade que aparece no que você fez.",
      },
      more: "{names} e mais {count}",
    },
  },
} satisfies Translation<Messages["lint"]>;
