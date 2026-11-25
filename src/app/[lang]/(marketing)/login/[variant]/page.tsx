import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  isLoginVariant,
  LOGIN_VARIANTS,
  type LoginVariant,
} from "@/components/account/login-heading";
import { ROUTES } from "@/components/site/routes";
import { requirePublished } from "@/i18n/publish";
import { LoginScreen, loginMetadata, loginWords } from "../_components/login-screen";

export async function generateMetadata(): Promise<Metadata> {
  return loginMetadata();
}

export const dynamicParams = false;

// Every language: where sign-in isn't published, the page below prerenders as that language's 404.
export function generateStaticParams(): { variant: LoginVariant }[] {
  return LOGIN_VARIANTS.map((variant) => ({ variant }));
}

export default async function LoginVariantPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  await requirePublished(ROUTES.login);
  const { variant } = await params;
  if (!isLoginVariant(variant)) notFound();
  return <LoginScreen {...await loginWords()} variant={variant} />;
}
