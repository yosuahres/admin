"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { utils, writeFile } from "xlsx-js-style";
import { CalendarRangePicker } from "@/components/CalendarRangePicker";
import { useSetPageActions } from "@/contexts/page-actions";
import type { Database } from "@/types/database.types";
import { supabase } from "@/utils/api";

type TitheRow = Database["public"]["Tables"]["tithes"]["Row"];
type MethodFilter = "all" | "tunai" | "transfer" | "qris";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const METHOD_LABEL: Record<string, string> = {
  tunai: "Tunai",
  transfer: "Transfer",
  qris: "QRIS",
};

const SORT_COLS = [
  { key: "transaction_date", label: "Tanggal" },
  { key: "giver_name", label: "Nama" },
  { key: "amount", label: "Jumlah" },
];

function displayRupiah(n: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
}

function periodeText(month: number | null, year: number | null) {
  if (!month) return "—";
  return `${MONTHS_SHORT[month - 1]} ${year ?? ""}`.trim();
}

function fmtDate(d: string | null) {
  return d
    ? new Date(d).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
}

export default function PerpuluhanPage() {
  const router = useRouter();
  const [rows, setRows] = useState<TitheRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState("transaction_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [sortOpen, setSortOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const methodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node))
        setSortOpen(false);
      if (methodRef.current && !methodRef.current.contains(e.target as Node))
        setMethodOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /** Build a query with all active filters applied (no pagination range). */
  const buildFilteredQuery = useCallback(
    (withCount: boolean) => {
      let q = supabase
        .from("tithes")
        .select("*", withCount ? { count: "exact" } : undefined)
        .order(sortKey, { ascending: sortDir === "asc" });

      if (methodFilter !== "all") q = q.eq("payment_method", methodFilter);
      if (search) q = q.ilike("giver_name", `%${search}%`);
      if (dateFrom) q = q.gte("transaction_date", dateFrom);
      if (dateTo) q = q.lte("transaction_date", dateTo);
      return q;
    },
    [search, methodFilter, dateFrom, dateTo, sortKey, sortDir],
  );

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const q = buildFilteredQuery(true).range(
      (page - 1) * limit,
      page * limit - 1,
    );
    const { data, count } = await q;
    setRows((data as TitheRow[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [buildFilteredQuery, page, limit]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  /* ── Export: all matching rows (ignores pagination), styled sheet ── */
  const exportReport = useCallback(async () => {
    const { data } = await buildFilteredQuery(false);
    const list = (data as TitheRow[]) ?? [];

    const header = [
      "No",
      "Tanggal",
      "Nama",
      "Periode",
      "Metode",
      "Jumlah",
    ];
    const body = list.map((t, i) => [
      i + 1,
      fmtDate(t.transaction_date),
      t.giver_name,
      periodeText(t.period_month, t.period_year),
      METHOD_LABEL[t.payment_method] ?? t.payment_method,
      Number(t.amount ?? 0),
    ]);
    const grandTotal = list.reduce((s, t) => s + Number(t.amount ?? 0), 0);

    const aoa: (string | number)[][] = [
      ["LAPORAN PERPULUHAN IFGF BATAM"],
      [
        `Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`,
      ],
      [],
      header,
      ...body,
      ["", "", "", "", "", "TOTAL", grandTotal],
    ];

    const ws = utils.aoa_to_sheet(aoa);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 14 },
      { wch: 28 },
      { wch: 24 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
    ];
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    ];

    const BORDER = { style: "thin", color: { rgb: "D1D5DB" } };
    const allBorder = {
      top: BORDER,
      bottom: BORDER,
      left: BORDER,
      right: BORDER,
    };
    const numFmt = '#,##0;[Red](#,##0);"-"';
    const setS = (r: number, c: number, s: any) => {
      const ref = utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: "s", v: "" };
      ws[ref].s = s;
    };

    setS(0, 0, {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: "center" },
    });
    setS(1, 0, {
      font: { sz: 10, color: { rgb: "6B7280" } },
      alignment: { horizontal: "center" },
    });

    const headerRowIdx = 3;
    for (let c = 0; c < header.length; c++) {
      setS(headerRowIdx, c, {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "1E3A8A" } },
        alignment: {
          horizontal: c === 6 ? "right" : "left",
          vertical: "center",
        },
        border: allBorder,
      });
    }

    for (let i = 0; i < body.length; i++) {
      const r = headerRowIdx + 1 + i;
      for (let c = 0; c < header.length; c++) {
        const cell = ws[utils.encode_cell({ r, c })];
        if (c === 6 && cell && typeof cell.v === "number") cell.z = numFmt;
        setS(r, c, {
          alignment: {
            horizontal: c === 0 ? "center" : c === 6 ? "right" : "left",
          },
          border: allBorder,
        });
      }
    }

    const totalRowIdx = headerRowIdx + 1 + body.length;
    const totalCell = ws[utils.encode_cell({ r: totalRowIdx, c: 6 })];
    if (totalCell) totalCell.z = numFmt;
    for (let c = 0; c < header.length; c++) {
      setS(totalRowIdx, c, {
        font: { bold: true },
        fill: { patternType: "solid", fgColor: { rgb: "DBEAFE" } },
        alignment: { horizontal: c >= 5 ? "right" : "left" },
        border: allBorder,
      });
    }

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Perpuluhan");
    writeFile(wb, `Perpuluhan_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [buildFilteredQuery]);

  const exportRef = useRef(exportReport);
  exportRef.current = exportReport;

  useSetPageActions({
    addLabel: "Input Perpuluhan",
    onAdd: () => router.push("/finance/perpuluhan/add"),
    onExport: () => exportRef.current(),
  });

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus catatan perpuluhan ini?")) return;
    setDeletingId(id);
    const { error } = await supabase.from("tithes").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      window.alert("Gagal menghapus: " + error.message);
      return;
    }
    // If we just removed the last row on the page, step back a page.
    if (rows.length === 1 && page > 1) setPage((p) => p - 1);
    else fetchRows();
  }

  const hasActiveFilter =
    search || methodFilter !== "all" || dateFrom || dateTo;
  const isDefaultSort = sortKey === "transaction_date" && sortDir === "desc";
  const totalPages = Math.ceil(total / limit) || 1;

  function resetFilters() {
    setSearch("");
    setMethodFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex items-center flex-1 min-w-[180px] max-w-xs">
          <Search
            size={14}
            className="absolute left-2.5 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Cari nama / keluarga..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute right-2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div ref={methodRef} className="relative">
          <button
            type="button"
            onClick={() => setMethodOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg shadow-sm transition-colors ${
              methodFilter !== "all"
                ? "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
            }`}
          >
            {methodFilter === "all"
              ? "Semua Metode"
              : METHOD_LABEL[methodFilter]}
            <ChevronDown size={13} />
          </button>
          {methodOpen && (
            <div className="absolute left-0 mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
              {(["all", "tunai", "transfer", "qris"] as MethodFilter[]).map(
                (m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => {
                      setMethodFilter(m);
                      setPage(1);
                      setMethodOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                      methodFilter === m
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {m === "all" ? "Semua Metode" : METHOD_LABEL[m]}
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        <CalendarRangePicker
          from={dateFrom || undefined}
          to={dateTo || undefined}
          label="Tanggal"
          onChange={(f, t) => {
            setDateFrom(f ?? "");
            setDateTo(t ?? "");
            setPage(1);
          }}
        />

        {hasActiveFilter && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg bg-white shadow-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X size={13} /> Reset
          </button>
        )}

        <div className="flex-1" />

        <div ref={sortRef} className="relative">
          <button
            type="button"
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
              <div className="flex gap-1 px-3 pb-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSortDir("asc");
                    setPage(1);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs rounded-md border transition-colors ${
                    sortDir === "asc"
                      ? "border-blue-400 bg-blue-50 text-blue-700 font-medium"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <ArrowUp size={11} /> A → Z
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortDir("desc");
                    setPage(1);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs rounded-md border transition-colors ${
                    sortDir === "desc"
                      ? "border-blue-400 bg-blue-50 text-blue-700 font-medium"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <ArrowDown size={11} /> Z → A
                </button>
              </div>
              <div className="border-t border-gray-100 mb-1" />
              {SORT_COLS.map((col) => (
                <button
                  type="button"
                  key={col.key}
                  onClick={() => {
                    setSortKey(col.key);
                    setPage(1);
                    setSortOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors ${
                    sortKey === col.key
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {col.label}
                  {sortKey === col.key &&
                    (sortDir === "asc" ? (
                      <ArrowUp size={12} />
                    ) : (
                      <ArrowDown size={12} />
                    ))}
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
                <th className="px-4 py-3 text-xs font-semibold text-black text-left">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-black text-left">
                  Nama
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-black text-left">
                  Periode
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-black text-left">
                  Metode
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-black text-right">
                  Jumlah
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-black text-right" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, k) => (
                  <tr key={k} className="border-b border-gray-50">
                    {[1, 2, 3, 4, 5, 6].map((c) => (
                      <td key={c} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-gray-400 text-sm"
                  >
                    Belum ada catatan perpuluhan.
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {fmtDate(t.transaction_date)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {t.giver_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {periodeText(t.period_month, t.period_year)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md">
                        {METHOD_LABEL[t.payment_method] ?? t.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-green-600 whitespace-nowrap">
                      {displayRupiah(Number(t.amount ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        title="Hapus"
                        className="text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
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
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded transition-colors
                  enabled:text-gray-600 enabled:border-gray-200 enabled:hover:bg-gray-100
                  disabled:text-gray-300 disabled:border-gray-100 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
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
                type="button"
                key={v}
                onClick={() => {
                  setLimit(v);
                  setPage(1);
                }}
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
