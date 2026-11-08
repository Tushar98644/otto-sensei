import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The one action the landing page exists for. Full width on phones, where it's easiest to tap.
export function PrimaryCta({ className }: { className?: string }) {
  return (
    <Link
      href={ROUTES.studio}
      className={buttonClasses({ size: "lg", className: cn("w-full sm:w-auto", className) })}
    >
      Check my resume
      <ArrowRight />
    </Link>
  );
}
