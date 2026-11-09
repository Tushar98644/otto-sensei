import { Search } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/components/site/routes";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { isFiltered } from "@/lib/job-feed/params";
import { LEVEL_LABELS, LEVELS, ROLE_FAMILIES, ROLE_LABELS, type JobFilters } from "@/lib/job-feed/types";

const CHECKBOX = "flex min-h-11 items-center gap-2 text-sm text-ink";

// A plain GET form: works without JavaScript, and every filtered list has its own address.
export function PublicFilters({ filters }: { filters: JobFilters }) {
  return (
    <form action={ROUTES.jobs} method="get" role="search" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
          />
          <Input
            type="search"
            name="q"
            defaultValue={filters.q}
            maxLength={100}
            placeholder="Search titles, companies or skills"
            aria-label="Search jobs"
            className="pl-10"
          />
        </div>
        <Input
          type="search"
          name="place"
          defaultValue={filters.place}
          maxLength={60}
          placeholder="City or country"
          aria-label="Location"
          className="sm:w-56"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Select name="role" aria-label="Role" defaultValue={filters.role ?? ""}>
          <option value="">Any role</option>
          {ROLE_FAMILIES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
        <Select name="level" aria-label="Seniority" defaultValue={filters.level ?? ""}>
          <option value="">Any level</option>
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {LEVEL_LABELS[level]}
            </option>
          ))}
        </Select>
        <Select
          name="posted"
          aria-label="Posted"
          defaultValue={filters.postedWithin === null ? "" : String(filters.postedWithin)}
        >
          <option value="">Posted any time</option>
          <option value="7">Posted in the last 7 days</option>
          <option value="30">Posted in the last 30 days</option>
        </Select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className={CHECKBOX}>
          <input
            type="checkbox"
            name="remote"
            value="1"
            defaultChecked={filters.remote}
            className="size-4 accent-ink"
          />
          Remote only
        </label>
        <div className="flex gap-2">
          {isFiltered(filters) ? (
            <Link href={ROUTES.jobs} className={buttonClasses({ variant: "ghost" })}>
              Clear
            </Link>
          ) : null}
          <Button type="submit">Show jobs</Button>
        </div>
      </div>
    </form>
  );
}
