import type { Messages } from "..";
import type { Translation } from "../../types";

// The sign-in form, dialog and terms line, in Brazilian Portuguese.
export default {
  google: "Continuar com o Google",
  googleOff: "O login com o Google funciona quando o Supabase estiver configurado.",
  or: "ou",
  email: "E-mail",
  emailPlaceholder: "voce@exemplo.com",
  emailMe: "Me envie um código",
  badEmail: "Digite seu e-mail, como nome@exemplo.com.",
  badCode: "Digite o código de {length} dígitos do e-mail.",
  sent: "Enviamos um código de {length} dígitos para {email}.",
  sentNew: "Enviamos um novo código para {email}.",
  codeSent: "Enviamos um código de {length} dígitos para <b>{email}</b>.",
  codeSentNew: "Enviamos um novo código para <b>{email}</b>. Só o mais recente funciona.",
  devCode: "Modo de desenvolvimento: seu código é <b>{code}</b>",
  codeLabel: "Código de {length} dígitos",
  codeHint: "Digite ou cole. Você entra assim que os {length} dígitos estiverem preenchidos.",
  signIn: "Entrar",
  sending: "Enviando…",
  resendIn: "Reenviar código em {seconds}s",
  resend: "Reenviar código",
  otherEmail: "Usar outro e-mail",
  done: "Você entrou.",
  terms:
    "Primeira vez aqui? Isso cria sua conta grátis. Ao continuar, você concorda com os <link>Termos</link> e a <link>Política de Privacidade</link>.",
  newTab: "(abre em uma nova aba)",
  dialog: {
    reason: "Uma conta grátis permite que o Otto ajuste linhas e personalize seu currículo.",
    otto: "Use o Google ou um código de 6 dígitos por e-mail, e voltamos de onde você parou.",
  },
  upgrade: {
    trial: "Entre para começar seu teste",
    upgrade: "Entre para fazer o upgrade",
    otto: "Entre primeiro. Depois eu te levo direto para o pagamento.",
    description: "Use o Google ou um código de 6 dígitos por e-mail. Sem senha.",
  },
  account: "Entre para ver seu plano e o que você usou este mês.",
  signedOut: {
    safe: "Seus currículos estão seguros na sua conta. Entre de novo para vê-los aqui.",
    kept: {
      one: "1 currículo ainda não terminou o backup, então continua neste navegador.",
      other: "{count} currículos ainda não terminaram o backup, então continuam neste navegador.",
    },
  },
  gate: {
    sessionEnded: "Você saiu da conta. Entre de novo para continuar.",
    tryAgain: "Tente de novo agora.",
    backIn: "Você entrou. Vamos continuar de onde você parou.",
    reasons: {
      fix: "Entre para ajustar linhas comigo. No Free você tem {limit} por mês.",
      tailor: "Entre e experimente o {plan} por {days} dias para personalizar comigo.",
      letter: "Entre e experimente o {plan} por {days} dias para cartas, mensagens e respostas.",
      import: "Entre e experimente o {plan} por {days} dias para leituras com IA.",
      draft: "Entre e experimente o {plan} por {days} dias para criar rascunhos comigo.",
      github:
        "Entre e experimente o {plan} por {days} dias para criar rascunhos a partir do GitHub.",
    },
  },
} satisfies Translation<Messages["signIn"]>;
