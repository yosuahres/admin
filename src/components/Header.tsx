"use client";
import { ChevronDown, Download, FileSpreadsheet, Menu, Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { navByRole } from "@/constants/navigation";
import { usePageActions } from "@/contexts/page-actions";
import { exportToExcel, exportTemplate } from "@/utils/exportutils";
import ImportButton from "@/components/ImportButton";

interface HeaderProps {
  onMenuClick?: () => void;
}

const extraLabels: Record<string, string> = {
  "/finance/reporting": "Laporan Keuangan",
  "/finance/persembahan": "Persembahan",
  "/setting/account": "Account",
};

function buildRouteLabels() {
  const map: Record<string, string> = { ...extraLabels };
  Object.values(navByRole).forEach((items) => {
    items.forEach((item) => {
      if (item.href) map[item.href] = item.label;
      item.children?.forEach((child) => {
        if (child.href) map[child.href] = child.label;
      });
    });
  });
  return map;
}

const routeLabels = buildRouteLabels();

function getPageTitle(pathname: string): string | null {
  if (routeLabels[pathname]) return routeLabels[pathname];
  const match = Object.keys(routeLabels)
    .filter((k) => pathname.startsWith(k + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return match ? routeLabels[match] : null;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [ieOpen, setIeOpen] = useState(false);
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const actions = usePageActions();
  const ieRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ieRef.current && !ieRef.current.contains(e.target as Node)) {
        setIeOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pageTitle = getPageTitle(pathname);
  const hasActions = !!(actions.onAdd || actions.exportSchema || actions.onExport);

  return (
    <header className="w-full bg-white border-b border-gray-200 px-4 h-14 flex items-center shrink-0 gap-3">
      {/* Left: menu toggle + page title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {mounted && isMobile && (
          <button
            onClick={onMenuClick}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Toggle menu"
          >
            <Menu size={18} />
          </button>
        )}
        {pageTitle && (
          <h1 className="text-base font-semibold text-gray-900 truncate">{pageTitle}</h1>
        )}
      </div>

      {/* Right: Import/Export + New button */}
      {hasActions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions.onExport && (
            <button
              onClick={actions.onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
              Export Excel
            </button>
          )}

          {actions.exportSchema && (
            <div ref={ieRef} className="relative">
              <button
                onClick={() => setIeOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Upload size={14} />
                Import / Export
                <ChevronDown size={13} className={`transition-transform ${ieOpen ? "rotate-180" : ""}`} />
              </button>

              {ieOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  <button
                    onClick={() => {
                      setIeOpen(false);
                      const items = actions.getItems?.() ?? [];
                      exportToExcel(items, actions.exportTitle ?? "Data", actions.exportSchema);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <FileSpreadsheet size={15} className="shrink-0" />
                    Export ke Excel
                  </button>

                  {actions.onImport && (
                    <ImportButton
                      schema={actions.exportSchema}
                      onImport={actions.onImport}
                      onTrigger={() => setIeOpen(false)}
                      label="Import dari Excel"
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    />
                  )}

                  <div className="border-t border-gray-100 my-1" />

                  <button
                    onClick={() => {
                      setIeOpen(false);
                      exportTemplate(actions.exportTitle ?? "Data", actions.exportSchema!);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Download size={15} className="shrink-0" />
                    Unduh Template Import
                  </button>
                </div>
              )}
            </div>
          )}

          {actions.onAdd && (
            <button
              onClick={actions.onAdd}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus size={15} />
              {actions.addLabel ?? "New"}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
