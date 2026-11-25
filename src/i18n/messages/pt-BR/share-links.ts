import type { Messages } from "..";
import type { Translation } from "../../types";

// Share links and the invite prompt, in Brazilian Portuguese.
export default {
  dialog: {
    title: "Compartilhar este currículo",
    description:
      "“{title}” como uma página web que qualquer pessoa com o link pode ler, com download em PDF. Não precisa de conta para abrir.",
    turnOff: "Desativar link",
    cancel: "Cancelar",
    make: "Criar link",
    checking: "Procurando um link que você já criou",
    checkFailed: "Não foi possível verificar seus links",
    tryAgain: "Tentar de novo",
    checkConnection: "Confira sua conexão e tente de novo.",
    madeCopied: "Link criado e copiado. Cole onde quiser.",
    made: "Link criado. Copie e envie para quem quiser.",
    updated: "Link atualizado para esta versão.",
    link: "Link",
    behindTitle: "Este link mostra uma versão anterior",
    update: "Atualizar link",
    behind: "Você mudou este currículo depois de compartilhar. Atualizar mantém o mesmo link.",
  },
  list: {
    title: "Links compartilhados",
    intro:
      "Qualquer pessoa com um desses links pode ler aquele currículo. As visualizações não contam prévias de links, buscadores nem você enquanto estiver conectado.",
    untitled: "Currículo",
    shown: "E-mail e telefone visíveis",
    hidden: "E-mail e telefone ocultos",
    indexed: "Nos resultados de busca",
    older: "Versão anterior",
    copyFor: "Copiar o link de {name}",
    openFor: "Abrir a página de {name} (abre em uma nova aba)",
    turnOffFor: "Desativar o link de {name}",
    turnOff: "Desativar",
  },
  copy: {
    copied: "Copiado",
    copyLink: "Copiar link",
    linkCopied: "Link copiado",
    cantCopy: "Não foi possível copiar",
    selectLink: "Selecione o link e copie você mesmo.",
    open: "Abrir página",
    newTab: "(abre em uma nova aba)",
  },
  actions: {
    signIn: "Entre para compartilhar um link do seu currículo.",
    checkFailed:
      "Não foi possível verificar os links que você já criou. Confira sua conexão e tente de novo.",
    copied: "Copiado",
    ready: "Link pronto",
    onClipboard:
      "Seu link de compartilhamento está na área de transferência. Qualquer pessoa com ele pode ler este currículo.",
    fromSettings: "Copie nas configurações do link.",
    settings: "Configurações",
    makeFailed: "Não foi possível criar o link",
    turnedOff: "Link desativado",
    turnedOffNote: "Quem abrir agora vai ver que ele não funciona mais.",
    turnOffFailed: "Não foi possível desativar o link",
    undo: "Desfazer",
    fallback: "Algo deu errado. Tente de novo.",
  },
  invite: {
    text: "Compartilhe seu link: quando a pessoa se cadastrar e verificar um currículo, vocês dois ganham {fix} ajustes de linha a mais, além de {tailor} versões personalizadas no Pro ou no Max.",
    announcement:
      "Convide um amigo e vocês dois ganham extras. O convite está logo abaixo do botão de download.",
    label: "Convide um amigo",
    heading: "Conhece alguém procurando emprego?",
    copied: "Copiado",
    copy: "Copiar link de convite",
    announced: "Link de convite copiado.",
    dismiss: "Dispensar o convite",
    copyFailed: "Não foi possível copiar o link",
    copyFailedNote: "Seu link de convite também está na página da sua conta.",
  },
} satisfies Translation<Messages["shareLinks"]>;
