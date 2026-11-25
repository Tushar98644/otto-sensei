import type { Messages } from "..";
import type { Translation } from "../../types";

// Privacy policy, terms, refund policy and acceptable use, in Brazilian Portuguese; English governs.
export default {
  page: {
    contents: "Sumário",
    lastUpdated: "Última atualização:",
    shortVersion: "Em resumo",
    englishGoverns:
      "Esta página é uma tradução. Se ela divergir da <link>versão em inglês</link>, vale a versão em inglês.",
  },
  disclosure:
    "Nosso processo de pedidos é conduzido pela nossa revendedora online {merchant}, que é a revendedora oficial (merchant of record) de todos os nossos pedidos. A {merchant} cuida do pagamento, dos recibos, do imposto sobre vendas ou IVA, dos reembolsos e do suporte de cobrança.",
  privacy: {
    meta: {
      title: "Política de privacidade: onde seu currículo fica guardado",
      description:
        "O que o {brand} coleta, onde seu currículo fica guardado e quem mais o processa, em linguagem simples. Sem anúncios, sem cookies de rastreamento, sem venda dos seus dados.",
    },
    title: "Política de privacidade",
    intro:
      "O {brand} ajuda você a revisar e melhorar seu currículo. Esta página explica o que coletamos, por quê e quem mais vê esses dados.",
    summary: {
      noSelling:
        "Não vendemos seus dados nem os compartilhamos para publicidade, e não usamos anúncios nem cookies de rastreamento.",
      browser:
        "Seus currículos ficam salvos no seu navegador. Se você entrar na sua conta, também guardamos um backup para você abri-los em outros dispositivos.",
      ai: "Cada recurso de IA envia só o texto de que precisa, quando você o usa. Instruímos o OpenRouter a usar apenas provedores que não treinam modelos com esse texto.",
      payments:
        "Os pagamentos passam pela {merchant}. Nunca vemos o número completo do seu cartão.",
      deleting:
        "Excluir sua conta remove os dados dela na hora. Se você já teve um teste ou pagou, só uma impressão digital irreversível do seu e-mail permanece, para que cada pessoa receba o teste do Pro uma única vez.",
    },
    collect: {
      title: "O que coletamos",
      items: {
        email:
          "<b>Seu endereço de e-mail,</b> se você entrar, seja com o Google, seja com um código que enviamos por e-mail. Usamos esse endereço para fazer seu login e enviar avisos importantes sobre sua conta ou sua cobrança. Não há senhas. Se você usar o Google, ele também compartilha seu nome e sua foto de perfil com o nosso provedor de login; nós não os usamos.",
        resumes:
          "<b>Seus currículos.</b> Eles ficam salvos no armazenamento local do seu navegador, no seu dispositivo. Se você entrar, também guardamos uma cópia de backup no nosso banco de dados para você abri-los em outros dispositivos.",
        shareLinks:
          "<b>Links de compartilhamento.</b> Se você compartilha um currículo, guardamos uma cópia dessa versão (sem linhas ocultas nem notas de personalização) para que qualquer pessoa com o link possa lê-la e baixá-la em PDF. Seu e-mail e seu telefone só aparecem se você ativar essa opção, e os mecanismos de busca são instruídos a ignorar a página, a menos que você permita. Contamos visualizações: para contar cada leitor uma única vez, guardamos por cerca de dois dias um código embaralhado gerado a partir do endereço de rede e do navegador dele (não o endereço em si). Desativar o link exclui a cópia.",
        applications:
          "<b>Candidaturas que você registra.</b> Se você acompanha candidaturas, armazenamos o que você informa (empresa, cargo, link da vaga, data, status e anotações) e qual currículo você enviou, para que você veja sua própria taxa de entrevistas. Se você criar um kit de preparação para entrevista para uma delas, nós o salvamos com essa candidatura. Ninguém mais vê isso.",
        jobEmails:
          "<b>E-mails de vagas que você encaminha para o Otto.</b> Se você ativa o acompanhamento por e-mail, escolhe um nome para um endereço privado, e os e-mails que o seu filtro do Gmail encaminha para ele passam pela Cloudflare, que entrega cada um para nós como texto, com o resultado das verificações de assinatura. Nós o lemos com regras fixas, não com IA, e guardamos só o domínio do remetente, o assunto, o tipo de atualização, a empresa, o cargo, o link da vaga e a data da entrevista que lemos nele, e o que mudamos no seu quadro ou pedimos para você conferir. Também guardamos seus nomes de endereço e o endereço do Gmail que você confirma que encaminha para ele. O resto do e-mail, os anexos e os cabeçalhos são descartados assim que ele é lido; nem a Cloudflare nem nós guardamos uma cópia. Esses registros são excluídos depois de seis meses ou quando você exclui sua conta, e aparecem no download dos seus dados. Um nome de endereço que você troca ou desativa fica bloqueado para outras pessoas por 90 dias.",
        letters:
          "<b>Cartas e mensagens que você guarda.</b> Quando você escreve uma carta de apresentação, uma resposta de candidatura ou uma mensagem de contato estando logado, nós a armazenamos com a empresa, o cargo e o link da vaga a que ela se refere e o título do currículo de onde ela veio, para você encontrá-la de novo em Cartas e mensagens. As edições que você faz numa mensagem de contato são salvas enquanto você digita. O Otto não pesquisa ninguém, mas o que você digita numa mensagem, como o nome da pessoa para quem está escrevendo, é salvo com ela. Excluir uma delas a exclui. Ninguém mais as vê.",
        reminders:
          "<b>Lembretes.</b> Quando você marca uma vaga como candidatura enviada, armazenamos uma data de retorno (7 dias depois, a menos que você escolha outro número). Quando ela chega, adicionamos um aviso ao sino do seu painel; o Otto não envia lembretes por e-mail. Armazenamos o aviso, se você o leu, a data e suas configurações de lembrete. Avisos lidos são excluídos depois de 90 dias, e os não lidos depois de um ano.",
        matches:
          "<b>Novas vagas compatíveis.</b> Uma vez por semana, o Otto procura novas vagas compatíveis com o seu currículo e adiciona um aviso ao sino dizendo quantas são. Armazenamos quando o último aviso foi enviado e quando procuramos pela última vez; isso usa seu currículo e seu perfil profissional da mesma forma que a aba Vagas, e deixa de fora vagas que você salvou ou às quais se candidatou. O Otto não envia mais o e-mail semanal de vagas nem os e-mails de dicas ou de visualizações. Guardamos as escolhas de e-mail que você fez antes e o registro de quais dicas enviamos a você e quando (nunca o texto do e-mail), mas elas não têm mais efeito. E-mails enviados antes ainda têm um link funcional para cancelar a inscrição com um clique.",
        careerLog:
          "<b>Seu diário de carreira.</b> Se você mantém um, armazenamos o texto que você escreve para cada mês (o que você entregou, números, o que aprendeu ou liderou, ou que nada mudou) e suas configurações de check-in: o dia, seu fuso horário e se ele está ativo ou pausado. Se você usar o microfone, a gravação é transformada em texto e descartada; só o texto é guardado. Com o check-in ativo, o Otto adiciona um aviso ao sino e ao Início no seu dia e envia um e-mail por mês, que você pode desativar com um clique. É grátis em todos os planos. Você pode editar ou excluir qualquer mês, ele aparece no download dos seus dados e é excluído com a sua conta.",
        week: "<b>Sua semana com o Otto.</b> Para mostrar seu resumo semanal, guardamos os dias em que sua conta abriu o app (só a data, nunca o horário nem a página) e uma cópia do resumo de cada semana, que inclui nomes de empresas e de vagas das suas próprias candidaturas e vagas salvas. Guardamos os dois por cerca de 10 semanas. Os dias só são registrados onde eventos de uso são permitidos: se o seu navegador envia Do Not Track ou Global Privacy Control, não os registramos, e o resumo conta só o que você salvou no Otto. Os dois aparecem no download dos seus dados e são excluídos com a sua conta.",
        workProfile:
          "<b>Seu perfil profissional.</b> Se você o preenche, armazenamos o país onde você mora, seu fuso horário, onde você pode trabalhar sem visto patrocinado, se você quer trabalho em tempo integral ou por contrato, e se só quer vagas remotas. O Otto compara as vagas com ele no seu navegador, e no nosso servidor ao ranquear a aba Vagas. Ninguém mais o vê.",
        writingStyle:
          "<b>Seu estilo de escrita.</b> Se você define um, armazenamos o tom, o tamanho, a ortografia e a despedida que você escolhe e as anotações que você escreve para o Otto. Eles moldam suas cartas de apresentação, respostas de candidatura e mensagens de contato. Ninguém mais os vê.",
        jobs: "<b>Vagas que você compara e salva.</b> Para ranquear vagas abertas para você, seu navegador envia as habilidades, os cargos e os anos de experiência que ele lê do seu currículo, nunca o currículo em si nem seus dados de contato. Usamos esses dados só para essa solicitação e não os armazenamos nem os enviamos para uma IA. Se você salva uma vaga, armazenamos qual e quando. As vagas em si vêm das páginas de carreiras públicas e dos feeds de vagas das empresas, cada uma com link para o anúncio original.",
        files:
          "<b>Arquivos que você envia.</b> Nós os lemos na memória para extrair o texto e fazer as verificações. Não armazenamos os arquivos.",
        usage:
          "<b>Contagens de uso.</b> Para usuários logados, quantos ajustes de linha, versões personalizadas, cartas de apresentação e respostas você usou neste mês (ou durante seu teste), mais qualquer extra que um convite tenha rendido a você, para que os limites do plano funcionem.",
        billing:
          "<b>Plano e status de cobrança.</b> Se você assina ou começa um teste, armazenamos seu plano e os detalhes da assinatura que a {merchant} nos envia, como se ela está ativa, quando seu teste termina e quando ela renova. Nunca vemos o número completo do seu cartão.",
        trial:
          "<b>Registro de teste.</b> Para que cada pessoa receba o teste do Pro uma única vez, guardamos uma impressão digital irreversível (um hash SHA-256) do e-mail de quem já começou um teste ou pagou. Ela não pode ser convertida de volta no seu e-mail, e nós a mantemos depois que você exclui sua conta, apenas para verificar se esse e-mail já teve um teste.",
        feedback:
          "<b>Feedback que você envia.</b> Sua mensagem, se é um problema ou uma ideia, e a página de onde você a enviou. Se você estiver logado, ela fica vinculada à sua conta.",
        invites:
          "<b>Convites.</b> Seu código de convite, qual conta entrou pelo link de quem, e os ids do cookie de dispositivo (abaixo) dos navegadores usados, para que ninguém convide a si mesmo. Quem convida só vê contagens, nunca quem entrou. Depois que você tem um link de convite, o link “Made with Otto Sensei” no rodapé dos seus links de compartilhamento leva o seu código de convite, então quem se cadastra a partir dali conta como convidado seu. O código sozinho não diz quem você é.",
        abuse:
          "<b>Contadores contra abuso.</b> Para impedir abusos, contamos solicitações por endereço IP, dispositivo e endereço de e-mail em janelas curtas de tempo. Esses contadores são excluídos depois de cerca de dois dias.",
        logs: "<b>Logs técnicos.</b> Nossos servidores registram eventos como erros. Os logs nunca incluem o texto do seu currículo, e os endereços de e-mail neles são mascarados.",
        events:
          "<b>Eventos de uso.</b> Quais páginas as pessoas abrem e quais passos elas dão, como enviar um currículo, baixar um PDF ou fazer upgrade, com contagens simples, como quantas verificações falharam. Para uma página, isso é o tipo de página (nunca o endereço de um link de compartilhamento ou de um portfólio), o nome do site que trouxe você, as tags de campanha do link, se você está num celular, tablet ou computador, quanto tempo ficou nela e, em algumas visitas, a velocidade com que a página carregou. Eles nunca incluem o texto do seu currículo, vagas, seu nome ou endereço de e-mail. Se você estiver logado, eles ficam vinculados ao id aleatório da sua conta. Se o seu navegador envia Do Not Track ou Global Privacy Control, não enviamos nenhum.",
      },
    },
    ai: {
      title: "Como o Otto usa IA",
      intro:
        "O Otto usa modelos de IA (por padrão, o GLM da Z.ai) por meio do OpenRouter. Cada recurso envia só o texto de que precisa, e só quando você o usa:",
      items: {
        importing: "<b>Importar um currículo:</b> o texto do arquivo, para organizá-lo em seções.",
        fixing:
          "<b>Ajustar uma linha:</b> a linha, o cargo e a empresa dela, e suas respostas às perguntas do Otto.",
        summary:
          "<b>Escrever seu resumo profissional:</b> seu currículo sem os dados de contato, ou só o resumo que você pediu para o Otto enxugar.",
        tailoring:
          "<b>Personalização, cartas de apresentação, mensagens de contato e respostas de candidatura:</b> seu currículo, a vaga, no caso de uma resposta, a pergunta, e seu estilo de escrita, se você definiu um (com quaisquer dados de contato nas suas anotações substituídos por marcadores).",
        prep: "<b>Preparação para entrevistas:</b> seu currículo e a vaga.",
        build:
          "<b>“Criar com o Otto”:</b> a vaga que você quer e o que você escreveu sobre cada emprego, nunca o seu nome.",
        github:
          "<b>Importar do GitHub:</b> a descrição, o README e o texto dos pull requests dos repositórios e pull requests que você escolher.",
      },
      notes: {
        placeholders:
          "Antes que qualquer coisa disso vá para a IA, o Otto substitui seu nome, e-mail, telefone e links por marcadores e depois os coloca de volta. Ele os identifica pelos padrões habituais, então um formato incomum pode escapar. O OpenRouter repassa o texto ao provedor do modelo e devolve o resultado. Instruímos o OpenRouter a usar apenas provedores que não treinam com esses dados. Os provedores podem guardá-los por tempo limitado, de acordo com as próprias políticas, por exemplo para detectar abusos.",
        safety:
          "<b>Verificações de segurança:</b> o texto que o Otto escreve, e o texto das páginas que você publica (seu portfólio e links de currículo compartilhados), é verificado por um modelo de segurança via OpenRouter, com a coleta de dados desativada, para bloquear conteúdo sexual ou explícito.",
        noAi: "As verificações do recrutador, o editor e os downloads em PDF não usam IA. As verificações de linhas e os PDFs são feitos direto no seu navegador.",
        inBrowser:
          "Uma exportação de dados do LinkedIn ou um arquivo JSON Resume que você importa é lido no seu navegador e nunca enviado. A verificação de elegibilidade das vagas também roda no seu navegador, sem IA.",
        voice:
          "<b>Digitação por voz:</b> quando você aperta um botão de microfone, seu navegador só escuta enquanto ele está ligado. No Chrome, no Edge e no Safari, o próprio serviço de fala do navegador (Google no Chrome, Microsoft no Edge, Apple no Safari) transforma sua fala em texto, sob a política de privacidade dessa empresa. Em outros navegadores, ou quando esse serviço não está disponível, o navegador grava um trecho que vai para o nosso provedor de conversão de fala em texto via OpenRouter, com a coleta de dados desativada. Nunca armazenamos o áudio, só o texto que você mantém.",
        github:
          "“Importar do GitHub” lê só dados públicos do GitHub (seus repositórios e pull requests mesclados) pelo nome de usuário que você digita, sem o seu login do GitHub. Nada é adicionado ao seu currículo até você confirmar. Não armazenamos os dados do GitHub: um servidor os mantém na memória por até uma hora, para que uma segunda consulta não precise perguntar ao GitHub de novo.",
      },
    },
    chrome: {
      title: "Otto para Chrome",
      intro:
        "A extensão do Chrome mostra a compatibilidade do seu currículo com uma vaga na própria página onde você a lê. Ela funciona assim:",
      items: {
        reads:
          "<b>O que ela lê:</b> o título, a empresa, o local e o texto de uma vaga. Ela só roda em vagas no LinkedIn, Naukri, Indeed, Greenhouse, Lever, Ashby, Workday, SmartRecruiters e Workable, e em qualquer outra página só quando você aperta o botão dela na barra de ferramentas. Ela não lê outras páginas nem seu histórico de navegação, e nunca envia uma candidatura por você.",
        fill: "<b>Preencher com o Otto (Pro):</b> quando você aperta esse botão num formulário de candidatura do Greenhouse, Lever, Ashby ou Workday, a extensão busca na sua conta seu nome, e-mail, telefone, localização, links, histórico profissional, formação e respostas salvas, coloca tudo nesse formulário e anexa o PDF do seu currículo; ela não guarda esses dados. Ela nunca responde a perguntas de autoidentificação ou de consentimento e nunca envia o formulário. O Redigir com o Otto envia para nós essa pergunta e a vaga. Depois que você envia um formulário que ela preencheu, ela adiciona a candidatura ao seu quadro com o link, o cargo e a empresa da vaga.",
        device:
          "<b>A compatibilidade é calculada no seu dispositivo.</b> A extensão guarda uma cópia do que a verificação precisa no armazenamento do Chrome para extensões: o texto dos seus currículos sem nome, e-mail, telefone e links, seu perfil profissional, onde você está procurando trabalho e quais vagas você salvou. Ela atualiza essa cópia a cada poucas horas. Verificar uma vaga não envia nada para nós.",
        save: "<b>Salvar:</b> quando você aperta Salvar, a extensão nos envia o link, o cargo, a empresa, o local e o texto dessa vaga. Guardamos esses dados com a sua conta, para que a vaga espere no seu quadro e o Otto ainda consiga ler o anúncio se ele sair do ar.",
        tailor:
          "<b>Personalizar e Carta</b> abrem o {brand} numa nova aba com essa vaga salva e funcionam como os recursos de IA acima.",
        connecting:
          "<b>Conexão:</b> a extensão guarda uma chave aleatória da sua conta. Nós guardamos só uma impressão digital irreversível dela, com a data em que ela foi criada e a do último uso. Ela para de funcionar depois de 90 dias sem uso, quando você aperta Desconectar na página da sua conta ou na extensão, ou quando você exclui sua conta.",
      },
      outro: "A extensão não mostra anúncios e não envia eventos de uso.",
    },
    payments: {
      title: "Pagamentos",
      checkout:
        "{disclosure} O checkout acontece no site da {merchant}, não no nosso. Lá, a {merchant} coleta seus dados de pagamento e seu endereço de cobrança (também no teste, para que o plano possa começar quando ele terminar), sob a própria <link>política de privacidade</link>.",
      items: {
        send: "<b>O que enviamos para a {merchant}:</b> quando você inicia um checkout, o e-mail da sua conta, nosso id aleatório da sua conta e o plano que você escolheu, para que o pagamento fique vinculado à sua conta. Quando você inicia um checkout ou exclui sua conta, também consultamos esse e-mail na {merchant}, para que você nunca seja cobrado por uma segunda assinatura e todas sejam canceladas.",
        receive:
          "<b>O que a {merchant} nos envia:</b> o plano e o status da sua assinatura, o período de cobrança, quando ela renova ou quando seu teste termina, um cancelamento pendente e os ids que a {merchant} usa para você, para sua assinatura e para seus pagamentos. Os avisos dela também trazem o nome, o e-mail e o endereço de cobrança do pedido, a bandeira do cartão e os últimos quatro dígitos. Usamos esse e-mail apenas para vincular um pagamento à sua conta, e não armazenamos nenhum desses dados. A {merchant} nunca nos envia o número completo do seu cartão.",
      },
    },
    cookies: {
      title: "Cookies e armazenamento local",
      intro: "Usamos só o que o app precisa para funcionar:",
      items: {
        signIn:
          "<b>Cookies de login</b> mantêm você conectado. Eles se renovam enquanto você usa o app e são removidos quando você sai.",
        device:
          "<b>Um cookie de dispositivo</b> guarda um id aleatório que limita envios e verificações grátis por dispositivo. Ele não está vinculado ao seu nome nem ao seu e-mail, e dura um ano.",
        invite:
          "<b>Um cookie de convite</b> guarda o código de convite de um amigo por 30 dias depois que você abre o link dele, para que o convite ainda conte se você se cadastrar mais tarde. Ele é removido assim que o convite é resolvido.",
        language:
          "<b>Um cookie de idioma</b> lembra qual idioma você escolheu para o app. Ele guarda só essa escolha e dura um ano.",
        localStorage:
          "<b>O armazenamento local</b> (não é um cookie) guarda seus currículos, seu progresso e quais tours você já viu, no seu dispositivo, até você excluí-los ou limpar os dados do navegador.",
        checkout:
          "<b>O checkout da {merchant}</b> roda no site dela, que pode definir os próprios cookies lá para processar o pagamento e evitar fraudes, sob a <link>política de privacidade</link> da {merchant}. Nosso site não define cookies de pagamento.",
      },
      outro:
        "Não usamos anúncios nem cookies de rastreamento. Para os eventos de uso acima, um id aleatório é guardado no armazenamento local para que seus passos possam ser contados juntos, entre visitas. Ele não está vinculado ao seu nome nem ao seu e-mail, e limpar os dados do navegador o remove.",
    },
    sharing: {
      title: "Com quem compartilhamos dados",
      intro:
        "Não vendemos seus dados nem os compartilhamos para publicidade. Só usamos estes provedores para operar o {brand}:",
      items: {
        openRouter:
          "<b>OpenRouter</b> e o provedor de modelo de IA para o qual ele encaminha processam o texto do currículo para os recursos de IA acima.",
        merchant:
          "<b>{merchant}</b> processa os pagamentos como nossa revendedora oficial (merchant of record) e revendedora online.",
        supabase:
          "<b>Supabase</b> hospeda nosso banco de dados e cuida do login, incluindo suas sessões.",
        resend:
          "<b>Resend</b> entrega nossos códigos de login e avisos sobre sua conta, como o fim de um teste.",
        google: "<b>Google</b>, só se você escolher entrar com sua conta do Google.",
        github:
          "<b>GitHub</b> recebe o nome de usuário que você pesquisa, só se você usar Importar do GitHub.",
        vercel: "<b>Vercel</b> hospeda o app em si.",
        cloudflare:
          "<b>Cloudflare</b> recebe os e-mails de vagas que você encaminha para o seu endereço do Otto e os repassa para nós, só se você ativar o acompanhamento por e-mail.",
        sentry:
          "<b>Sentry</b> recebe relatórios de erro quando algo quebra, com e-mails, números de telefone e texto de currículo removidos antes.",
        posthog:
          "<b>PostHog</b> recebe os eventos de uso acima, para vermos quais passos ajudam e onde as pessoas travam.",
      },
      outro:
        "Esses provedores podem processar dados fora do seu país, inclusive nos Estados Unidos. Também podemos compartilhar informações se a lei exigir.",
    },
    retention: {
      title: "Por quanto tempo guardamos os dados",
      items: {
        account:
          "Dados da conta, backups de currículos, candidaturas registradas, preparação para entrevistas, seu perfil profissional e seu estilo de escrita: até você excluí-los ou excluir sua conta.",
        shareLinks: "Links de compartilhamento: até você desativar o link ou excluir sua conta.",
        savedJobs: "Vagas salvas: até você removê-las, ou 30 dias depois que a vaga for encerrada.",
        chromeJobs: "Vagas salvas pelo Otto para Chrome: até você removê-las ou excluir sua conta.",
        chromeKey:
          "A chave da extensão do Chrome: até você desconectá-la, ou 90 dias depois do último uso.",
        reminders: "Avisos de lembrete: 90 dias depois de lidos, um ano se nunca forem lidos.",
        recaps:
          "Os dias em que você abriu o app e seus resumos semanais: cerca de 10 semanas, ou até você excluir sua conta.",
        codes: "Códigos de login: funcionam uma vez e expiram depois de 10 minutos.",
        feedback:
          "Feedback e registros de convite: até sua conta ser excluída. Feedback enviado sem login não fica vinculado a nenhuma conta.",
        abuse: "Contadores contra abuso: cerca de dois dias.",
        uploads: "Arquivos enviados: não são guardados de forma alguma.",
        emailChoices:
          "Suas escolhas de e-mail e o registro de quais dicas enviamos: até você excluir sua conta.",
        trialEnd:
          "Uma cópia da data de fim do seu teste: 30 dias depois do fim do teste, ou até você desativar as dicas.",
        letters:
          "Cartas, respostas e mensagens de contato que você guarda: até você excluí-las ou excluir sua conta.",
      },
    },
    choices: {
      title: "Suas escolhas",
      items: {
        resumes:
          "Exclua qualquer currículo no estúdio quando quiser. O backup dele é apagado na hora; a cópia neste navegador fica em Excluídos recentemente por 30 dias, ou até você sair da conta ou esvaziar essa lista.",
        account:
          "Exclua sua conta na <link>página da sua conta</link>. Isso remove na hora seu e-mail, registro de login, backups de currículos, candidaturas registradas e as preparações delas, perfil profissional, estilo de escrita, cartas e mensagens, vagas salvas, a conexão da extensão do Chrome, links de compartilhamento, lembretes e escolhas de e-mail, registros de convite, feedback e registros de uso, e desconecta você em todos os dispositivos. Excluir sua conta cancela na hora seu plano pago ou seu teste, e você não será cobrado de novo. Só a impressão digital do teste mencionada acima permanece.",
        data: "Peça uma cópia dos seus dados, ou que eles sejam corrigidos ou excluídos, enviando um e-mail para <link>{email}</link>. Você também pode fazer uma reclamação à autoridade local de proteção de dados.",
      },
    },
    children: {
      title: "Menores de idade",
      body: "O {brand} não é destinado a menores de 16 anos, e não coletamos intencionalmente dados deles.",
    },
    changes: {
      title: "Mudanças nesta política",
      body: "Se mudarmos esta política, atualizaremos a data no topo. Se uma mudança afetar a forma como usamos seus dados, enviaremos um e-mail aos usuários cadastrados antes que ela entre em vigor.",
    },
    contact: {
      title: "Contato",
      body: "Dúvidas sobre privacidade? Envie um e-mail para <link>{email}</link>.",
    },
  },
  terms: {
    meta: {
      title: "Termos de serviço: planos, limites e cancelamento",
      description:
        "As regras para usar o {brand}, em linguagem simples: seu conteúdo continua sendo seu, o que cada plano inclui e quanto custa, os limites mensais e como cancelar.",
    },
    title: "Termos de serviço",
    intro:
      "Estes termos são o acordo entre você e o {brand} quando você usa este site. Ao usá-lo, você concorda com eles. Nós os mantivemos curtos e simples de propósito.",
    summary: {
      yours: "Seus currículos e tudo o que você escreve ou envia continuam sendo seus.",
      guidance:
        "As verificações e sugestões do Otto são orientações, não uma garantia de entrevista ou de emprego.",
      price:
        "O Pro custa {month} por mês ou {year} por ano. Contas novas podem testá-lo por {days} dias pagando {trialPrice}, uma vez por pessoa.",
      cancel:
        "Cancele quando quiser na página da sua conta, e você continua com seu plano até o fim do período que pagou.",
      kept: "Se um plano pago terminar, nada do que você criou é excluído.",
    },
    who: {
      title: "Quem somos",
      body: "O {brand} é o negócio que opera este site e vende os planos dele, e a parte com quem estes termos são firmados. Você pode falar conosco em <link>{email}</link>.",
    },
    service: {
      title: "O serviço",
      asIs: "O {brand} permite que você revise, edite e personalize seu currículo e o baixe em PDF. Nós o oferecemos no estado em que se encontra. Trabalhamos muito para mantê-lo preciso e no ar, mas não podemos prometer que ele estará sempre livre de erros ou disponível.",
      guidance:
        "As verificações e sugestões do Otto são orientações, não uma garantia. O software de recrutamento varia de um empregador para outro, e nenhuma ferramenta pode prometer uma entrevista ou um emprego. Você decide o que vai no seu currículo, então leia cada sugestão antes de mantê-la.",
    },
    account: {
      title: "Sua conta",
      body: "Você entra com um código enviado para o seu e-mail. Mantenha sua conta de e-mail segura, já que qualquer pessoa que consiga lê-la pode entrar como você. Você precisa ter pelo menos 16 anos para usar o {brand}.",
    },
    content: {
      title: "Seu conteúdo é seu",
      yours:
        "Seus currículos e tudo o que você escreve ou envia continuam sendo seus. Você nos dá permissão para armazená-los e processá-los apenas para operar o serviço para você, por exemplo para verificar um arquivo, fazer backup dos seus currículos ou enviar texto ao nosso provedor de IA quando você pede ajuda ao Otto. Nossa <link>política de privacidade</link> explica como.",
      rights: "Envie apenas conteúdo que você tem o direito de usar.",
    },
    misuse: {
      title: "Não faça mau uso",
      items: {
        limits:
          "Não tente quebrar, sobrecarregar ou burlar o serviço ou os limites dele, por exemplo com scripts, bots ou várias contas.",
        copy: "Não copie, revenda nem faça scraping do serviço.",
        harmful: "Não envie nada ilegal, nocivo ou dados privados de outra pessoa.",
        pretend: "Não use o serviço para se passar por outra pessoa.",
      },
      outro: "Podemos suspender ou encerrar contas que violem estas regras.",
    },
    ai: {
      title: "As ferramentas de escrita com IA",
      intro:
        "As ferramentas de IA (ajustes de linha, personalização, resumos, cartas de apresentação, mensagens de contato, respostas a perguntas de candidatura, preparação para entrevistas e Criar com o Otto) servem apenas para textos de busca de emprego.",
      items: {
        explicit:
          "Não as use para criar conteúdo sexual, sexualmente explícito ou qualquer outro conteúdo NSFW (impróprio para o trabalho), de nenhum tipo.",
        hateful:
          "Não as use para criar conteúdo de ódio, de assédio, violento, ilegal ou enganoso.",
      },
      outro:
        "A IA está configurada para recusar esses pedidos e deixar esse tipo de material de fora. Verificações automáticas de segurança também bloqueiam conteúdo sexual ou explícito no que o Otto escreve e nas páginas que você publica. Podemos remover conteúdo que viole esta regra e suspender ou encerrar a conta que o pediu. Nossa <link>política de uso aceitável</link> tem a lista completa.",
    },
    plans: {
      title: "Planos e limites",
      includes: {
        title: "O que cada plano inclui",
        free: "<b>Free:</b> o leitor básico para arquivos enviados, a visão do recrutador, edição à mão, {fixes} ajustes de linha por mês com o Otto (a ajuda com o resumo profissional conta como um), {resumes}, os formatos Classic e Compact, downloads em PDF, as {matches} vagas mais compatíveis e {applications} com o respectivo lembrete.",
        paid: "<b>Pro e Max</b> adicionam mais ajustes de linha e o resto da ajuda de IA do Otto (personalização, cartas, respostas, preparação para entrevistas, Criar com o Otto, rascunhos do GitHub e leitura de arquivos enviados por IA), os outros formatos, downloads em Word, todas as vagas compatíveis com filtros e vagas salvas, links de compartilhamento, a verificação de direito de trabalho e portfólios. O {pro} e o teste guardam até {proResumes} currículos e acompanham até {proApplications} candidaturas; o {max} guarda até {maxResumes} e acompanha até {maxApplications}. Versões personalizadas contam como currículos.",
        ends: "<b>Se um plano pago terminar,</b> nada do que você criou é excluído. Você ainda pode abrir, editar e baixar tudo, e os links que você compartilhou continuam no ar, mas não pode adicionar mais até fazer upgrade de novo. Mudar para um plano menor funciona do mesmo jeito: currículos e candidaturas acima dos limites dele continuam lá, e você pode adicionar mais quando estiver abaixo deles.",
      },
      resumes: { one: "{count} currículo", other: "{count} currículos" },
      trackedApplications: {
        one: "{count} candidatura acompanhada",
        other: "{count} candidaturas acompanhadas",
      },
      resets: {
        title: "Quando os limites são renovados",
        intro:
          "Cada plano tem um limite para cada coisa que o Otto faz com IA, mostrado na tabela abaixo.",
        items: {
          free: "<b>Free:</b> os ajustes de linha são renovados no início de cada mês do calendário (UTC).",
          monthly:
            "<b>Planos mensais:</b> os limites valem de uma renovação até a seguinte e são renovados quando seu plano renova.",
          yearly:
            "<b>Planos anuais:</b> os mesmos limites por mês, renovados no dia do mês em que o plano começou. Num mês mais curto, eles são renovados no último dia: um plano iniciado no dia 31 é renovado no dia 30 de um mês de 30 dias.",
          trial: "<b>O teste do Pro:</b> limites próprios, menores, para o teste inteiro.",
          unused: "Limites não usados não são acumulados.",
          invites:
            "<b>Extras de convite</b> são somados ao mês atual ou ao teste. No Free, os ajustes de linha extras contam naquele mês do calendário; as versões personalizadas extras contam quando você começa um teste ou faz upgrade naquele mês, e os extras que você não usou vão junto com você quando fizer isso.",
        },
        next: "A página da sua conta mostra a data da próxima renovação dos seus limites.",
      },
      table: {
        eachMonth: "Por mês",
        trial: "Teste do Pro, no total",
        none: "Nenhum",
        features: {
          tailor: "Versões personalizadas",
          letter:
            "Cartas de apresentação, mensagens de contato, respostas e preparação para entrevistas",
          fix: "Ajustes de linha",
          import: "Leituras por IA de um currículo enviado",
          draft: "Rascunhos do Criar com o Otto",
          github: "Rascunhos de projetos do GitHub",
        },
      },
      atLimit: {
        title: "Ao atingir um limite",
        pauses:
          "Esse recurso fica pausado até seus limites serem renovados (no Free, no início do mês seguinte; num plano mensal, na próxima renovação; num plano anual, no próximo dia de renovação mensal; no teste, até o Pro começar), ou até você mudar para um plano maior. Subir do Pro para o Max entre renovações não renova nenhum limite: o que você usou neste mês conta no novo plano. Os envios de arquivos nunca param: depois das leituras por IA, o leitor básico lê seu arquivo. Edição, verificações do recrutador e downloads em PDF não têm limite em nenhum plano.",
        budget:
          "Cada plano pago também tem um orçamento mensal de IA ({proTokens} tokens no {pro}, {maxTokens} no {max}, {trialTokens} no teste) que cobre o uso completo dos limites acima e só barra uso automatizado ou abusivo.",
        halfMillion: "meio milhão",
      },
      voice: {
        title: "Digitação por voz",
        body: "A digitação por voz é grátis e ilimitada em navegadores com reconhecimento de fala integrado (Chrome, Edge e Safari). Em outros navegadores, como Brave e Firefox, ela usa nosso serviço de fala: até {freeClips} trechos por dia no Free, {proClips} no {pro} e no teste, e {maxClips} no {max}, cada um com até 2 minutos.",
      },
    },
    payments: {
      title: "Pagamentos e cancelamento",
      prices:
        "O Pro custa {proMonth} por mês ou {proYear} por ano. O Max custa {maxMonth} por mês ou {maxYear} por ano. Os preços são em dólares americanos, mais os impostos aplicáveis onde você mora.",
      trial:
        "Contas novas podem ter um teste de {days} dias do Pro por {price}, uma vez por pessoa. Você adiciona um cartão no checkout, e o valor de {price} (mais impostos aplicáveis) é cobrado quando o teste começa. Quando o teste termina, o Pro começa a {proMonth} por mês, a menos que você cancele antes. Durante o teste, um portfólio pode ser criado e pré-visualizado, mas ele só fica público num plano pago.",
      merchant:
        "{disclosure} Os <link>termos para compradores</link> dela também se aplicam à compra.",
      renewal:
        "Um plano pago se renova a cada período escolhido até você cancelar. Cancele quando quiser na <link>página da sua conta</link>, e você continua com ele até o fim do período que pagou. Você pode subir do Pro para o Max no período de cobrança que já tem: sua assinatura muda na hora, então você nunca é cobrado duas vezes, e a diferença pelo resto do período é cobrada na hora. Durante o teste do Pro, você pode começar o Max em vez disso: o teste termina imediatamente, o preço cheio do Max para o período que você escolher (mais impostos aplicáveis) é cobrado na hora no cartão cadastrado, e a cobrança de {price} do teste não é descontada. Para mudar para o Pro, ou entre mensal e anual, cancele e escolha o novo plano quando o período atual terminar. Se você voltar para o Free, seu portfólio publicado sai do ar, e os dados dele ficam guardados caso você volte.",
      credit:
        "Um plano pago {pro} ou {max}, fora do período de teste, pode adicionar crédito pré-pago, de {min} a {maxUsd} por vez, em dólares inteiros, mais impostos aplicáveis. Ele paga a ajuda de IA só quando a cota mensal dessa ajuda, ou o orçamento de IA, acaba, pelos preços mostrados no momento do uso. O crédito é pré-pago e não é reembolsável depois de usado. Ele não expira enquanto sua conta existir, só pode ser usado enquanto você estiver num plano pago e é removido quando sua conta é excluída.",
      failed:
        "Se um pagamento falhar quando seu plano renovar ou seu teste terminar, você continua com o plano por alguns dias enquanto o pagamento é tentado de novo. Se ainda assim falhar, sua conta passa para o Free até você atualizar seu cartão na página da sua conta e o pagamento ser aprovado.",
      changes:
        "Preços e limites podem mudar. Se o preço ou os limites do seu plano mudarem, enviaremos um e-mail antes de a mudança valer para você, para que você possa cancelar antes, se preferir.",
      refunds:
        "Os pedidos de reembolso são tratados pela {merchant} conforme os <link>termos para compradores</link> dela. Nossa <link>página de reembolsos</link> explica como pedir.",
    },
    ending: {
      title: "Encerramento",
      body: "Você pode parar de usar o {brand} e excluir sua conta a qualquer momento. Podemos suspender ou encerrar uma conta que viole estes termos, e diremos o motivo quando pudermos. Também podemos mudar ou descontinuar partes do serviço com o tempo.",
    },
    liability: {
      title: "Limites da nossa responsabilidade",
      body: "Na medida máxima permitida pela lei, o {brand} não é responsável por perdas indiretas, como uma oportunidade de emprego perdida ou perda de renda. Nossa responsabilidade total perante você se limita ao que você nos pagou nos 12 meses anteriores à reclamação. Nada nestes termos limita os direitos que você tem pelas leis de defesa do consumidor do lugar onde você mora.",
    },
    changes: {
      title: "Mudanças nestes termos",
      body: "Podemos atualizar estes termos. Quando fizermos isso, mudaremos a data no topo e, para mudanças importantes, enviaremos um e-mail aos usuários cadastrados antes que elas entrem em vigor. Usar o {brand} depois de uma mudança significa que você aceita os novos termos.",
    },
    contact: {
      title: "Contato",
      body: "Dúvidas sobre estes termos? Envie um e-mail para <link>{email}</link>.",
    },
  },
  refunds: {
    meta: {
      title: "Política de reembolso: cancelamento do Pro e do Max",
      description:
        "Os reembolsos dos planos Pro e Max são tratados pela {merchant}, nossa revendedora oficial (merchant of record), conforme os termos para compradores dela. Cancele quando quiser e você não será cobrado de novo.",
    },
    title: "Política de reembolso",
    intro:
      "A {merchant} é nossa revendedora oficial (merchant of record), e a fatura do seu cartão mostra a cobrança no nome dela, começando com <b>{prefix}</b>. Veja como funcionam os pagamentos, os reembolsos e o cancelamento no Pro e no Max.",
    summary: {
      cancel:
        "Cancele quando quiser na página da sua conta. Você continua com seu plano até o fim do período que já pagou.",
      trial:
        "O teste de {days} dias do Pro custa {price}, cobrado quando ele começa. Cancele antes do fim e você não paga mais nada.",
      ask: "Para pedir um reembolso, entre em contato com a {merchant} pela <link>página de ajuda ao comprador</link> dela, ou <link>envie um e-mail para nós</link> a partir do endereço com que você entra.",
    },
    manageBilling: "Gerenciar cobrança",
    pay: {
      title: "Para quem você paga",
      receipt:
        "Depois de cada pagamento, a {merchant} envia por e-mail um recibo com um link para baixar sua fatura.",
    },
    refunds: {
      title: "Reembolsos",
      body: "Os pedidos de reembolso são tratados pela {merchant} conforme os <link>termos para compradores</link> dela. Para pedir um, entre em contato com a {merchant} pela <link>página de ajuda ao comprador</link> dela, ou envie um e-mail para nós a partir do endereço com que você entra, e encaminharemos seu pedido.",
    },
    cancel: {
      title: "Cancele quando quiser",
      anytime:
        "Cancele na <link>página da sua conta</link> quando quiser. Você continua com seu plano até o fim do período que já pagou, e depois sua conta passa para o plano Free. Seus currículos continuam sendo seus em qualquer caso.",
      trial:
        "O teste de {days} dias do Pro custa {price}, cobrado quando ele começa. Cancele antes do fim do teste e você não paga mais nada; caso contrário, seu primeiro pagamento do Pro é cobrado quando ele termina. Se você começar o Max durante o teste, o preço cheio do Max é cobrado na hora, e a cobrança de {price} do teste não é descontada.",
    },
    deleting: {
      title: "Excluir sua conta",
      body: "Excluir sua conta cancela seu plano pago na hora, e você não será cobrado de novo. Ele termina nesse momento, e não no fim do período que você já pagou.",
    },
    questions: {
      title: "Dúvidas sobre uma cobrança",
      email:
        "Envie um e-mail para <link>{email}</link> a partir do endereço com que você entra. Sobre o pagamento em si, você também pode entrar em contato com a {merchant} pela <link>página de ajuda ao comprador</link> dela.",
      rights:
        "Esta política não afeta nenhum direito que você tenha pelas leis de defesa do consumidor do lugar onde você mora.",
    },
  },
  acceptableUse: {
    meta: {
      title: "Política de uso aceitável das ferramentas de escrita com IA",
      description:
        "Para que o {brand} e as ferramentas de escrita com IA dele podem ser usados: apenas textos profissionais de busca de emprego. Nada de conteúdo explícito, de ódio, ilegal ou enganoso.",
    },
    title: "Política de uso aceitável",
    intro:
      "O {brand} ajuda as pessoas na busca de emprego: revisar e melhorar currículos, personalizá-los para uma vaga, escrever cartas de apresentação e respostas a perguntas de candidatura, se preparar para entrevistas, encontrar vagas e criar uma página de portfólio. Esta política diz para que ele pode e não pode ser usado. Ela faz parte dos nossos <link>termos de serviço</link>.",
    purpose: {
      title: "Para que servem as ferramentas de IA",
      body: "As ferramentas de escrita com IA escrevem e melhoram textos de busca de emprego a partir do seu próprio currículo e das vagas que você fornece. Use-as apenas para isso.",
    },
    forbidden: {
      title: "Não é permitido",
      items: {
        sexual:
          "Conteúdo sexual, sexualmente explícito ou sexualmente sugestivo, ou qualquer outro conteúdo NSFW (impróprio para o trabalho).",
        hateful: "Conteúdo de ódio, de assédio, ameaçador ou violento.",
        illegal: "Conteúdo ilegal, ou conteúdo que ajude alguém a infringir a lei.",
        deceptive:
          "Conteúdo enganoso: credenciais falsas, empregadores ou diplomas inventados, ou se passar por outra pessoa.",
        privateData: "Dados privados de outra pessoa enviados sem a permissão dela.",
        limits:
          "Burlar as proteções ou os limites do serviço, por exemplo com scripts, bots ou várias contas.",
      },
    },
    enforcement: {
      title: "Como aplicamos esta política",
      body: "A IA é instruída a escrever apenas textos profissionais de busca de emprego e a recusar ou deixar de fora qualquer coisa que esta política proíba. Verificações automáticas de segurança também bloqueiam conteúdo sexual ou explícito no que o Otto escreve e em páginas públicas (portfólios e links de currículo compartilhados). Podemos remover conteúdo que viole esta política e suspender ou encerrar a conta que o criou.",
    },
    models: {
      title: "A IA por trás",
      body: "O {brand} é um produto independente. Os recursos de IA dele rodam em modelos de IA de terceiros, acessados por meio do OpenRouter. Não somos afiliados às empresas que criam esses modelos nem endossados por elas. Nossa <link>política de privacidade</link> diz qual texto é enviado e como ele é protegido.",
    },
    report: {
      title: "Denuncie um problema",
      body: "Viu algo que viola esta política? Envie um e-mail para <link>{email}</link>. Respondemos em até 3 dias úteis.",
    },
  },
} satisfies Translation<Messages["legal"]>;
