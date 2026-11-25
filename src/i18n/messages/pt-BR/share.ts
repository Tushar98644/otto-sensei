import type { Messages } from "..";
import type { Translation } from "../../types";

export default {
  meta: {
    shared: "Currículo compartilhado",
    title: "{name} - Currículo",
    untitled: "Currículo",
    description: "Um currículo compartilhado pelo {brand}.",
    notFound: "Link não encontrado",
  },
  updated: "Currículo · Atualizado em {date}",
  madeWith: "Feito com",
  unavailable: {
    thinking: "Otto, a lontra, pensando",
    worried: "Otto, a lontra, preocupada",
    busyTitle: "Muitas páginas abertas ao mesmo tempo",
    missingTitle: "Este link não funciona",
    busy: {
      one: "Muitos currículos foram abertos a partir da sua rede agora há pouco. Tente de novo em {count} minuto.",
      other:
        "Muitos currículos foram abertos a partir da sua rede agora há pouco. Tente de novo em {count} minutos.",
    },
    missing: "Quem compartilhou pode ter desativado o link. Peça um link novo.",
    checkOwn: "Verifique o seu próprio currículo",
  },
  download: {
    failed: "Não deu certo. Tente de novo.",
    tryAgain: "Tentar de novo",
    pdf: "Baixar PDF",
  },
  owner: {
    label: "Seu link",
    onlyYou: "Só você vê esta barra",
    settings: "Ajustes do link",
    edit: "Editar",
    saveFailed: "Não foi possível salvar",
    checkConnection: "Confira sua conexão e tente de novo.",
  },
  options: {
    legend: "O que a página mostra",
    contact: "Mostrar e-mail e telefone",
    contactHint:
      "Desligado: a página e o PDF dela deixam esses dados de fora. Seu nome, cidade e links sempre aparecem.",
    indexing: "Deixar os buscadores listarem",
    indexingHint: "Desligado: pedimos ao Google e a outros que não a mostrem nos resultados.",
  },
  facts: {
    none: "Nenhuma visita ainda",
    views: { one: "{count} visita", other: "{count} visitas" },
    lastOpened: "Aberto pela última vez {when}",
    shared: "Compartilhado {when}",
    justNow: "agora mesmo",
  },
} satisfies Translation<Messages["share"]>;
