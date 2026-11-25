import { notFound } from "next/navigation";
import {
  isLoginVariant,
  LOGIN_VARIANTS,
  type LoginVariant,
} from "@/components/account/login-heading";
import { LoginScreen, loginMetadata } from "../_components/login-screen";

export const metadata = loginMetadata;

export const dynamicParams = false;

export function generateStaticParams(): { variant: LoginVariant }[] {
  return LOGIN_VARIANTS.map((variant) => ({ variant }));
}

export default async function LoginVariantPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;
  if (!isLoginVariant(variant)) notFound();
  return <LoginScreen variant={variant} />;
}
