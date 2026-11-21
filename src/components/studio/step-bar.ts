// Phones get a slimmer bar that steps aside while the keyboard is up, keeping its place so nothing jumps.
export const STEP_BAR_CLASSES =
  "sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex items-center gap-1 self-end rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-ink/5 max-sm:bottom-[max(0.5rem,env(safe-area-inset-bottom))] max-sm:w-full max-sm:p-1 max-sm:[main:has(:is(input,textarea):focus)_&]:invisible";
