// components/MasterDataTable.tsx
"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  ListFilter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetchFromBackend } from "../utils/api";
import type { ColumnSchema } from "../utils/exportutils";
import { cn } from "../utils/helpers";
import {
  BODY_ROW,
  CELL,
  DIALOG_PANEL,
  DIALOG_SCRIM,
  HEAD_CELL,
  HEAD_ROW,
  INPUT,
  LABEL,
  MENU_HEADING,
  MENU_PANEL,
  MENU_ROW,
  PAGER_BUTTON,
  PRIMARY_BUTTON,
  TABLE_FRAME,
  TOOLBAR_BUTTON,
  TOOLBAR_SEARCH,
} from "./ui/styles";

interface Column {
  key: string;
  label: string;
  render?: (value: any, item: any) => React.ReactNode;
}

interface MasterDataTableProps<T = any> {
  title: string;
  endpoint: string;
  columns: Column[];
  exportSchema?: ColumnSchema[];
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (id: string | number) => void;
  onImport?: (rows: Record<string, any>[]) => Promise<void>;
  onBulkEdit?: (
    ids: (string | number)[],
    field: string,
    value: string,
  ) => Promise<void>;
  onItemsChange?: (items: T[]) => void;
  refreshTrigger?: number;
  defaultSortKey?: string;
  defaultSortDir?: "asc" | "desc";
  renderExpandedRow?: (item: T) => React.ReactNode;
  searchPlaceholder?: string;
}

