"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { useTheme } from "@/hooks/use-theme";
import type { Theme } from "@/lib/theme";
import { cn } from "@/utils/helpers";

/*
 * Preview colours are literal on purpose: the palette variables flip with the
 * theme, and the Light preview has to look light even while dark is active.
 */
const LIGHT = {
  surface: "bg-[#f4f4f5]",
  pill: "bg-[#d4d4d8]",
  dot: "bg-[#3f3f46]",
  card: "bg-white shadow-[0_1px_3px_rgb(0_0_0/0.12)]",
  line: "bg-[#e4e4e7]",
};

const DARK = {
  surface: "bg-[#1c1c1e]",
  pill: "bg-[#4a4a4d]",
  dot: "bg-[#e5e5e5]",
  card: "bg-[#2c2c2e]",
  line: "bg-[#48484a]",
};

function WindowPreview({ tone }: { tone: typeof LIGHT }) {
  return (
    <div className={cn("flex size-full flex-col gap-2 p-2.5", tone.surface)}>
      <div className="flex items-center gap-1">
        <span className={cn("h-1.5 w-4 rounded-full", tone.pill)} />
        <span className={cn("h-1.5 w-2 rounded-full", tone.pill)} />
        <span className={cn("ml-auto size-2.5 rounded-full", tone.dot)} />
      </div>
      <div
        className={cn("flex flex-1 flex-col gap-1 rounded-md p-1.5", tone.card)}
      >
        <span className={cn("h-1 w-3/4 rounded-full", tone.line)} />
        <span className={cn("h-1 w-1/2 rounded-full", tone.line)} />
      </div>
    </div>
  );
}

function SystemPreview() {
  return (
    <div className="grid size-full grid-cols-2">
      <div
        className={cn(
          "flex flex-col gap-2 py-2.5 pl-2.5 pr-1.5",
          LIGHT.surface,
        )}
      >
        <span className={cn("h-1.5 w-4 rounded-full", LIGHT.pill)} />
        <span className={cn("flex-1 rounded-md", LIGHT.card)} />
      </div>
      <div
        className={cn("flex flex-col gap-2 py-2.5 pr-2.5 pl-1.5", DARK.surface)}
      >
        <span className={cn("ml-auto h-1.5 w-4 rounded-full", DARK.pill)} />
        <span className={cn("flex-1 rounded-md", DARK.card)} />
      </div>
    </div>
  );
}

const OPTIONS: Array<{
  value: Theme;
  label: string;
  preview: React.ReactNode;
}> = [
  { value: "light", label: "Light", preview: <WindowPreview tone={LIGHT} /> },
  { value: "dark", label: "Dark", preview: <WindowPreview tone={DARK} /> },
  { value: "system", label: "System", preview: <SystemPreview /> },
];

/**
 * Centred theme picker. A native `<dialog>`, so focus trapping, Escape and
 * the backdrop come from the platform. Picking applies straight away.
 */
export function ThemeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="theme-dialog-title"
      // Keep the drawer behind it open when Escape closes just this dialog.
      onKeyDown={(event) => {
        if (event.key === "Escape") event.stopPropagation();
      }}
      // A click on the dimmed space around the panel lands on the dialog itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[25rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-black/10 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-scrim/40"
    >
      <div className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2
            id="theme-dialog-title"
            className="flex-1 text-base font-semibold"
          >
            Switch Theme
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 cursor-pointer place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <div
          role="radiogroup"
          aria-label="Theme"
          className="grid grid-cols-3 gap-3"
        >
          {OPTIONS.map(({ value, label, preview }) => {
            const selected = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(value)}
                className="group flex cursor-pointer flex-col items-center gap-2 outline-none"
              >
                <span
                  className={cn(
                    "block aspect-[4/3] w-full overflow-hidden rounded-lg border-2 transition-colors",
                    selected
                      ? "border-neutral-900"
                      : "border-neutral-200 group-hover:border-neutral-300",
                    "group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-neutral-800",
                  )}
                >
                  {preview}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {label}
                  {selected ? (
                    <span className="grid size-4 place-items-center rounded-full bg-neutral-900 text-white">
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </dialog>
  );
}
