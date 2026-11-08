"use client";

import {
  createContext,
  use,
  useCallback,
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

// WAI-ARIA tabs with automatic activation: arrow keys move focus and select in one step, and only
// the selected tab is in the Tab order (roving tabindex).
//   <Tabs defaultValue="checks">
//     <TabList aria-label="Recruiter view">
//       <Tab value="checks">Checks</Tab>
//       <Tab value="text">What software reads</Tab>
//     </TabList>
//     <TabPanel value="checks">…</TabPanel>
//     <TabPanel value="text">…</TabPanel>
//   </Tabs>

type TabsContextValue = {
  baseId: string;
  value: string;
  select: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const context = use(TabsContext);
  if (!context) throw new Error(`<${component}> must be rendered inside <Tabs>`);
  return context;
}

// Tab values become part of element ids, which can't contain spaces.
function tabId(baseId: string, value: string) {
  return `${baseId}-tab-${encodeURIComponent(value)}`;
}

function panelId(baseId: string, value: string) {
  return `${baseId}-panel-${encodeURIComponent(value)}`;
}

export type TabsProps = {
  children: ReactNode;
  className?: string;
} & (
  | { value: string; onValueChange: (value: string) => void; defaultValue?: never }
  | { defaultValue: string; onValueChange?: (value: string) => void; value?: never }
);

export function Tabs({ value, defaultValue, onValueChange, className, children }: TabsProps) {
  const baseId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const current = value ?? uncontrolledValue;
  const isControlled = value !== undefined;

  const select = useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const context = useMemo(() => ({ baseId, value: current, select }), [baseId, current, select]);

  return (
    <TabsContext value={context}>
      <div className={cn("flex flex-col gap-4", className)}>{children}</div>
    </TabsContext>
  );
}

const NAVIGATION_KEYS = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);

// Give it an aria-label (or aria-labelledby) that names the group, e.g. "Recruiter view".
export type TabListProps = ComponentProps<"div">;

export function TabList({ className, onKeyDown, ...props }: TabListProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || !NAVIGATION_KEYS.has(event.key)) return;
    const list = event.currentTarget;
    const tabs = Array.from(
      list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'),
    ).filter((tab) => tab.closest('[role="tablist"]') === list);
    const index = tabs.findIndex((tab) => tab === document.activeElement);
    if (index === -1) return;
    event.preventDefault();
    const last = tabs.length - 1;
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? last
          : event.key === "ArrowRight"
            ? (index + 1) % tabs.length
            : (index - 1 + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    next?.focus();
    next?.click();
  }

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      {...props}
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex max-w-full items-center gap-1 self-start overflow-x-auto rounded-xl bg-surface-muted p-1",
        className,
      )}
    />
  );
}

export type TabProps = Omit<ComponentProps<"button">, "value"> & {
  value: string;
};

export function Tab({ value, className, onClick, ...props }: TabProps) {
  const { baseId, value: selectedValue, select } = useTabsContext("Tab");
  const selected = value === selectedValue;

  return (
    <button
      type="button"
      role="tab"
      id={tabId(baseId, value)}
      // Inactive panels aren't rendered, so only the selected tab points at one.
      aria-controls={selected ? panelId(baseId, value) : undefined}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) select(value);
      }}
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium whitespace-nowrap text-muted -outline-offset-2 transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-50 aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-control aria-selected:ring-1 aria-selected:ring-ink/5 [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
    />
  );
}

export type TabPanelProps = ComponentProps<"div"> & {
  value: string;
  // Keeps the panel in the page while hidden, so its state (scroll, typed text) survives a switch.
  keepMounted?: boolean;
};

export function TabPanel({ value, keepMounted = false, className, ...props }: TabPanelProps) {
  const { baseId, value: selectedValue } = useTabsContext("TabPanel");
  const selected = value === selectedValue;
  if (!selected && !keepMounted) return null;

  return (
    <div
      role="tabpanel"
      id={panelId(baseId, value)}
      aria-labelledby={tabId(baseId, value)}
      hidden={!selected}
      tabIndex={0}
      {...props}
      className={cn("min-w-0 rounded-2xl", className)}
    />
  );
}