export default function MasterDataTable<T = any>({
  title,
  endpoint,
  columns,
  onEdit,
  onDelete,
  onBulkEdit,
  onItemsChange,
  refreshTrigger = 0,
  defaultSortKey,
  defaultSortDir = "asc",
  renderExpandedRow,
  searchPlaceholder = "Cari...",
}: MasterDataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [colsOpen, setColsOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkField, setBulkField] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const colsRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colsRef.current && !colsRef.current.contains(e.target as Node))
        setColsOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node))
        setSortOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("limit", limit.toString());
  if (sortKey) {
    params.append("orderBy", sortKey);
    params.append("orderDir", sortDir);
  }
  if (search) params.append("search", search);
  const separator = endpoint.includes("?") ? "&" : "?";
  const fetchUrl = `${endpoint}${separator}${params.toString()}`;

  const {
    data: swrResult,
    isLoading,
    isValidating,
  } = useSWR([fetchUrl, refreshTrigger], () => fetchFromBackend(fetchUrl), {
    keepPreviousData: true,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: 30_000,
  });

  const items: any[] = swrResult?.data ?? [];
  const total = swrResult?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const loading = isLoading || (isValidating && items.length === 0);

  useEffect(() => {
    onItemsChange?.(items as T[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swrResult]);

  function toggleCol(key: string) {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const visibleColumns = columns.filter((c) => !hiddenCols.has(c.key));

  const allPageIds = items.map((i) => i.id as string | number);
  const allPageSelected =
    allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const somePageSelected = allPageIds.some((id) => selectedIds.has(id));

  function toggleRow(id: string | number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllPage() {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function selectAll() {
    setSelectedIds(new Set(allPageIds));
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setMenuOpen(false);
  }

  const selectedCount = selectedIds.size;
  const selectedItem =
    selectedCount === 1 ? items.find((i) => selectedIds.has(i.id)) : null;

  return (
    <div className="flex w-full flex-col gap-3">
      {/* ── TOOLBAR ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex min-w-[180px] max-w-xs flex-1 items-center">
          <Search
            className="pointer-events-none absolute left-3 size-4 text-neutral-400"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            className={TOOLBAR_SEARCH}
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 text-neutral-400 hover:text-neutral-700"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Active sort chip */}
        {sortKey && (
          <button
            type="button"
            onClick={() => {
              setSortKey(defaultSortKey);
              setSortDir(defaultSortDir);
              setPage(1);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-neutral-100 px-3 text-xs font-medium text-neutral-800 hover:bg-neutral-200 sm:h-8"
          >
            {sortDir === "asc" ? (
              <ArrowUp className="size-3.5" />
            ) : (
              <ArrowDown className="size-3.5" />
            )}
            {columns.find((c) => c.key === sortKey)?.label ?? sortKey}
            <X className="ml-0.5 size-3 text-neutral-500" />
          </button>
        )}

        <div className="flex-1" />

        {/* Sort button */}
        <div ref={sortRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={sortOpen}
            onClick={() => setSortOpen((v) => !v)}
            className={cn(
              TOOLBAR_BUTTON,
              sortKey && "bg-neutral-100 text-neutral-900",
            )}
          >
            <ListFilter
              className="size-4 text-neutral-500"
              strokeWidth={1.75}
            />
            Urutkan
          </button>

          {sortOpen && (
            <div
              role="menu"
              className={cn(MENU_PANEL, "absolute right-0 mt-1.5 w-56")}
            >
              <div className="flex items-center justify-between">
                <p className={MENU_HEADING}>Urutkan</p>
                {sortKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setSortKey(defaultSortKey);
                      setSortDir(defaultSortDir);
                      setPage(1);
                      setSortOpen(false);
                    }}
                    className="px-2 text-xs font-medium text-neutral-500 hover:text-neutral-900"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Direction toggle */}
              <div className="flex gap-1 px-1 pb-1.5">
                {(["asc", "desc"] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => {
                      setSortDir(dir);
                      setPage(1);
                    }}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1 rounded-md border py-1 text-xs transition-colors",
                      sortDir === dir
                        ? "border-neutral-900 bg-neutral-900 font-medium text-white"
                        : "border-black/10 text-neutral-600 hover:bg-neutral-50",
                    )}
                  >
                    {dir === "asc" ? (
                      <>
                        <ArrowUp className="size-3" /> A → Z
                      </>
                    ) : (
                      <>
                        <ArrowDown className="size-3" /> Z → A
                      </>
                    )}
                  </button>
                ))}
              </div>

              <div className="mx-1 mb-1 border-t border-black/8" />

              {/* Column picker */}
              {columns.map((col) => (
                <button
                  key={col.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={sortKey === col.key}
                  onClick={() => {
                    setSortKey(col.key);
                    setPage(1);
                    setSortOpen(false);
                  }}
                  className={cn(
                    MENU_ROW,
                    "justify-between",
                    sortKey === col.key && "font-medium text-neutral-900",
                  )}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <Check className="size-4 shrink-0" strokeWidth={2} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Columns visibility button */}
        <div ref={colsRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={colsOpen}
            onClick={() => setColsOpen((v) => !v)}
            className={cn(
              TOOLBAR_BUTTON,
              hiddenCols.size > 0 && "bg-neutral-100 text-neutral-900",
            )}
          >
            <Columns3 className="size-4 text-neutral-500" strokeWidth={1.75} />
            Kolom
            {hiddenCols.size > 0 && (
              <span className="text-xs font-semibold tabular-nums text-neutral-500">
                {columns.length - hiddenCols.size}/{columns.length}
              </span>
            )}
          </button>

          {colsOpen && (
            <div
              role="menu"
              className={cn(MENU_PANEL, "absolute right-0 mt-1.5 w-52")}
            >
              <p className={MENU_HEADING}>Tampilkan Kolom</p>
              {columns.map((col) => (
                <label key={col.key} className={MENU_ROW}>
                  <input
                    type="checkbox"
                    checked={!hiddenCols.has(col.key)}
                    onChange={() => toggleCol(col.key)}
                    className="accent-neutral-900"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── TABLE ────────────────────────────────────────────────── */}
      <div className={cn(TABLE_FRAME, "flex w-full flex-col")}>
        <div ref={tableScrollRef} className="block w-full overflow-x-auto">
          <table className="w-full min-w-[1000px] table-fixed border-collapse text-sm">
            <thead>
              <tr className={HEAD_ROW}>
                <th className="sticky left-0 z-30 w-10 bg-neutral-50 p-2 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    className="accent-neutral-900"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el)
                        el.indeterminate = somePageSelected && !allPageSelected;
                    }}
                    onChange={toggleAllPage}
                  />
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(HEAD_CELL, "w-48")}
                  >
                    <span className="flex items-center gap-1.5">
                      {col.label}
                      {sortKey === col.key &&
                        (sortDir === "asc" ? (
                          <ArrowUp
                            className="size-3.5 text-neutral-900"
                            strokeWidth={1.75}
                          />
                        ) : (
                          <ArrowDown
                            className="size-3.5 text-neutral-900"
                            strokeWidth={1.75}
                          />
                        ))}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 1}
                    className="py-20 text-center"
                  >
                    <Loader2 className="mx-auto size-5 animate-spin text-neutral-400" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 1}
                    className="py-20 text-center text-sm text-neutral-400"
                  >
                    {search
                      ? `Tidak ada hasil untuk "${search}"`
                      : "No records found."}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const expandedContent = renderExpandedRow?.(item);
                  const isExpanded =
                    expandedContent !== null && expandedContent !== undefined;
                  const selected = selectedIds.has(item.id);

                  return (
                    <Fragment key={item.id}>
                      <tr
                        className={cn(
                          BODY_ROW,
                          "group transition-colors hover:bg-neutral-50",
                          selected && "bg-neutral-50",
                        )}
                      >
                        <td
                          className={cn(
                            "sticky left-0 z-10 w-10 p-2 text-center group-hover:bg-neutral-50",
                            selected ? "bg-neutral-50" : "bg-white",
                          )}
                        >
                          <input
                            type="checkbox"
                            aria-label="Select row"
                            className="accent-neutral-900"
                            checked={selected}
                            onChange={() => toggleRow(item.id)}
                          />
                        </td>
                        {visibleColumns.map((col) => (
                          <td
                            key={col.key}
                            className={cn(
                              CELL,
                              "max-w-[12rem] truncate whitespace-nowrap",
                            )}
                          >
                            {col.render
                              ? col.render(item[col.key], item)
                              : (item[col.key] ?? (
                                  <span className="text-neutral-300">—</span>
                                ))}
                          </td>
                        ))}
                      </tr>

                      {isExpanded && (
                        <tr
                          key={`${item.id}-expanded`}
                          className="border-b border-black/12"
                        >
                          <td className="sticky left-0 z-10 w-10 bg-neutral-50" />
                          <td colSpan={visibleColumns.length} className="p-0">
                            {expandedContent}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <nav
          aria-label="Pages"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-black/12 px-3 py-2 text-sm text-neutral-500"
        >
          <div className="flex items-center gap-3">
            <span className="tabular-nums">
              {total > 0
                ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} dari ${total}`
                : "0 data"}
            </span>
            <label className="flex items-center gap-2">
              Rows
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 cursor-pointer rounded-lg border border-black/10 bg-white px-2 text-sm text-neutral-900 sm:h-7"
              >
                {[20, 50, 100].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={PAGER_BUTTON}
            >
              <ChevronLeft className="size-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={PAGER_BUTTON}
            >
              <ChevronRight className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        </nav>
      </div>

      {/* ── BULK EDIT MODAL ──────────────────────────────────────── */}
      {bulkEditOpen && (
        <div className={DIALOG_SCRIM}>
          <div className={cn(DIALOG_PANEL, "max-w-sm p-5")}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900">
                Bulk Edit
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setBulkEditOpen(false)}
                className="grid size-8 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className={LABEL}>Field</span>
                <select
                  value={bulkField}
                  onChange={(e) => setBulkField(e.target.value)}
                  className={INPUT}
                >
                  {columns.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className={LABEL}>Value</span>
                <input
                  type="text"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  placeholder={
                    columns.find((c) => c.key === bulkField)?.label ?? ""
                  }
                  className={INPUT}
                />
              </label>

              <button
                type="button"
                disabled={!bulkValue.trim() || bulkLoading}
                onClick={async () => {
                  if (!bulkValue.trim()) return;
                  setBulkLoading(true);
                  try {
                    await onBulkEdit?.(
                      Array.from(selectedIds),
                      bulkField,
                      bulkValue.trim(),
                    );
                    setBulkEditOpen(false);
                    clearSelection();
                  } finally {
                    setBulkLoading(false);
                  }
                }}
                className={cn(PRIMARY_BUTTON, "mt-1 w-full")}
              >
                {bulkLoading && <Loader2 className="size-3.5 animate-spin" />}
                Update {selectedCount} Record{selectedCount > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SELECTION BAR ────────────────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-lg">
          <input
            type="checkbox"
            checked
            readOnly
            className="mr-1 accent-neutral-900"
          />
          <span className="whitespace-nowrap font-medium text-neutral-800">
            {selectedCount} row{selectedCount > 1 ? "s" : ""} selected
          </span>

          {/* Three dots menu */}
          <div ref={menuRef} className="relative ml-1">
            <button
              type="button"
              aria-label="Selection actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "grid size-7 place-items-center rounded-md text-neutral-700 hover:bg-neutral-100",
                menuOpen && "bg-neutral-100",
              )}
            >
              <MoreHorizontal className="size-4" strokeWidth={2} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className={cn(
                  MENU_PANEL,
                  "absolute bottom-full left-1/2 mb-2 min-w-[140px] -translate-x-1/2",
                )}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    if (selectedCount === 1 && selectedItem && onEdit) {
                      onEdit(selectedItem as T);
                      clearSelection();
                    } else if (selectedCount > 1) {
                      setBulkField(columns[0]?.key ?? "");
                      setBulkValue("");
                      setBulkEditOpen(true);
                    }
                  }}
                  disabled={selectedCount === 1 && !onEdit}
                  className={MENU_ROW}
                >
                  <Pencil className="size-4 shrink-0" strokeWidth={1.75} />{" "}
                  Update
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    selectedIds.forEach((id) => onDelete?.(id));
                    clearSelection();
                  }}
                  disabled={!onDelete}
                  className={cn(MENU_ROW, "text-red-600 hover:bg-red-50")}
                >
                  <Trash2 className="size-4 shrink-0" strokeWidth={1.75} />{" "}
                  Delete
                </button>
              </div>
            )}
          </div>

          <div className="mx-1 h-4 w-px bg-black/10" />

          <button
            type="button"
            onClick={selectAll}
            className="rounded-md px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          >
            Select all
          </button>

          <button
            type="button"
            aria-label="Clear selection"
            onClick={clearSelection}
            className="grid size-7 place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
