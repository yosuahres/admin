"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Wallet, Loader2, Check,
} from "lucide-react";
import { supabase } from "@/utils/api";
import type { Database } from "@/types/database.types";

/* ── Types ─────────────────────────────────────────────────────────── */

type Category = { id: string; name: string; type: string };
type TxViewRow = Database["public"]["Views"]["cashflow_transactions_view"]["Row"];

// cashflow_budgets is not yet in the generated Database types.
// Regenerate src/types/database.types.ts after creating the table to drop the cast below.
type BudgetRow = {
  id: string;
  category_id: string;
  year: number;
  month: number | null;
  planned_amount: number;
  notes: string | null;
};

type PeriodType = "month" | "year";

/* ── Money helpers (match cashflow pages) ──────────────────────────── */

function displayRupiah(n: number) {
  const abs = Math.abs(n);
  return (n < 0 ? "-" : "") + "Rp " + new Intl.NumberFormat("id-ID").format(abs);
}
function formatRupiahInput(value: string) {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("id-ID").format(Number(num));
}
function parseRupiah(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Inclusive date range [from, to] as YYYY-MM-DD for the selected period. */
function periodRange(periodType: PeriodType, year: number, month: number) {
  if (periodType === "year") {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function BudgetPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1–12
  const [periodOpen, setPeriodOpen] = useState(false);
  const periodRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [actuals, setActuals] = useState<Record<string, number>>({});

  // Inline edit state: category_id -> formatted rupiah string being typed
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) setPeriodOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role === "finance" || role === "admin") {
      setAuthorized(true);
    } else {
      window.location.href = "/login";
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { from, to } = periodRange(periodType, year, month);

    const budgetQuery = (supabase.from("cashflow_budgets" as never) as any)
      .select("id, category_id, year, month, planned_amount, notes")
      .eq("year", year);
    if (periodType === "month") budgetQuery.eq("month", month);
    else budgetQuery.is("month", null);

    const [
      { data: cats },
      { data: budgetRows },
      { data: txRows },
    ] = await Promise.all([
      supabase.from("cashflow_categories").select("id, name, type").order("name"),
      budgetQuery,
      supabase
        .from("cashflow_transactions_view")
        .select("category_id, amount, transaction_date")
        .gte("transaction_date", from)
        .lte("transaction_date", to),
    ]);

    if (cats) setCategories(cats);
    setBudgets((budgetRows as BudgetRow[]) ?? []);

    const actualMap: Record<string, number> = {};
    for (const t of (txRows as Pick<TxViewRow, "category_id" | "amount">[]) ?? []) {
      const cid = t.category_id ?? "__none__";
      actualMap[cid] = (actualMap[cid] ?? 0) + Number(t.amount ?? 0);
    }
    setActuals(actualMap);
    setDrafts({});
    setLoading(false);
  }, [periodType, year, month]);

  useEffect(() => {
    if (authorized) fetchData();
  }, [authorized, fetchData]);

  const budgetByCat = useMemo(() => {
    const map: Record<string, BudgetRow> = {};
    for (const b of budgets) map[b.category_id] = b;
    return map;
  }, [budgets]);

  async function saveBudget(categoryId: string) {
    const raw = drafts[categoryId];
    if (raw === undefined) return;
    const amount = parseRupiah(raw);
    setSavingId(categoryId);

    const existing = budgetByCat[categoryId];
    const payload = {
      category_id: categoryId,
      year,
      month: periodType === "month" ? month : null,
      planned_amount: amount,
    };

    const client = supabase.from("cashflow_budgets" as never) as any;
    const { error } = existing
      ? await client.update({ planned_amount: amount }).eq("id", existing.id)
      : await client.insert(payload);

    setSavingId(null);
    if (error) {
      console.error("Gagal menyimpan anggaran:", error.message);
      return;
    }

    // Update local state without full refetch
    setBudgets((prev) => {
      const others = prev.filter((b) => b.category_id !== categoryId);
      const updated: BudgetRow = existing
        ? { ...existing, planned_amount: amount }
        : { id: crypto.randomUUID(), ...payload, notes: null };
      return [...others, updated];
    });
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
    setSavedId(categoryId);
    setTimeout(() => setSavedId((v) => (v === categoryId ? null : v)), 1500);
  }

  if (!authorized) return null;

  const incomeCats = categories.filter((c) => c.type === "in");
  const expenseCats = categories.filter((c) => c.type === "out");

  const totals = (cats: Category[]) => {
    let planned = 0, actual = 0;
    for (const c of cats) {
      planned += budgetByCat[c.id]?.planned_amount ?? 0;
      actual += actuals[c.id] ?? 0;
    }
    return { planned, actual };
  };
  const inc = totals(incomeCats);
  const exp = totals(expenseCats);

  const periodLabel =
    periodType === "month" ? `${MONTHS_ID[month - 1]} ${year}` : `Tahun ${year}`;

  return (
    <div className="p-4 flex flex-col gap-3">

      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Bulanan / Tahunan toggle */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
          {(["month", "year"] as PeriodType[]).map((pt) => (
            <button
              key={pt}
              onClick={() => setPeriodType(pt)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                periodType === pt ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {pt === "month" ? "Bulanan" : "Tahunan"}
            </button>
          ))}
        </div>

        {/* Period stepper */}
        <div ref={periodRef} className="relative">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white shadow-sm">
            <button
              onClick={() => {
                if (periodType === "year") { setYear((y) => y - 1); return; }
                if (month === 1) { setMonth(12); setYear((y) => y - 1); }
                else setMonth((m) => m - 1);
              }}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-l-lg transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPeriodOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-gray-700 min-w-[130px] justify-center"
            >
              <CalendarDays size={13} className="text-gray-400" />
              {periodLabel}
              <ChevronDown size={13} className="text-gray-400" />
            </button>
            <button
              onClick={() => {
                if (periodType === "year") { setYear((y) => y + 1); return; }
                if (month === 12) { setMonth(1); setYear((y) => y + 1); }
                else setMonth((m) => m + 1);
              }}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-r-lg transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {periodOpen && (
            <div className="absolute left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-3 w-64">
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setYear((y) => y - 1)} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-semibold text-gray-700">{year}</span>
                <button onClick={() => setYear((y) => y + 1)} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                  <ChevronRight size={14} />
                </button>
              </div>
              {periodType === "month" && (
                <div className="grid grid-cols-3 gap-1">
                  {MONTHS_ID.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => { setMonth(i + 1); setPeriodOpen(false); }}
                      className={`text-xs py-1.5 rounded-md transition-colors ${
                        month === i + 1 ? "bg-blue-500 text-white font-medium" : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
              )}
              {periodType === "year" && (
                <button
                  onClick={() => setPeriodOpen(false)}
                  className="w-full text-xs py-1.5 rounded-md bg-blue-500 text-white font-medium"
                >
                  Pilih {year}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <SummaryCard
          label="Anggaran Pemasukan"
          planned={inc.planned}
          actual={inc.actual}
          kind="income"
          loading={loading}
        />
        <SummaryCard
          label="Anggaran Pengeluaran"
          planned={exp.planned}
          actual={exp.actual}
          kind="expense"
          loading={loading}
        />
        <div className={`border rounded-xl px-4 py-3 col-span-2 lg:col-span-1 ${
          inc.planned - exp.planned >= 0 ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Sisa Anggaran (Rencana)</span>
            <Wallet size={13} className="text-gray-400" />
          </div>
          <p className="text-base font-bold text-gray-800 truncate">
            {displayRupiah(inc.planned - exp.planned)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Rencana masuk − rencana keluar</p>
        </div>
      </div>

      {/* Income budget table */}
      <BudgetSection
        title="Anggaran Pemasukan"
        kind="income"
        cats={incomeCats}
        budgetByCat={budgetByCat}
        actuals={actuals}
        drafts={drafts}
        setDrafts={setDrafts}
        onSave={saveBudget}
        savingId={savingId}
        savedId={savedId}
        loading={loading}
      />

      {/* Expense budget table */}
      <BudgetSection
        title="Anggaran Pengeluaran"
        kind="expense"
        cats={expenseCats}
        budgetByCat={budgetByCat}
        actuals={actuals}
        drafts={drafts}
        setDrafts={setDrafts}
        onSave={saveBudget}
        savingId={savingId}
        savedId={savedId}
        loading={loading}
      />
    </div>
  );
}

/* ── Summary card ──────────────────────────────────────────────────── */

function SummaryCard({
  label, planned, actual, kind, loading,
}: {
  label: string;
  planned: number;
  actual: number;
  kind: "income" | "expense";
  loading: boolean;
}) {
  const income = kind === "income";
  const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0;
  // Income: good when reaching target. Expense: bad when over budget.
  const over = actual > planned && planned > 0;
  const barColor = income
    ? "bg-emerald-500"
    : over ? "bg-red-500" : "bg-emerald-500";

  if (loading) return <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />;

  return (
    <div className={`border rounded-xl px-4 py-3 ${income ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${income ? "text-emerald-700" : "text-red-600"}`}>{label}</span>
        {income ? <TrendingUp size={13} className="text-emerald-600" /> : <TrendingDown size={13} className="text-red-500" />}
      </div>
      <div className="flex items-baseline gap-2">
        <p className={`text-base font-bold truncate ${income ? "text-emerald-700" : "text-red-600"}`}>
          {displayRupiah(actual)}
        </p>
        <span className="text-xs text-gray-400">/ {displayRupiah(planned)}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/70 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className={`text-xs mt-1 ${over ? "text-red-600 font-medium" : "text-gray-400"}`}>
        {planned > 0 ? `${pct}% dari rencana${over ? " · melebihi anggaran" : ""}` : "Belum ada rencana"}
      </p>
    </div>
  );
}

/* ── Budget section (one table) ────────────────────────────────────── */

function BudgetSection({
  title, kind, cats, budgetByCat, actuals, drafts, setDrafts, onSave, savingId, savedId, loading,
}: {
  title: string;
  kind: "income" | "expense";
  cats: Category[];
  budgetByCat: Record<string, { planned_amount: number }>;
  actuals: Record<string, number>;
  drafts: Record<string, string>;
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSave: (categoryId: string) => void;
  savingId: string | null;
  savedId: string | null;
  loading: boolean;
}) {
  const income = kind === "income";

  return (
    <div className="flex flex-col w-full border border-gray-200 bg-white rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        {income
          ? <TrendingUp size={15} className="text-emerald-600" />
          : <TrendingDown size={15} className="text-red-500" />}
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-3 text-xs font-semibold text-black text-left">Kategori</th>
              <th className="px-4 py-3 text-xs font-semibold text-black text-right w-44">Rencana</th>
              <th className="px-4 py-3 text-xs font-semibold text-black text-right w-40">Aktual</th>
              <th className="px-4 py-3 text-xs font-semibold text-black text-right w-40">Selisih</th>
              <th className="px-4 py-3 text-xs font-semibold text-black text-left w-40">Progress</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, k) => (
                <tr key={k} className="border-b border-gray-50">
                  {[1, 2, 3, 4, 5].map((c) => (
                    <td key={c} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : cats.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">
                  Belum ada kategori {income ? "pemasukan" : "pengeluaran"}. Tambahkan lewat halaman Cashflow.
                </td>
              </tr>
            ) : (
              cats.map((cat) => {
                const planned = budgetByCat[cat.id]?.planned_amount ?? 0;
                const actual = actuals[cat.id] ?? 0;
                // Income remaining = still to earn; Expense remaining = budget left
                const diff = income ? actual - planned : planned - actual;
                const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0;
                const over = !income && actual > planned && planned > 0;
                const draft = drafts[cat.id];
                const editing = draft !== undefined;
                const saving = savingId === cat.id;
                const saved = savedId === cat.id;

                return (
                  <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="relative inline-flex items-center">
                        <span className="absolute left-2.5 text-xs text-gray-400 pointer-events-none select-none">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editing ? draft : (planned ? new Intl.NumberFormat("id-ID").format(planned) : "")}
                          placeholder="0"
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [cat.id]: formatRupiahInput(e.target.value) }))
                          }
                          onBlur={() => { if (editing) onSave(cat.id); }}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                          className="w-32 pl-8 pr-2 py-1.5 text-sm text-right border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <span className="w-5 ml-1 shrink-0">
                          {saving && <Loader2 size={13} className="animate-spin text-blue-500" />}
                          {saved && !saving && <Check size={13} className="text-emerald-500" />}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700">{displayRupiah(actual)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      diff < 0 ? "text-red-500" : "text-emerald-600"
                    }`}>
                      {displayRupiah(diff)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden min-w-[48px]">
                          <div
                            className={`h-full rounded-full ${over ? "bg-red-500" : "bg-emerald-500"}`}
                            style={{ width: `${planned > 0 ? Math.min(pct, 100) : 0}%` }}
                          />
                        </div>
                        <span className={`text-xs w-9 text-right ${over ? "text-red-600 font-medium" : "text-gray-400"}`}>
                          {planned > 0 ? `${pct}%` : "—"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
