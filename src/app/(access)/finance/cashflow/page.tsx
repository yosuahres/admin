"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, ChevronDown, Search, X,
  ArrowUp, ArrowDown, ListFilter,
} from "lucide-react";
import { CalendarRangePicker } from "@/components/CalendarRangePicker";
import { useSetPageActions } from "@/contexts/page-actions";
import { supabase } from "@/utils/api";
import type { Database } from "@/types/database.types";

type TxRow = Database["public"]["Views"]["cashflow_transactions_view"]["Row"];
type TypeFilter = "all" | "in" | "out";

const SORT_COLS = [
  { key: "transaction_date", label: "Tanggal" },
  { key: "description",      label: "Deskripsi" },
  { key: "category_name",    label: "Kategori" },
  { key: "amount",           label: "Jumlah" },
];

function displayRupiah(n: number) {
  return "Rp " + new Intl.NumberFormat("id-ID").format(n);
}

export default function CashflowPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState("transaction_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [sortOpen, setSortOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("cashflow_transactions_view")
      .select("*", { count: "exact" })
      .order(sortKey, { ascending: sortDir === "asc" });

    if (typeFilter !== "all") q = q.eq("type", typeFilter);
    if (search) q = q.ilike("description", `%${search}%`);
    if (dateFrom) q = q.gte("transaction_date", dateFrom);
    if (dateTo) q = q.lte("transaction_date", dateTo);

    q = q.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await q;
    setTransactions((data as TxRow[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, limit, search, typeFilter, dateFrom, dateTo, sortKey, sortDir]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const hasActiveFilter = search || typeFilter !== "all" || dateFrom || dateTo;
  const isDefaultSort = sortKey === "transaction_date" && sortDir === "desc";
  const totalPages = Math.ceil(total / limit) || 1;

  function resetFilters() {
    setSearch("");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  useSetPageActions({
    addLabel: "Tambah Transaksi",
    onAdd: () => router.push("/finance/cashflow/add"),
  });

  return (
    <div className="p-4 flex flex-col gap-3">

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex items-center flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari deskripsi..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        <div ref={typeRef} className="relative">
          <button
            onClick={() => setTypeOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg shadow-sm transition-colors ${
              typeFilter !== "all"
                ? "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
            }`}
          >
            {typeFilter === "all" ? "Semua" : typeFilter === "in" ? "Pemasukan" : "Pengeluaran"}
            <ChevronDown size={13} />
          </button>
          {typeOpen && (
            <div className="absolute left-0 mt-1.5 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
              {(["all", "in", "out"] as TypeFilter[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTypeFilter(t); setPage(1); setTypeOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                    typeFilter === t ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {t === "all" ? "Semua" : t === "in" ? "Pemasukan" : "Pengeluaran"}
                </button>
              ))}
            </div>
          )}
        </div>

        <CalendarRangePicker
          from={dateFrom || undefined}
          to={dateTo || undefined}
          label="Tanggal"
          onChange={(f, t) => { setDateFrom(f ?? ""); setDateTo(t ?? ""); setPage(1); }}
        />

        {hasActiveFilter && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg bg-white shadow-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X size={13} /> Reset
          </button>
        )}

        {!isDefaultSort && (
          <button
            onClick={() => { setSortKey("transaction_date"); setSortDir("desc"); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {SORT_COLS.find((c) => c.key === sortKey)?.label}
            <X size={11} className="ml-0.5 text-blue-400" />
          </button>
        )}

        <div className="flex-1" />

        <div ref={sortRef} className="relative">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg shadow-sm transition-colors ${
              !isDefaultSort
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
                {!isDefaultSort && (
                  <button
                    onClick={() => { setSortKey("transaction_date"); setSortDir("desc"); setPage(1); setSortOpen(false); }}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Reset
                  </button>
                )}
              </div>
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
              {SORT_COLS.map((col) => (
                <button
                  key={col.key}
                  onClick={() => { setSortKey(col.key); setPage(1); setSortOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors ${
                    sortKey === col.key ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex flex-col w-full border border-gray-200 bg-white rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-3 text-xs font-semibold text-black text-left">Tanggal</th>
                <th className="px-4 py-3 text-xs font-semibold text-black text-left">Deskripsi</th>
                <th className="px-4 py-3 text-xs font-semibold text-black text-left">Kategori</th>
                <th className="px-4 py-3 text-xs font-semibold text-black text-left">Tipe</th>
                <th className="px-4 py-3 text-xs font-semibold text-black text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, k) => (
                  <tr key={k} className="border-b border-gray-50">
                    {[1,2,3,4,5].map((c) => (
                      <td key={c} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                    Belum ada transaksi.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/finance/cashflow/edit/${t.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {t.transaction_date
                        ? new Date(t.transaction_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{t.description ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      {t.category_name
                        ? <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md">{t.category_name}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                        t.type === "in" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                      }`}>
                        {t.type === "in" ? "Masuk" : "Keluar"}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-bold ${t.type === "in" ? "text-green-600" : "text-red-500"}`}>
                      {t.type === "in" ? "+" : "−"}{displayRupiah(Number(t.amount ?? 0))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
    </div>
  );
}
