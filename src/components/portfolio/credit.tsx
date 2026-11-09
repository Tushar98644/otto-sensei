import Link from "next/link";
import { OttoMark } from "@/components/site/otto-mark";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";

// The "Made with" line, drawn by a template at the foot of its own canvas (the `footer` prop). Its
// colour and type come from the template (templates/css.ts styles `.credit`), so it sits quietly
// on any page, light or dark.
export function PortfolioCredit() {
  return (
    <Link href={ROUTES.home}>
      <OttoMark className="size-6" />
      <span>
        Made with <span className="brand">{BRAND.name}</span>
      </span>
    </Link>
  );
}
