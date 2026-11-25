import type { Messages } from "../..";
import type { Translation } from "../../../types";

export default {
  user: "visitante",
  banner: {
    help: "Digite '<link>{command}</link>' para ver a lista de comandos disponíveis.",
    summary: "Digite '<link>{command}</link>' para ver um resumo.",
    resume: "Digite '<link>{command}</link>' ou clique <link>aqui</link> para ver o currículo.",
  },
  fetch: {
    title: "<b>{command}</b>: resumo",
    about: "SOBRE",
    resume: "Currículo",
    contact: "CONTATO",
    status: "SITUAÇÃO",
    now: "AGORA",
  },
  about: {
    hello: "Oi, eu sou {name}.",
    more: "Mais sobre mim:",
    summary: "'<link>{command}</link>' - resumo curto.",
    work: "'<link>{command}</link>' - onde já trabalhei.",
    projects: "'<link>{command}</link>' - coisas que construí.",
  },
  skills: "habilidades",
  stack: "tecnologias:",
  minutes: "{minutes} min",
  email: "e-mail",
  resume: "currículo",
  shell: {
    welcome: "Olá! Estes são todos os comandos disponíveis:",
    tab: "[tab]: completar.",
    clear: "[ctrl+l]/clear: limpar o terminal.",
    opening: "Abrindo {label}...",
    themeSet: "Tema alterado para {mode}.",
    usage: "uso: theme [light|dark]",
    notFound: "shell: comando não encontrado: {name}. Tente 'help' para começar.",
    prompt: "Digite um comando, ou help",
    jokes: {
      vi: "nossa, você ainda usa 'vi'? tente 'vim'.",
      vim: "'vim' está ultrapassado. que tal 'nvim'?",
      nvim: "'nvim'? chique demais. por que não 'emacs'?",
      emacs: "quer saber? usa o vscode e pronto.",
      sudo: "Permissão negada: com pouco poder vem... nenhuma responsabilidade?",
      cd: "infelizmente, não tenho como pagar mais diretórios.",
    },
  },
} satisfies Translation<Messages["portfolioDesigns"]["terminal"]>;
