import { OttoLoadingScreen } from "@/components/mascot/otto-loading-screen";
import { getMessages } from "@/i18n/server";

export default async function StudioLoading() {
  const t = await getMessages("studio");
  return <OttoLoadingScreen detail={t.loading.opening} />;
}
