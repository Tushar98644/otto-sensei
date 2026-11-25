import type { Messages } from "..";
import type { Translation } from "../../types";

// Adding projects from GitHub, in Brazilian Portuguese.
export default {
  offer: {
    links: "Seu currículo tem link para github.com/{username}",
    text: "Escolha seus melhores repositórios públicos e o Otto escreve as linhas do projeto. Você confere antes.",
    button: "Adicionar projetos do meu GitHub",
  },
  connect: {
    title: "Importar do GitHub",
    signInFirst: "Entre primeiro e depois conecte sua conta do GitHub.",
    checkFailed: "Não foi possível verificar sua conta do GitHub agora.",
    signIn: "Entrar",
    tryAgain: "Tentar de novo",
    connectTitle: "Conecte seu GitHub",
    connectDescription:
      "O Otto só adiciona trabalho de uma conta do GitHub que é sua. Entre no GitHub uma vez para conectá-la.",
    connect: "Conectar GitHub",
    reads:
      "O Otto lê seus repositórios públicos e pull requests mesclados. Ele nunca publica nada no GitHub.",
    description:
      "Escolha repositórios públicos e pull requests mesclados, e o Otto escreve linhas de projeto a partir deles.",
    find: "Encontrar meu trabalho",
    cancel: "Cancelar",
    connectedAs: "Conectado como <b>{login}</b>",
    notYou: " · Não é você? ",
    disconnect: "Desconectar",
    signInReason: "Entre para conectar sua conta do GitHub.",
    offline: "Não foi possível falar com o Otto agora. Confira sua conexão.",
    startFailed: "Não foi possível começar a conectar o GitHub. Tente de novo.",
    disconnectFailed: "Não foi possível desconectar o GitHub. Tente de novo.",
    notConnected: "O GitHub não está conectado",
    errors: {
      taken: "Essa conta do GitHub já está conectada a outra conta do Otto Sensei.",
      failed: "O GitHub não conectou. Tente de novo.",
    },
  },
  pick: {
    title: "Escolha o que adicionar",
    description:
      "Trabalho público de {username}. Até {repos} repositórios e {pulls} pull requests.",
    repoCount: { one: "{count} repositório", other: "{count} repositórios" },
    pullCount: { one: "{count} pull request", other: "{count} pull requests" },
    otto: "Escolha seu melhor trabalho. Só vou escrever linhas com o que o GitHub mostra.",
    nothing: "Não encontrei repositórios públicos nem pull requests mesclados de {username}.",
    back: "Voltar",
    draft: { one: "Rascunhar {count} projeto", other: "Rascunhar {count} projetos" },
    draftNone: "Rascunhar projetos",
    tabs: "O que importar",
    repos: "Repositórios",
    pulls: "Pull requests",
    picked: "{repos} de {reposMax} repositórios e {pulls} de {pullsMax} pull requests escolhidos",
    search: "Buscar nos seus repositórios",
    searchPlaceholder: "Busque por nome, linguagem ou tema",
    noRepos:
      "Nenhum repositório público seu no GitHub. Forks ficam de fora, já que começam como trabalho de outra pessoa.",
    noMatch: "Nenhum repositório corresponde a “{query}”.",
    pullsBusy:
      "O GitHub estava ocupado demais para listar pull requests. Volte e procure de novo em um minuto.",
    noPulls: "Nenhum pull request mesclado em repositórios públicos de outras pessoas.",
    onResume: "No seu currículo",
    stars: { one: "{count} estrela", other: "{count} estrelas" },
    archived: "Arquivado",
    merged: "Mesclado em {month}",
  },
  review: {
    title: "Fique com os projetos que quiser",
    description:
      "O Otto escolheu seu melhor trabalho público. Desmarque o que não quiser; nada é adicionado até você confirmar.",
    projects: { one: "{count} projeto", other: "{count} projetos" },
    lines: { one: "{count} linha", other: "{count} linhas" },
    usedAI: "Usei só fatos e números do GitHub. Desmarque o que não quiser.",
    plain: "Estas linhas usam as palavras do GitHub. Deixe-as com a sua cara depois de adicionar.",
    pickOther: "Escolher outros repositórios",
    add: { one: "Adicionar {count} projeto", other: "Adicionar {count} projetos" },
    addNone: "Adicionar projetos",
    already: "Já está no seu currículo",
    noLines: "Ainda sem linhas. Você pode escrevê-las depois de adicionar.",
  },
  added: {
    title: {
      one: "{count} projeto adicionado do GitHub",
      other: "{count} projetos adicionados do GitHub",
    },
    skipped: "Um currículo comporta {max} projetos, então {skipped} não couberam.",
    where: "Eles estão em Projetos. Edite qualquer linha para deixá-la com a sua cara.",
    full: "Este currículo já tem {max} projetos",
    makeRoom: "Remova um para abrir espaço.",
    undo: "Projetos adicionados do GitHub",
  },
} satisfies Translation<Messages["github"]>;
