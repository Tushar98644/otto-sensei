import { FormatsGallery } from "@/components/formats/formats-gallery";
import { FormatsLead } from "@/components/formats/formats-lead";
import { OttoNote } from "@/components/mascot/otto-note";
import { getMessages } from "@/i18n/server";
import { pageTitle } from "../page-title";

export const generateMetadata = () => pageTitle("formats");

export default async function FormatsPage() {
  const { pages } = await getMessages("dashboard");
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
          {pages.formats}
        </h1>
        <FormatsLead />
        <OttoNote live={false} message={pages.formatsTip} className="mt-5" />
      </header>
      <FormatsGallery />
    </div>
  );
}
