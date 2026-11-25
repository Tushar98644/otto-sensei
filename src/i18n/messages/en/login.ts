// The sign-in page around the form (P2); the form itself is the app's (account.ts).
export default {
  meta: {
    title: "Sign in",
    description:
      "Sign in with Google or your email. No password needed: we can send you a 6-digit code.",
  },
  // loginHeading() in src/components/account/login-heading.ts: one per variant, and trial while the Pro trial is on offer.
  heading: {
    signIn: "Sign in",
    trial: "Sign in to start your trial",
    upgrade: "Sign in to upgrade",
    jobs: "Sign in to see your job matches",
    portfolio: "Sign in to make your portfolio",
  },
  otto: "Use Google, or I'll email you a 6-digit code. No password to remember.",
  studio: "Only checking a resume? <link>Open the studio</link>. No account needed.",
  googleFailed: "Google sign-in didn't finish. Try again, or use your email.",
  signingIn: "Signing you in",
} as const;
