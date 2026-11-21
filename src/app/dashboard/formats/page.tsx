import type { Metadata } from "next";
import { FormatsGallery } from "@/components/formats/formats-gallery";
import { FormatsLead } from "@/components/formats/formats-lead";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";

export const metadata: Metadata = { title: "Formats" };

export default function FormatsPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
          Formats
        </h1>
        <FormatsLead />
        <OttoNote live={false} message={OTTO.formats.tip} className="mt-5" />
      </header>
      <FormatsGallery />
    </div>
  );
}
