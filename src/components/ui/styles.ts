/**
 * Shared class strings, so every list, menu and form draws the same shapes.
 * Written against the light palette; the dark theme flips the palette itself.
 */

/** The boxed table: a rounded frame, ruled columns, the pager in its foot. */
export const TABLE_FRAME =
  "overflow-hidden rounded-xl border border-black/12 bg-white";
export const HEAD_ROW =
  "divide-x divide-black/12 border-b border-black/12 bg-neutral-50";
export const HEAD_CELL =
  "px-3 py-2 text-left text-[13px] font-medium whitespace-nowrap text-neutral-600";
export const BODY_ROW =
  "divide-x divide-black/12 border-b border-black/12 last:border-b-0";
export const CELL = "px-3 py-2 text-sm text-neutral-700";

/** The buttons in a table's toolbar — Sort, Columns — and the search box beside them. */
export const TOOLBAR_BUTTON =
  "inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800 sm:h-8";
export const TOOLBAR_SEARCH =
  "h-9 w-full rounded-xl border border-black/10 bg-white pr-8 pl-9 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-2 focus:outline-offset-0 focus:outline-neutral-800 sm:h-8 sm:text-sm";

/** A pager arrow in the table's foot. */
export const PAGER_BUTTON =
  "grid size-9 cursor-pointer place-items-center rounded-lg border border-black/10 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40 sm:size-7";

/** A floating panel: dropdowns, popovers, row menus. */
export const MENU_PANEL =
  "z-50 rounded-xl border border-black/10 bg-white p-1 shadow-lg";
export const MENU_ROW =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-100 disabled:cursor-default disabled:opacity-40";
export const MENU_HEADING =
  "px-2 pt-1.5 pb-1 text-xs font-medium text-neutral-500";

/** Form controls. */
export const LABEL = "text-sm font-medium text-neutral-900";
export const INPUT =
  "h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-base text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:opacity-50 sm:text-sm";
export const TEXTAREA =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:opacity-50 sm:text-sm";

/** Buttons. */
export const PRIMARY_BUTTON =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:pointer-events-none disabled:opacity-40 sm:h-8";
export const SECONDARY_BUTTON =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-black/10 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-40 sm:h-8";

/** A centred dialog panel and the dimmed page behind it. */
export const DIALOG_SCRIM =
  "fixed inset-0 z-50 flex items-center justify-center bg-scrim/40 p-4";
export const DIALOG_PANEL =
  "w-full rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl";
