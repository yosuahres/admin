// components/MasterDataTable.tsx
"use client";

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  ArrowUp,
  ArrowDown,
  Columns3,
  X,
  ListFilter,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetchFromBackend } from "../utils/api";
import type { ColumnSchema } from "../utils/exportutils";

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
  onBulkEdit?: (ids: (string | number)[], field: string, value: string) => Promise<void>;
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
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
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
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) setColsOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("limit", limit.toString());
  if (sortKey) { params.append("orderBy", sortKey); params.append("orderDir", sortDir); }
  if (search) params.append("search", search);
  const separator = endpoint.includes("?") ? "&" : "?";
  const fetchUrl = `${endpoint}${separator}${params.toString()}`;

  const { data: swrResult, isLoading, isValidating } = useSWR(
    [fetchUrl, refreshTrigger],
    () => fetchFromBackend(fetchUrl),
    { keepPreviousData: true, revalidateOnFocus: false, revalidateIfStale: false, dedupingInterval: 30_000 },
  );

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
  const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const somePageSelected = allPageIds.some((id) => selectedIds.has(id));

  function toggleRow(id: string | number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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
  const selectedItem = selectedCount === 1
    ? items.find((i) => selectedIds.has(i.id))
    : null;


  return (
    <div className="flex flex-col gap-2 w-full">

      {/* ── TOOLBAR (outside the table card) ─────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Search */}
        <div className="relative flex items-center flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400"
          />
          {searchInput && (
            <button onClick={() => setSearchInput("")} className="absolute right-2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Active sort chip */}
        {sortKey && (
          <button
            onClick={() => { setSortKey(defaultSortKey); setSortDir(defaultSortDir); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {columns.find((c) => c.key === sortKey)?.label ?? sortKey}
            <X size={11} className="ml-0.5 text-blue-400" />
          </button>
        )}

        <div className="flex-1" />

        {/* Sort button */}
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg shadow-sm transition-colors ${
              sortKey
                ? "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
            }`}
          >
            <ListFilter size={14} />
            Urutkan
          </button>

          {sortOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1 mb-0.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Urutkan</p>
                {sortKey && (
                  <button
                    onClick={() => { setSortKey(defaultSortKey); setSortDir(defaultSortDir); setPage(1); setSortOpen(false); }}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Direction toggle */}
              <div className="flex gap-1 px-3 pb-2">
                <button
                  onClick={() => { setSortDir("asc"); setPage(1); }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs rounded-md border transition-colors ${
                    sortDir === "asc" ? "border-blue-400 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <ArrowUp size={11} /> A → Z
                </button>
                <button
                  onClick={() => { setSortDir("desc"); setPage(1); }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs rounded-md border transition-colors ${
                    sortDir === "desc" ? "border-blue-400 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <ArrowDown size={11} /> Z → A
                </button>
              </div>

              <div className="border-t border-gray-100 mb-1" />

              {/* Column picker */}
              {columns.map((col) => (
                <button
                  key={col.key}
                  onClick={() => { setSortKey(col.key); setPage(1); setSortOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors ${
                    sortKey === col.key
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Columns visibility button */}
        <div ref={colsRef} className="relative">
          <button
            onClick={() => setColsOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg shadow-sm transition-colors ${
              hiddenCols.size > 0
                ? "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
            }`}
          >
            <Columns3 size={14} />
            Kolom
            {hiddenCols.size > 0 && (
              <span className="text-xs font-semibold text-blue-600">
                {columns.length - hiddenCols.size}/{columns.length}
              </span>
            )}
          </button>

          {colsOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Tampilkan Kolom
              </p>
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!hiddenCols.has(col.key)}
                    onChange={() => toggleCol(col.key)}
                    className="rounded accent-black"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── TABLE CARD ───────────────────────────────────────────────── */}
      <div className="flex flex-col w-full border border-gray-200 bg-white rounded-xl overflow-hidden">
        <div className="relative">
          <div ref={tableScrollRef} className="block w-full overflow-x-auto">
            <table className="table-fixed min-w-[1000px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-100">
                  <th className="sticky left-0 z-30 w-10 border-b border-gray-100 bg-gray-100 p-2 text-center">
                    <input
                      type="checkbox"
                      className="rounded-sm accent-black"
                      checked={allPageSelected}
                      ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                      onChange={toggleAllPage}
                    />
                  </th>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      className="w-48 sticky top-0 z-20 border-b border-gray-100 px-4 py-3 text-left text-xs font-semibold text-black bg-gray-100"
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key && (
                          sortDir === "asc"
                            ? <ArrowUp size={12} className="text-blue-500" />
                            : <ArrowDown size={12} className="text-blue-500" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="py-20 text-center">
                      <Loader2 className="animate-spin mx-auto text-blue-500" size={20} />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length + 1}
                      className="py-20 text-center text-sm text-gray-400"
                    >
                      {search ? `Tidak ada hasil untuk "${search}"` : "No records found."}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const expandedContent = renderExpandedRow?.(item);
                    const isExpanded = expandedContent !== null && expandedContent !== undefined;

                    return (
                      <Fragment key={item.id}>
                        <tr className="group border-b border-gray-50 hover:bg-gray-100 transition-colors">
                          <td className="sticky left-0 z-10 w-10 border-r border-gray-100 p-2 text-center bg-white group-hover:bg-gray-100">
                            <input
                              type="checkbox"
                              className="accent-black"
                              checked={selectedIds.has(item.id)}
                              onChange={() => toggleRow(item.id)}
                            />
                          </td>
                          {visibleColumns.map((col) => (
                            <td
                              key={col.key}
                              className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap truncate max-w-[12rem]"
                            >
                              {col.render
                                ? col.render(item[col.key], item)
                                : item[col.key] ?? <span className="text-gray-300">—</span>}
                            </td>
                          ))}
                        </tr>

                        {isExpanded && (
                          <tr key={`${item.id}-expanded`}>
                            <td className="sticky left-0 z-10 bg-gray-100 border-r border-gray-100 w-10" />
                            <td
                              colSpan={visibleColumns.length}
                              className="p-0 border-b border-gray-100"
                            >
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
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {total > 0
                ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} dari ${total}`
                : "0 data"}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded transition-colors
                  enabled:text-gray-600 enabled:border-gray-200 enabled:hover:bg-gray-100
                  disabled:text-gray-300 disabled:border-gray-100 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded transition-colors
                  enabled:text-gray-600 enabled:border-gray-200 enabled:hover:bg-gray-100
                  disabled:text-gray-300 disabled:border-gray-100 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {[20, 50, 100].map((v) => (
              <button
                key={v}
                onClick={() => { setLimit(v); setPage(1); }}
                className={`px-3 py-1.5 text-sm border ${
                  limit === v
                    ? "rounded-lg border-gray-200 font-semibold text-black bg-white shadow-sm"
                    : "rounded border-transparent text-gray-500 hover:bg-gray-100"
                }`}
              >
                {limit === v ? `${v} rows` : v}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* ── BULK EDIT MODAL ──────────────────────────────────────────── */}
      {bulkEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Bulk Edit</h2>
              <button
                onClick={() => setBulkEditOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Field</label>
                <select
                  value={bulkField}
                  onChange={(e) => setBulkField(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                >
                  {columns.map((col) => (
                    <option key={col.key} value={col.key}>{col.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Value</label>
                <input
                  type="text"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  placeholder={columns.find((c) => c.key === bulkField)?.label ?? ""}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400"
                />
              </div>

              <button
                disabled={!bulkValue.trim() || bulkLoading}
                onClick={async () => {
                  if (!bulkValue.trim()) return;
                  setBulkLoading(true);
                  try {
                    await onBulkEdit?.(Array.from(selectedIds), bulkField, bulkValue.trim());
                    setBulkEditOpen(false);
                    clearSelection();
                  } finally {
                    setBulkLoading(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {bulkLoading && <Loader2 size={14} className="animate-spin" />}
                Update {selectedCount} Record{selectedCount > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SELECTION BAR ────────────────────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-2xl shadow-xl text-sm">
          <input type="checkbox" checked readOnly className="accent-black mr-1" />
          <span className="text-gray-700 font-medium whitespace-nowrap">
            {selectedCount} row{selectedCount > 1 ? "s" : ""} selected
          </span>

          {/* Three dots menu */}
          <div ref={menuRef} className="relative ml-1">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[120px]">
                <button
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Pencil size={14} /> Update
                </button>
                <button
                  onClick={() => {
                    selectedIds.forEach((id) => onDelete?.(id));
                    clearSelection();
                  }}
                  disabled={!onDelete}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          <button
            onClick={selectAll}
            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Select all
          </button>

          <button
            onClick={clearSelection}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
