import { LoginScreen, loginMetadata } from "./_components/login-screen";

export const metadata = loginMetadata;

// Static: a ?next= that changes the heading is served its own prerendered page by src/proxy.ts.
export default function LoginPage() {
  return <LoginScreen variant={null} />;
}
