"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { utils, writeFile } from "xlsx-js-style";
import { supabase } from "@/utils/api";
import { useSetPageActions } from "@/contexts/page-actions";
import type { Database } from "@/types/database.types";

/* ── Types ─────────────────────────────────────────────────────────── */

type Category = { id: string; name: string; type: string };
type TxViewRow = Database["public"]["Views"]["cashflow_transactions_view"]["Row"];

// cashflow_budgets is not yet in the generated Database types.
// Regenerate src/types/database.types.ts after creating the table to drop the cast below.
type BudgetRow = { category_id: string; year: number; month: number | null; planned_amount: number };

/** The six comparison values on every row. */
type RowValues = {
  monthBudget: number;   // BULANAN – anggaran (tahun ini, bulan terpilih)
  monthActual: number;   // BULANAN – aktual (tahun ini, bulan terpilih)
  monthActualLast: number; // BULANAN – aktual (tahun lalu, bulan sama)
  ytdBudget: number;     // PERIODE – anggaran (tahun ini, Jan..bulan)
  ytdActual: number;     // PERIODE – aktual (tahun ini, Jan..bulan)
  ytdActualLast: number; // PERIODE – aktual (tahun lalu, Jan..bulan)
};

const EMPTY: RowValues = {
  monthBudget: 0, monthActual: 0, monthActualLast: 0,
  ytdBudget: 0, ytdActual: 0, ytdActualLast: 0,
};

