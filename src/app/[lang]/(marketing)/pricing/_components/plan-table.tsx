import { Check, Minus } from "lucide-react";
import { PLANS, type PlanId } from "@/config/plans";
import { cn } from "@/lib/utils";
import { planRows, type PlanCell } from "./plan-rows";

const LABEL_CELL =
  "sticky left-0 z-10 w-36 bg-background py-4 pr-3 text-left align-top sm:w-2/5 sm:pr-4";

const VALUE_CELL = "px-2 py-4 text-center sm:px-4";

function Cell({ value }: { value: PlanCell }) {
  if (value === true) {
    return (
      <>
        <Check className="mx-auto my-0.5 block size-5 text-ink" aria-hidden />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Minus className="mx-auto my-0.5 block size-5 text-subtle" aria-hidden />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return <span className="text-sm text-ink lining-nums tabular-nums sm:text-base">{value}</span>;
}

export function PlanTable({ plans, className }: { plans: readonly PlanId[]; className?: string }) {
  const groups = planRows();
  return (
    <section aria-labelledby="compare-plans-title" className={className}>
      <h2
        id="compare-plans-title"
        className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13"
      >
        Every limit, plan by plan
      </h2>
      <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
        Pro and Max limits reset each month, on the day of the month your plan started. Free&apos;s
        line fixes reset on the 1st.
      </p>
      <div
        role="region"
        aria-labelledby="compare-plans-title"
        tabIndex={0}
        className="mt-12 overflow-x-auto overscroll-x-contain rounded-sm sm:mt-16"
      >
        <table className="w-full min-w-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className={LABEL_CELL}>
                <span className="sr-only">What you get</span>
              </th>
              {plans.map((plan) => (
                <th
                  key={plan}
                  scope="col"
                  className={cn(VALUE_CELL, "text-base/6 font-semibold text-ink")}
                >
                  {PLANS[plan].name}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.title}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={plans.length + 1}
                  className="pt-10 pb-3 text-left text-xs/4 font-medium tracking-widest text-subtle uppercase"
                >
                  <span className="sticky left-0 inline-block">{group.title}</span>
                </th>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.label} className="border-t border-border last:border-b">
                  <th scope="row" className={LABEL_CELL}>
                    <span className="block text-sm/5 font-normal text-ink sm:text-base/6">
                      {row.label}
                    </span>
                    {row.detail ? (
                      <span className="mt-1 block text-sm/5 font-normal text-subtle">
                        {row.detail}
                      </span>
                    ) : null}
                  </th>
                  {plans.map((plan) => (
                    <td key={plan} className={cn(VALUE_CELL, "align-top")}>
                      <Cell value={row.cells[plan]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}
