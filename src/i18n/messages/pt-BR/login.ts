import type { Messages } from "..";
import type { Translation } from "../../types";

// The sign-in page around the form, in Brazilian Portuguese.
export default {
  meta: {
    title: "Entrar",
    description:
      "Entre com o Google ou com seu e-mail. Não precisa de senha: podemos enviar um código de 6 dígitos para você.",
  },
  heading: {
    signIn: "Entrar",
    trial: "Entre para começar seu teste",
    upgrade: "Entre para fazer o upgrade",
    jobs: "Entre para ver suas vagas compatíveis",
    portfolio: "Entre para criar seu portfólio",
  },
  otto: "Use o Google, ou eu envio um código de 6 dígitos para o seu e-mail. Nenhuma senha para lembrar.",
  studio: "Só quer revisar um currículo? <link>Abra o estúdio</link>. Não precisa de conta.",
  googleFailed: "O login com o Google não foi concluído. Tente de novo ou use seu e-mail.",
  signingIn: "Fazendo seu login",
} satisfies Translation<Messages["login"]>;
