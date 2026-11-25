import type { Metadata } from "next";
import { ROUTES } from "@/components/site/routes";
import { requirePublished } from "@/i18n/publish";
import { getMessages } from "@/i18n/server";
import { LoginScreen, loginMetadata } from "./_components/login-screen";

export async function generateMetadata(): Promise<Metadata> {
  return loginMetadata();
}

// Static: a ?next= that changes the heading is served its own prerendered page by src/proxy.ts.
export default async function LoginPage() {
  await requirePublished(ROUTES.login);
  return <LoginScreen t={await getMessages("login")} variant={null} />;
}
