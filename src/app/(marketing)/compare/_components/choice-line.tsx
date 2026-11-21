import type { Choice } from "@/lib/seo-pages/compare";

export function ChoiceLine({ choice }: { choice: Choice }) {
  return (
    <>
      <span className="font-medium text-ink">Pick {choice.name} if</span> {choice.clause}
    </>
  );
}
