import type { CompareTranslation, CompareValues } from "../../compare";

// Comparisons of Otto Sensei with other resume tools, in Brazilian Portuguese.
export default function compare(v: CompareValues): CompareTranslation {
  const freeResumes = v.plural(
    { one: "{count} currículo", other: "{count} currículos" },
    v.freeResumes,
  );
  const freeApplications = v.plural(
    { one: "{count} candidatura acompanhada", other: "{count} candidaturas acompanhadas" },
    v.freeApplications,
  );

  const OTTO = {
    what: {
      answer: "Toda a busca de emprego",
      detail: `Revise e crie seu currículo, depois encontre vagas abertas ranqueadas para ele. O Pro adiciona uma cópia personalizada, carta de apresentação e mensagens de contato para cada vaga, até ${v.proApplications} candidaturas que se atualizam pelo seu e-mail, preparação para entrevistas e um site de portfólio.`,
    },
    score: {
      answer: "Sem pontuação inventada",
      detail: "Cada verificação passa ou aponta o problema e como corrigir, em palavras simples.",
    },
    free: {
      answer: `${freeResumes}, sem cartão`,
      detail: `Revise, corrija e baixe em PDF nos formatos ${v.freeFormats}, com ${v.fixes} ajustes de linha por mês do Otto, suas ${v.freeJobMatches} vagas mais compatíveis e ${freeApplications}.`,
    },
    paid: {
      answer: `Pro: ${v.proMonthly} por mês`,
      detail: `Max: ${v.maxMonthly} por mês, para mais ajuda de IA, currículos e candidaturas acompanhadas. Cancele quando quiser.`,
    },
    downloads: {
      answer: "PDFs grátis, sem limite",
      detail: `Nos formatos ${v.freeFormats}. Todos os formatos e os downloads em Word (.docx) vêm com o Pro.`,
    },
    formats: {
      answer: `${v.templateCount} formatos, ${v.freeTemplateCount} grátis`,
      detail: `Cada um copia um layout de currículo muito usado: ${v.freeFormats} no Free, todos no Pro.`,
    },
    jobs: {
      answer: "Compatíveis com seu currículo",
      detail: `Vagas abertas das páginas de carreira das empresas e de feeds públicos de vagas, lidas todo dia. O Free mostra suas ${v.freeJobMatches} mais compatíveis; o Pro mostra todas.`,
    },
    systems: {
      answer: `Identifica ${v.systemCount} sistemas de recrutamento`,
      detail: "Pelo link da vaga, com notas com fontes sobre como cada um lida com candidaturas.",
    },
  };

  const NO_SCORE = {
    title: "Sem pontuação inventada",
    text: "Não existe uma pontuação padrão de ATS: cada sistema de recrutamento ranqueia os candidatos do seu jeito, e nenhum mostra um número para você. Por isso o Otto não inventa uma. Cada verificação passa ou aponta o problema e como corrigir.",
  };

  const FREE_PDFS = {
    title: "Downloads em PDF são grátis",
    text: "Revisar, editar e baixar um currículo em PDF não custa nada, sem limite de downloads.",
  };

  const EMPLOYER_JOBS = {
    title: "Vagas dos próprios sites dos empregadores",
    text: "O Otto lê as páginas de carreira das empresas e feeds públicos de vagas todo dia e ranqueia as vagas com base no seu currículo. Cada uma leva à vaga original.",
  };

  const SOURCED_NOTES = {
    title: "Notas com fontes sobre sistemas de recrutamento",
    text: `As notas do Otto sobre ${v.systemCount} sistemas de recrutamento trazem, cada uma, o link da página de onde vêm.`,
  };

  const READ_BACK = {
    title: "Formatos testados lendo o PDF de volta",
    text: "Todo formato é uma coluna de texto real, e cada PDF é testado lendo-o de volta.",
  };

  return {
    jobscan: {
      rows: [
        {
          label: "O que é",
          otto: OTTO.what,
          them: {
            answer: "Um scanner de currículo",
            detail:
              "Compara seu currículo com uma vaga e dá uma taxa de compatibilidade, além de um criador de currículo, controle de vagas, vagas compatíveis, otimização do LinkedIn, um gerador de carta de apresentação, candidatura automática e treino de entrevista com IA.",
          },
        },
        {
          label: "Pontuação",
          otto: OTTO.score,
          them: {
            answer: "Uma taxa de compatibilidade",
            detail:
              "Uma para cada análise, com meta de pelo menos 75%. Ela se baseia primeiro nas habilidades técnicas, depois no nível de escolaridade (só quando a vaga pede pós-graduação), no cargo, nas habilidades comportamentais e em outras palavras-chave.",
          },
        },
        {
          label: "Plano grátis",
          otto: OTTO.free,
          them: {
            answer: "Análises mensais grátis",
            detail:
              "Análises de currículo todo mês (cinco, segundo o blog do Jobscan), o criador de currículo e um teste do Premium de 7 dias.",
          },
        },
        {
          label: "Planos pagos",
          otto: OTTO.paid,
          them: {
            answer: "Premium, mensal ou trimestral",
            detail: "O Jobscan lista os preços na página de planos dele.",
          },
        },
        {
          label: "Vagas",
          otto: OTTO.jobs,
          them: {
            answer: "Vagas compatíveis e candidatura automática",
            detail:
              "Vagas compatíveis com seu currículo. Com a candidatura automática, você revisa cada candidatura antes do envio.",
          },
        },
        {
          label: "Sistemas de recrutamento",
          otto: OTTO.systems,
          them: {
            answer: "Detecta sistemas conhecidos",
            detail:
              "Informa o sistema de rastreamento de candidatos de uma vaga quando reconhece o sistema da empresa.",
          },
        },
      ],
      differences: [NO_SCORE],
      extras: [FREE_PDFS, EMPLOYER_JOBS, SOURCED_NOTES],
      sources: [
        { label: "Página inicial do Jobscan" },
        { label: "Tutorial do Jobscan" },
        { label: `Blog do Jobscan, “Jobscan vs Rezi” (${v.date("2026-06-18")})` },
        { label: `Blog do Jobscan, “Jobscan vs Huntr” (${v.date("2026-08-07")})` },
      ],
    },
    rezi: {
      rows: [
        {
          label: "O que é",
          otto: OTTO.what,
          them: {
            answer: "Um criador de currículo com IA",
            detail:
              "Com um agente de currículo com IA, um revisor de currículo e scanner de palavras-chave, um gerador de carta de apresentação, treino de entrevista com IA e busca de vagas.",
          },
        },
        {
          label: "Pontuação",
          otto: OTTO.score,
          them: {
            answer: "O Rezi Score",
            detail:
              "Avalia seu currículo com base em 23 métricas-chave, seção por seção. Limitado no Free, completo no Pro.",
          },
        },
        {
          label: "Plano grátis",
          otto: OTTO.free,
          them: {
            answer: "1 currículo, 3 PDFs",
            detail:
              "Mais 1 entrevista com IA. O Rezi Score e o direcionamento de palavras-chave com IA são limitados.",
          },
        },
        {
          label: "Planos pagos",
          otto: OTTO.paid,
          them: {
            answer: `Pro: ${v.reziPro} por mês`,
            detail: `Com currículos, downloads em PDF e entrevistas com IA ilimitados, e uma revisão de especialista por mês. Lifetime: ${v.usd(149)} uma vez, com os recursos do Pro, mas sem a revisão mensal.`,
          },
        },
        {
          label: "Downloads",
          otto: OTTO.downloads,
          them: { answer: "3 PDFs no Free", detail: "Ilimitados no Pro." },
        },
        { label: "Vagas", otto: OTTO.jobs, them: { answer: "Uma ferramenta de busca de vagas" } },
      ],
      differences: [
        NO_SCORE,
        { ...FREE_PDFS, text: `${FREE_PDFS.text} O plano Free do Rezi inclui 3 downloads em PDF.` },
        {
          title: "Um preço mensal menor",
          text: `O Otto Pro custa ${v.proMonthly} por mês; o Rezi Pro custa ${v.reziPro} por mês.`,
        },
      ],
      extras: [EMPLOYER_JOBS],
      sources: [{ label: "Página de preços do Rezi" }, { label: "Página inicial do Rezi" }],
    },
    kickresume: {
      rows: [
        {
          label: "O que é",
          otto: OTTO.what,
          them: {
            answer: "Criador de currículo e carta",
            detail:
              "Com um redator com IA, um verificador de currículo para ATS, um criador de site pessoal, um portal de vagas e apps para iOS e Android.",
          },
        },
        {
          label: "Plano grátis",
          otto: OTTO.free,
          them: {
            answer: "4 modelos básicos de currículo",
            detail:
              "Mais 4 modelos de carta de apresentação, 1 modelo básico de site e downloads ilimitados. O redator com IA e o verificador de currículo não estão incluídos.",
          },
        },
        {
          label: "Planos pagos",
          otto: OTTO.paid,
          them: {
            answer: "Premium, com preço por país",
            detail: `${v.usd(9)} por um mês, ${v.usd(18)} por três ou ${v.usd(48)} por um ano. Adiciona 40+ modelos, o redator com IA, o verificador de currículo para ATS, a importação do LinkedIn e de PDF, e os apps para celular.`,
          },
        },
        {
          label: "Downloads",
          otto: OTTO.downloads,
          them: { answer: "Ilimitados em todos os planos" },
        },
        {
          label: "Modelos",
          otto: OTTO.formats,
          them: {
            answer: "40+ no Premium",
            detail: "4 no Free. O Premium adiciona mais cores e fontes.",
          },
        },
      ],
      differences: [
        {
          title: "Revisão de currículo no Free",
          text: "A visão do recrutador grátis do Otto mostra o texto que o software de recrutamento extrai do seu arquivo, com um motivo claro para cada problema. O verificador de currículo para ATS do Kickresume vem com o Premium.",
        },
        {
          title: "Ajuda de IA no Free",
          text: `O Free inclui ${v.fixes} ajustes de linha por mês com o Otto. O redator com IA do Kickresume vem com o Premium.`,
        },
      ],
      extras: [READ_BACK, EMPLOYER_JOBS],
      sources: [
        { label: "Página de preços do Kickresume" },
        { label: "Página inicial do Kickresume" },
      ],
    },
    "resume-io": {
      rows: [
        {
          label: "O que é",
          otto: OTTO.what,
          them: {
            answer: "Criador de currículo e carta",
            detail:
              "Com um redator com IA, uma ferramenta de pontuação de ATS, um portal de vagas, conexão com recrutadores, candidatura automática feita pela equipe dele, treino de entrevista, um analisador de salário e cursos.",
          },
        },
        {
          label: "Plano grátis",
          otto: OTTO.free,
          them: {
            answer: "1 currículo, downloads em TXT",
            detail:
              "Um currículo e uma carta de apresentação, downloads só em TXT, e compartilhamento e análises limitados.",
          },
        },
        {
          label: "Planos pagos",
          otto: OTTO.paid,
          them: {
            answer: "Planos semanais ou anuais",
            detail:
              "Com preço por país, e currículos, cartas de apresentação e downloads em PDF ilimitados. Os cards dos planos dizem pagamento único; as perguntas frequentes dizem que um teste de 7 dias vira uma assinatura mensal, a menos que você cancele.",
          },
        },
        {
          label: "Downloads",
          otto: OTTO.downloads,
          them: {
            answer: "Só TXT no plano grátis",
            detail:
              "Os downloads em PDF vêm com um plano pago, e os modelos dele são baixados em Word ou PDF.",
          },
        },
      ],
      differences: [
        {
          ...FREE_PDFS,
          text: `${FREE_PDFS.text} O plano grátis do Resume.io baixa só em TXT.`,
        },
        {
          title: "Cobrança mensal",
          text: "O Otto Pro é cobrado por mês ou por ano, e você cancela pela sua conta. O Resume.io vende um plano de uma semana ou de um ano.",
        },
      ],
      extras: [NO_SCORE, EMPLOYER_JOBS],
      sources: [
        { label: "Página de preços do Resume.io" },
        { label: "Página inicial do Resume.io" },
      ],
    },
    enhancv: {
      rows: [
        {
          label: "O que é",
          otto: OTTO.what,
          them: {
            answer: "Um criador de currículo com IA",
            detail:
              "Com sugestões de conteúdo, uma verificação de ATS e feedback do currículo, personalização com pontuação de compatibilidade, tradução, um gerador de carta de apresentação, ajuda com entrevistas, um portal de vagas e um controle de vagas.",
          },
        },
        {
          label: "Pontuação",
          otto: OTTO.score,
          them: {
            answer: "Uma pontuação de ATS",
            detail:
              "O feedback do currículo dá uma pontuação de ATS, e a personalização mostra uma pontuação de compatibilidade com uma vaga.",
          },
        },
        {
          label: "Plano grátis",
          otto: OTTO.free,
          them: {
            answer: "Grátis por 7 dias",
            detail:
              "Todos os modelos e ferramentas de design, seções básicas, até 12 itens de seção e a marca do Enhancv.",
          },
        },
        {
          label: "Planos pagos",
          otto: OTTO.paid,
          them: {
            answer: "Pro, com preço por país",
            detail:
              "Cobrado por mês, a cada 3 meses ou a cada 6 meses. Adiciona até 300 currículos e cartas de apresentação, sugestões de conteúdo, a verificação de ATS, seções Pro e nada de marca.",
          },
        },
        {
          label: "Downloads",
          otto: OTTO.downloads,
          them: {
            answer: "PDF, não Word",
            detail: "As perguntas frequentes dele dizem que os currículos são baixados em PDF.",
          },
        },
      ],
      differences: [
        {
          title: "Um plano grátis sem data de fim",
          text: "O plano Free do Otto não tem limite de tempo. O plano Free do Enhancv vale por 7 dias.",
        },
        NO_SCORE,
      ],
      extras: [FREE_PDFS, EMPLOYER_JOBS],
      sources: [{ label: "Página de preços do Enhancv" }, { label: "Página inicial do Enhancv" }],
    },
    novoresume: {
      rows: [
        {
          label: "O que é",
          otto: OTTO.what,
          them: {
            answer: "Criador de currículo e carta",
            detail:
              "Com modelos com design, um verificador de ATS que pontua seu arquivo, ferramentas de escrita com IA e um criador de carta de apresentação no Pro.",
          },
        },
        {
          label: "Plano grátis",
          otto: OTTO.free,
          them: {
            answer: "1 currículo, 1 página",
            detail:
              "8 modelos, 30 temas de cor, 2 créditos de IA por mês e o verificador de ATS. Não expira, e o PDF leva a marca do Novoresume.",
          },
        },
        {
          label: "Planos pagos",
          otto: OTTO.paid,
          them: {
            answer: "Pro, com preço por país",
            detail:
              "Mensal, trimestral ou anual até você cancelar, ou um Pass de um mês cobrado uma vez. O Pro adiciona até 144 documentos de 25 páginas, todos os modelos, o criador de carta de apresentação e 40 créditos de IA por mês.",
          },
        },
        {
          label: "Downloads",
          otto: OTTO.downloads,
          them: {
            answer: "PDF com marca no Free",
            detail:
              "O Pro remove a marca. Um download que pede upgrade funciona depois que os recursos do Pro são trocados por recursos grátis.",
          },
        },
      ],
      differences: [
        {
          title: "PDFs grátis sem marca",
          text: "O Otto não coloca marca nos PDFs que você baixa de graça. Os PDFs grátis do Novoresume levam a marca dele.",
        },
        NO_SCORE,
      ],
      extras: [FREE_PDFS, EMPLOYER_JOBS],
      sources: [
        { label: "Página de preços do Novoresume" },
        { label: "Página inicial do Novoresume" },
      ],
    },
    zety: {
      rows: [
        {
          label: "O que é",
          otto: OTTO.what,
          them: { answer: "Um criador de currículo online" },
        },
        {
          label: "Plano grátis",
          otto: OTTO.free,
          them: { answer: "Uma versão grátis", detail: "Downloads só em TXT." },
        },
        {
          label: "Planos pagos",
          otto: OTTO.paid,
          them: {
            answer: `${v.usd(1.95)} por 14 dias`,
            detail: `O teste se renova por ${v.usd(25.95)} a cada 4 semanas. Ou pague ${v.usd(71.4)} adiantado por um ano (${v.usd(5.95)} por mês). Garantia de reembolso de 14 dias.`,
          },
        },
        {
          label: "Downloads",
          otto: OTTO.downloads,
          them: {
            answer: "Só TXT na versão grátis",
            detail: "Downloads em PDF e Word exigem um plano pago.",
          },
        },
      ],
      differences: [
        { ...FREE_PDFS, text: `${FREE_PDFS.text} A versão grátis do Zety baixa só em TXT.` },
        {
          title: "Um preço menor mês a mês",
          text: `O Otto Pro custa ${v.proMonthly} por mês, cobrado mensalmente. O teste de ${v.usd(1.95)} do Zety se renova por ${v.usd(25.95)} a cada 4 semanas.`,
        },
      ],
      extras: [NO_SCORE, EMPLOYER_JOBS],
      sources: [{ label: "Página de preços do Zety" }],
    },
    teal: {
      rows: [
        {
          label: "O que é",
          otto: OTTO.what,
          them: {
            answer: "Um app de currículo",
            detail: "Com um plano grátis e um plano pago, o Teal+.",
          },
        },
        {
          label: "Plano grátis",
          otto: OTTO.free,
          them: { answer: "Sim, um plano grátis" },
        },
        {
          label: "Planos pagos",
          otto: OTTO.paid,
          them: {
            answer: `Teal+: ${v.usd(13)} por semana`,
            detail: `Ou ${v.usd(29)} a cada 30 dias, ou ${v.usd(79)} a cada 90 dias.`,
          },
        },
      ],
      differences: [
        {
          title: "Um preço mensal menor",
          text: `O Otto Pro custa ${v.proMonthly} por mês. O Teal+ custa ${v.usd(29)} a cada 30 dias.`,
        },
      ],
      extras: [FREE_PDFS, NO_SCORE, EMPLOYER_JOBS],
      sources: [
        { label: "Central de ajuda do Teal, “Teal vs Teal+”" },
        { label: "Blog do Teal, “Best resume apps”" },
      ],
    },
    canva: {
      rows: [
        {
          label: "O que é",
          otto: OTTO.what,
          them: {
            answer: "Uma ferramenta de design geral",
            detail:
              "Currículos são uma das coisas que você pode fazer com ele; não foi feito só para isso.",
          },
        },
        {
          label: "Plano grátis",
          otto: OTTO.free,
          them: {
            answer: "Grátis, com modelos",
            detail: "O plano grátis dele inclui modelos grátis.",
          },
        },
        {
          label: "Planos pagos",
          otto: OTTO.paid,
          them: {
            answer: "Canva Pro, por país",
            detail: "Os preços variam por país, então confira o seu na página de preços do Canva.",
          },
        },
      ],
      differences: [
        {
          title: "Feito para quem busca emprego",
          text: "O Otto foi feito só para currículos e candidaturas a vagas: ele mostra o texto que o software de recrutamento lê do seu arquivo e aponta cada problema. O Canva é uma ferramenta de design geral.",
        },
      ],
      extras: [READ_BACK, FREE_PDFS, EMPLOYER_JOBS],
      sources: [{ label: "Página de preços do Canva Pro" }],
    },
  };
}
