import type { Messages } from "..";
import type { Translation } from "../../types";

// The private calendar feed card, in Brazilian Portuguese.
export default {
  title: "Todas as entrevistas na sua agenda",
  intro:
    "Assine uma vez. As entrevistas que você registrar, nos horários certos, e seus dias de follow-up aparecem sozinhos, cada um com um link para a preparação.",
  google: "Assinar no Google Agenda",
  googleNewTab: "(abre o Google Agenda em uma nova aba)",
  apple: "Apple / Outlook",
  copy: "Copiar link",
  copied: "Copiado",
  paste: "Cole o link da agenda no seu app de agenda.",
  cantCopy: "Não foi possível copiar",
  selectText: "Selecione o texto na caixa e copie de lá.",
  note: "O Google atualiza agendas assinadas a cada várias horas, então, para uma mudança no mesmo dia, use também Adicionar à agenda na entrevista. O link é privado: qualquer pessoa com ele pode ver suas entrevistas.",
  noteRenewable:
    "O Google atualiza agendas assinadas a cada várias horas, então, para uma mudança no mesmo dia, use também Adicionar à agenda na entrevista. O link é privado: qualquer pessoa com ele pode ver suas entrevistas, então crie um novo se ele vazar.",
  renew: "Criar um novo link",
  renewHint: "Agendas com o link antigo param de atualizar.",
  cancel: "Cancelar",
  renewed: "Novo link da agenda pronto",
  renewedNote: "Agendas com o link antigo param de atualizar. Assine de novo com este.",
  renewFailed: "Não foi possível criar um novo link",
  loadFailed: "O link da sua agenda não carregou",
  tryAgain: "Tentar de novo",
  loading: "Buscando o link da sua agenda",
} satisfies Translation<Messages["calendar"]>;
