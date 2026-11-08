"use client";

import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  House,
  Plus,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ImportButton from "@/components/ImportButton";
import { navByRole } from "@/constants/navigation";
import { getSection } from "@/constants/roles";
import { usePageActions } from "@/contexts/page-actions";
import { exportTemplate, exportToExcel } from "@/utils/exportutils";
import { cn } from "@/utils/helpers";
import { SECTION_INFO } from "./app-sidebar";
import { SidebarTrigger } from "./sidebar-state";

/** The primary control in the bar — "Tambah Jemaat", "New". */
export const TOPBAR_ACTION_CLASS =
  "inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 sm:h-8";

/** A secondary control beside it — Export, Import. */
export const TOPBAR_BUTTON_CLASS =
  "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-black/10 bg-white px-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 sm:h-8";

const MENU_ROW =
  "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-100";

const extraLabels: Record<string, string> = {
  "/finance/reporting": "Laporan Keuangan",
  "/finance/perpuluhan": "Perpuluhan",
  "/finance/perpuluhan/add": "Input Perpuluhan",
  "/finance/cashflow/add": "Tambah Transaksi",
  "/finance/cashflow/edit": "Edit Transaksi",
  "/finance/budget/add": "Tambah Anggaran",
  "/setting/account": "Account",
};

function buildRouteLabels() {
  const map: Record<string, string> = { ...extraLabels };
  for (const items of Object.values(navByRole)) {
    for (const item of items) {
      if (item.href) map[item.href] ??= item.label;
      for (const child of item.children ?? []) {
        if (child.href) map[child.href] ??= child.label;
      }
    }
  }
  return map;
}

const routeLabels = buildRouteLabels();

function getPageTitle(pathname: string): string | null {
  if (routeLabels[pathname]) return routeLabels[pathname];
  const match = Object.keys(routeLabels)
    .filter((k) => pathname.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? routeLabels[match] : null;
}

function ImportExportMenu() {
  const actions = usePageActions();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!actions.exportSchema) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={TOPBAR_BUTTON_CLASS}
      >
        <Upload className="size-4 text-neutral-500" strokeWidth={1.75} />
        <span className="hidden sm:inline">Import / Export</span>
        <ChevronDown
          className={cn(
            "size-3.5 text-neutral-400 transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-56 rounded-xl border border-black/10 bg-white p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              const items = actions.getItems?.() ?? [];
              exportToExcel(
                items,
                actions.exportTitle ?? "Data",
                actions.exportSchema,
              );
            }}
            className={MENU_ROW}
          >
            <FileSpreadsheet
              className="size-4 shrink-0 text-neutral-500"
              strokeWidth={1.75}
            />
            Export ke Excel
          </button>

          {actions.onImport ? (
            <ImportButton
              schema={actions.exportSchema}
              onImport={actions.onImport}
              onTrigger={() => setOpen(false)}
              label="Import dari Excel"
              className={MENU_ROW}
            />
          ) : null}

          <div className="mx-1 my-1 border-t border-black/8" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              if (actions.exportSchema) {
                exportTemplate(
                  actions.exportTitle ?? "Data",
                  actions.exportSchema,
                );
              }
            }}
            className={MENU_ROW}
          >
            <Download
              className="size-4 shrink-0 text-neutral-500"
              strokeWidth={1.75}
            />
            Unduh Template Import
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Page header: drawer trigger, breadcrumb, and whatever actions the page registered. */
export function Topbar() {
  const pathname = usePathname();
  const actions = usePageActions();
  const section = getSection(pathname);
  const sectionLabel = pathname.startsWith("/setting")
    ? "Settings"
    : section
      ? SECTION_INFO[section].label
      : null;
  const title = getPageTitle(pathname) ?? sectionLabel ?? "";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-black/8 bg-white px-3 sm:gap-3 sm:px-5">
      <SidebarTrigger />

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
        {/* The crumbs ahead of the title give way as the screen narrows. */}
        <Link
          href={section ? `/${section}` : "/"}
          aria-label="Home"
          className="hidden text-neutral-500 hover:text-neutral-900 sm:block"
        >
          <House className="size-4" strokeWidth={1.75} />
        </Link>
        <span aria-hidden className="hidden text-neutral-300 sm:inline">
          /
        </span>
        {sectionLabel && sectionLabel !== title ? (
          <span className="hidden items-center gap-2 md:flex">
            <span className="text-sm text-neutral-500">{sectionLabel}</span>
            <span aria-hidden className="text-neutral-300">
              /
            </span>
          </span>
        ) : null}
        <h1
          aria-current="page"
          className="truncate text-sm font-medium text-neutral-900"
        >
          {title}
        </h1>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {actions.onExport ? (
          <button
            type="button"
            onClick={actions.onExport}
            className={TOPBAR_BUTTON_CLASS}
          >
            <Download className="size-4 text-neutral-500" strokeWidth={1.75} />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        ) : null}

        <ImportExportMenu />

        {actions.onAdd ? (
          <button
            type="button"
            onClick={actions.onAdd}
            className={TOPBAR_ACTION_CLASS}
          >
            <Plus className="size-4" strokeWidth={2} />
            {actions.addLabel ?? "New"}
          </button>
        ) : null}
      </div>
    </header>
  );
}