const MONTHS_ID = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/** Accounting-style number: blank-dash for 0, red parentheses for negatives. */
function fmt(n: number) {
  if (!n) return <span className="text-gray-300">–</span>;
  const neg = n < 0;
  const text = new Intl.NumberFormat("id-ID").format(Math.abs(Math.round(n)));
  return neg ? <span className="text-red-600">({text})</span> : <span>{text}</span>;
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function LaporanKeuanganPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1–12
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [txns, setTxns] = useState<Pick<TxViewRow, "category_id" | "amount" | "transaction_date">[]>([]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role === "finance" || role === "admin") setAuthorized(true);
    else window.location.href = "/login";
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const lastYear = year - 1;
    // We need this year Jan..month AND last year Jan..month.
    const from = `${lastYear}-01-01`;
    const to = `${year}-${String(month).padStart(2, "0")}-31`;

    const [
      { data: cats },
      { data: budgetRows },
      { data: txRows },
    ] = await Promise.all([
      supabase.from("cashflow_categories").select("id, name, type").order("name"),
      (supabase.from("cashflow_budgets" as never) as any)
        .select("category_id, year, month, planned_amount")
        .eq("year", year),
      supabase
        .from("cashflow_transactions_view")
        .select("category_id, amount, transaction_date")
        .gte("transaction_date", from)
        .lte("transaction_date", to),
    ]);

    if (cats) setCategories(cats);
    setBudgets((budgetRows as BudgetRow[]) ?? []);
    setTxns((txRows as Pick<TxViewRow, "category_id" | "amount" | "transaction_date">[]) ?? []);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    if (authorized) fetchData();
  }, [authorized, fetchData]);

  /** category_id -> the six computed values for the selected period. */
  const valuesByCat = useMemo(() => {
    const map: Record<string, RowValues> = {};
    const ensure = (id: string) => (map[id] ??= { ...EMPTY });

    // Budgets (only current-year monthly rows contribute)
    for (const b of budgets) {
      if (b.month == null) continue; // yearly budgets aren't split by month here
      const v = ensure(b.category_id);
      if (b.month === month) v.monthBudget += Number(b.planned_amount ?? 0);
      if (b.month <= month) v.ytdBudget += Number(b.planned_amount ?? 0);
    }

    // Actuals
    for (const t of txns) {
      const cid = t.category_id ?? "__none__";
      const ts = t.transaction_date ?? "";
      const ty = Number(ts.slice(0, 4));
      const tm = Number(ts.slice(5, 7));
      const amt = Number(t.amount ?? 0);
      const v = ensure(cid);
      if (ty === year) {
        if (tm === month) v.monthActual += amt;
        if (tm <= month) v.ytdActual += amt;
      } else if (ty === year - 1) {
        if (tm === month) v.monthActualLast += amt;
        if (tm <= month) v.ytdActualLast += amt;
      }
    }
    return map;
  }, [budgets, txns, year, month]);

  const incomeCats = categories.filter((c) => c.type === "in");
  const expenseCats = categories.filter((c) => c.type === "out");

  const sumSection = (cats: Category[]): RowValues => {
    const total = { ...EMPTY };
    for (const c of cats) {
      const v = valuesByCat[c.id];
      if (!v) continue;
      total.monthBudget += v.monthBudget;
      total.monthActual += v.monthActual;
      total.monthActualLast += v.monthActualLast;
      total.ytdBudget += v.ytdBudget;
      total.ytdActual += v.ytdActual;
      total.ytdActualLast += v.ytdActualLast;
    }
    return total;
  };
  const incomeTotal = sumSection(incomeCats);
  const expenseTotal = sumSection(expenseCats);
  const deviasi: RowValues = {
    monthBudget: incomeTotal.monthBudget - expenseTotal.monthBudget,
    monthActual: incomeTotal.monthActual - expenseTotal.monthActual,
    monthActualLast: incomeTotal.monthActualLast - expenseTotal.monthActualLast,
    ytdBudget: incomeTotal.ytdBudget - expenseTotal.ytdBudget,
    ytdActual: incomeTotal.ytdActual - expenseTotal.ytdActual,
    ytdActualLast: incomeTotal.ytdActualLast - expenseTotal.ytdActualLast,
  };

  /* ── Export to Excel (styled, faithful to the on-screen layout) ─── */
  const exportReport = useCallback(() => {
    const yy = String(year).slice(2);
    const yyLast = String(year - 1).slice(2);
    const mon = MONTHS_SHORT[month - 1];
    const monFull = MONTHS_ID[month - 1];
    const numFmt = '#,##0;[Red](#,##0);"-"';

    const dataRow = (no: number | string, label: string, v: RowValues) =>
      [no, label, v.monthBudget, v.monthActual, v.monthActualLast, v.ytdBudget, v.ytdActual, v.ytdActualLast];

    const aoa: (string | number)[][] = [
      ["LAPORAN KEUANGAN IFGF BATAM"],
      [`PERIODE TAHUN ${year} BULAN ${monFull}`],
      [],
      ["NO", "KETERANGAN", "BULANAN", "", "", `PERIODE (JAN – ${monFull})`, "", ""],
      ["", "",
        `${mon}-${yy}\r\nANGGARAN`, `${mon}-${yy}\r\nAKTUAL`, `${mon}-${yyLast}\r\nAKTUAL`,
        `THN ${year}\r\nANGGARAN`, `THN ${year}\r\nAKTUAL`, `THN ${year - 1}\r\nAKTUAL`],
      ["A", "PEMASUKAN", "", "", "", "", "", ""],
      ...incomeCats.map((c, i) => dataRow(i + 1, c.name, valuesByCat[c.id] ?? EMPTY)),
      dataRow("", "TOTAL PEMASUKAN", incomeTotal),
      ["B", "PENGELUARAN", "", "", "", "", "", ""],
      ...expenseCats.map((c, i) => dataRow(i + 1, c.name, valuesByCat[c.id] ?? EMPTY)),
      dataRow("", "TOTAL PENGELUARAN", expenseTotal),
      dataRow("", "DEVIASI PEMASUKAN / PENGELUARAN", deviasi),
    ];

    // Row-type indices
    const rGroup = 3, rSub = 4, rSecA = 5;
    const rTotInc = rSecA + 1 + incomeCats.length;
    const rSecB = rTotInc + 1;
    const rTotExp = rSecB + 1 + expenseCats.length;
    const rDev = rTotExp + 1;

    const ws = utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 5 }, { wch: 36 }, ...Array(6).fill({ wch: 15 })];
    ws["!rows"] = [];
    ws["!rows"][rSub] = { hpt: 30 }; // taller sub-header for the two-line labels
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // period
      { s: { r: rGroup, c: 0 }, e: { r: rSub, c: 0 } }, // NO
      { s: { r: rGroup, c: 1 }, e: { r: rSub, c: 1 } }, // KETERANGAN
      { s: { r: rGroup, c: 2 }, e: { r: rGroup, c: 4 } }, // BULANAN
      { s: { r: rGroup, c: 5 }, e: { r: rGroup, c: 7 } }, // PERIODE
    ];

    // ── Style helpers ──────────────────────────────────────────────
    const BORDER = { style: "thin", color: { rgb: "D1D5DB" } };
    const allBorder = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
    const fill = (rgb: string) => ({ patternType: "solid", fgColor: { rgb } });
    const setS = (r: number, c: number, s: any) => {
      const ref = utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: "s", v: "" };
      ws[ref].s = s;
    };

    // Title + period
    setS(0, 0, { font: { bold: true, sz: 14 }, alignment: { horizontal: "center" } });
    setS(1, 0, { font: { bold: true, sz: 11, color: { rgb: "6B7280" } }, alignment: { horizontal: "center" } });

    // Group header (row rGroup)
    const centerMid = { horizontal: "center", vertical: "center", wrapText: true };
    for (let c = 0; c <= 7; c++) {
      const isBulanan = c >= 2 && c <= 4;
      const isPeriode = c >= 5;
      setS(rGroup, c, {
        font: { bold: true, color: { rgb: isBulanan ? "FFFFFF" : "374151" } },
        fill: fill(isBulanan ? "F59E0B" : "E5E7EB"),
        alignment: centerMid,
        border: allBorder,
      });
    }

    // Sub header (row rSub)
    for (let c = 2; c <= 7; c++) {
      const isBulanan = c <= 4;
      setS(rSub, c, {
        font: { bold: true, sz: 10, color: { rgb: c === 3 || c === 6 ? "1D4ED8" : "374151" } },
        fill: fill(isBulanan ? "FEF3C7" : "F3F4F6"),
        alignment: centerMid,
        border: allBorder,
      });
    }

    // Section header rows (blue)
    for (const r of [rSecA, rSecB]) {
      for (let c = 0; c <= 7; c++) {
        setS(r, c, {
          font: { bold: true, color: { rgb: "1D4ED8" } },
          fill: fill("DBEAFE"),
          alignment: { horizontal: c === 0 ? "center" : "left" },
          border: allBorder,
        });
      }
    }

    // Data + total + deviasi rows
    const styleValueRow = (r: number, opts: { bold?: boolean; rowFill?: string }) => {
      for (let c = 0; c <= 7; c++) {
        const numeric = c >= 2;
        const anggaranCol = c === 2 || c === 5;
        const bg = opts.rowFill ?? (anggaranCol ? "FFFBEB" : undefined);
        const cell = ws[utils.encode_cell({ r, c })];
        if (numeric && cell && typeof cell.v === "number") cell.z = numFmt;
        setS(r, c, {
          font: { bold: !!opts.bold, color: { rgb: "111827" } },
          ...(bg ? { fill: fill(bg) } : {}),
          alignment: { horizontal: c === 0 ? "center" : c === 1 ? "left" : "right" },
          border: allBorder,
        });
      }
    };

    for (let r = rSecA + 1; r < rTotInc; r++) styleValueRow(r, {});
    styleValueRow(rTotInc, { bold: true, rowFill: "E5E7EB" });
    for (let r = rSecB + 1; r < rTotExp; r++) styleValueRow(r, {});
    styleValueRow(rTotExp, { bold: true, rowFill: "E5E7EB" });
    styleValueRow(rDev, { bold: true, rowFill: "FDE68A" });

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Laporan");
    writeFile(wb, `Laporan_Keuangan_${monFull}_${year}.xlsx`);
  }, [year, month, incomeCats, expenseCats, valuesByCat, incomeTotal, expenseTotal, deviasi]);

  const exportRef = useRef(exportReport);
  exportRef.current = exportReport;
  useSetPageActions({ onExport: () => exportRef.current() });

  if (!authorized) return null;

  const yy = String(year).slice(2);
  const yyLast = String(year - 1).slice(2);
  const monShort = MONTHS_SHORT[month - 1];

  const stepMonth = (dir: -1 | 1) => {
    setMonth((m) => {
      const next = m + dir;
      if (next < 1) { setYear((y) => y - 1); return 12; }
      if (next > 12) { setYear((y) => y + 1); return 1; }
      return next;
    });
  };

  /** One data row: label + six cells. */
  const Row = ({ no, label, v, variant = "normal" }: {
    no?: number; label: string; v: RowValues;
    variant?: "normal" | "total" | "deviasi";
  }) => {
    const base =
      variant === "total" ? "bg-gray-100 font-semibold text-gray-900"
      : variant === "deviasi" ? "bg-amber-50 font-bold text-gray-900"
      : "hover:bg-gray-50";
    return (
      <tr className={`border-b border-gray-100 ${base}`}>
        <td className="px-2 py-1.5 text-center text-gray-400 text-xs w-8">{no ?? ""}</td>
        <td className="px-3 py-1.5 text-left whitespace-nowrap">{label}</td>
        <td className="px-3 py-1.5 text-right tabular-nums bg-amber-50/40">{fmt(v.monthBudget)}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{fmt(v.monthActual)}</td>
        <td className="px-3 py-1.5 text-right tabular-nums text-gray-500">{fmt(v.monthActualLast)}</td>
        <td className="px-3 py-1.5 text-right tabular-nums bg-amber-50/40">{fmt(v.ytdBudget)}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{fmt(v.ytdActual)}</td>
        <td className="px-3 py-1.5 text-right tabular-nums text-gray-500">{fmt(v.ytdActualLast)}</td>
      </tr>
    );
  };

  const SectionHeader = ({ letter, title }: { letter: string; title: string }) => (
    <tr className="bg-blue-50">
      <td className="px-2 py-1.5 text-center font-bold text-blue-700">{letter}</td>
      <td className="px-3 py-1.5 font-bold text-blue-700 uppercase tracking-wide text-xs" colSpan={7}>
        {title}
      </td>
    </tr>
  );

  return (
    <div className="p-4 flex flex-col gap-3">

      {/* Title + period filter */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-gray-900 uppercase">Laporan Keuangan IFGF Batam</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Periode Tahun {year} — Bulan {MONTHS_ID[month - 1]}
          </p>
        </div>

        <div ref={pickerRef} className="relative">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white shadow-sm">
            <button onClick={() => stepMonth(-1)} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-l-lg">
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-gray-700 min-w-[130px] justify-center"
            >
              <CalendarDays size={13} className="text-gray-400" />
              {MONTHS_ID[month - 1].charAt(0) + MONTHS_ID[month - 1].slice(1).toLowerCase()} {year}
              <ChevronDown size={13} className="text-gray-400" />
            </button>
            <button onClick={() => stepMonth(1)} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-r-lg">
              <ChevronRight size={16} />
            </button>
          </div>

          {pickerOpen && (
            <div className="absolute right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-3 w-64">
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setYear((y) => y - 1)} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-semibold text-gray-700">{year}</span>
                <button onClick={() => setYear((y) => y + 1)} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MONTHS_SHORT.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => { setMonth(i + 1); setPickerOpen(false); }}
                    className={`text-xs py-1.5 rounded-md transition-colors ${
                      month === i + 1 ? "bg-blue-500 text-white font-medium" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              {/* Group header */}
              <tr>
                <th rowSpan={2} className="px-2 py-2 text-xs font-bold text-gray-700 border-b border-r border-gray-200 bg-gray-50 w-8">NO</th>
                <th rowSpan={2} className="px-3 py-2 text-left text-xs font-bold text-gray-700 border-b border-r border-gray-200 bg-gray-50">KETERANGAN</th>
                <th colSpan={3} className="px-3 py-1.5 text-center text-xs font-bold text-amber-800 border-b border-r border-gray-200 bg-amber-100">BULANAN</th>
                <th colSpan={3} className="px-3 py-1.5 text-center text-xs font-bold text-gray-700 border-b border-gray-200 bg-gray-100">PERIODE (JAN – {MONTHS_ID[month - 1]})</th>
              </tr>
              {/* Sub header */}
              <tr className="text-[11px]">
                <th className="px-3 py-1.5 text-right font-semibold text-gray-700 border-b border-gray-200 bg-amber-50">{monShort}-{yy}<br /><span className="text-gray-500">ANGGARAN</span></th>
                <th className="px-3 py-1.5 text-right font-semibold text-blue-700 border-b border-gray-200 bg-amber-50">{monShort}-{yy}<br /><span className="text-blue-600">AKTUAL</span></th>
                <th className="px-3 py-1.5 text-right font-semibold text-gray-600 border-b border-r border-gray-200 bg-amber-50">{monShort}-{yyLast}<br /><span className="text-gray-500">AKTUAL</span></th>
                <th className="px-3 py-1.5 text-right font-semibold text-gray-700 border-b border-gray-200 bg-gray-50">THN {year}<br /><span className="text-gray-500">ANGGARAN</span></th>
                <th className="px-3 py-1.5 text-right font-semibold text-blue-700 border-b border-gray-200 bg-gray-50">THN {year}<br /><span className="text-blue-600">AKTUAL</span></th>
                <th className="px-3 py-1.5 text-right font-semibold text-gray-600 border-b border-gray-200 bg-gray-50">THN {year - 1}<br /><span className="text-gray-500">AKTUAL</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center text-gray-400 text-sm">Memuat laporan…</td></tr>
              ) : (
                <>
                  {/* PEMASUKAN */}
                  <SectionHeader letter="A" title="Pemasukan" />
                  {incomeCats.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-3 text-center text-gray-400 text-xs">Belum ada kategori pemasukan.</td></tr>
                  ) : (
                    incomeCats.map((c, i) => (
                      <Row key={c.id} no={i + 1} label={c.name} v={valuesByCat[c.id] ?? EMPTY} />
                    ))
                  )}
                  <Row label="TOTAL PEMASUKAN" v={incomeTotal} variant="total" />

                  {/* PENGELUARAN */}
                  <SectionHeader letter="B" title="Pengeluaran" />
                  {expenseCats.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-3 text-center text-gray-400 text-xs">Belum ada kategori pengeluaran.</td></tr>
                  ) : (
                    expenseCats.map((c, i) => (
                      <Row key={c.id} no={i + 1} label={c.name} v={valuesByCat[c.id] ?? EMPTY} />
                    ))
                  )}
                  <Row label="TOTAL PENGELUARAN" v={expenseTotal} variant="total" />

                  {/* DEVIASI */}
                  <Row label="DEVIASI PEMASUKAN / PENGELUARAN" v={deviasi} variant="deviasi" />
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Kolom <span className="font-medium">ANGGARAN</span> diambil dari halaman Anggaran (rencana bulanan).
        Kolom <span className="font-medium">AKTUAL</span> dihitung otomatis dari transaksi cashflow.
        Angka dalam <span className="text-red-600">(kurung merah)</span> berarti negatif.
      </p>
    </div>
  );
}
