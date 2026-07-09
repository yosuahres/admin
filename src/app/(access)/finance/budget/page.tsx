"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Wallet,
  MoreVertical, Plus, Pencil, Trash2, X, Loader2,
} from "lucide-react";
import { supabase } from "@/utils/api";
import { useSetPageActions } from "@/contexts/page-actions";
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
  created_at: string;
};

type PeriodType = "month" | "year";

/* ── Money helpers (match cashflow pages) ──────────────────────────── */

function displayRupiah(n: number) {
  const abs = Math.abs(n);
  return (n < 0 ? "-" : "") + "Rp " + new Intl.NumberFormat("id-ID").format(abs);
}

function formatRupiahInput(value: string) {
  const num = value.replace(/\D/g, "");
  return num ? new Intl.NumberFormat("id-ID").format(Number(num)) : "";
}
function parseRupiahInput(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}
function formatEntryDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_ID[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
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
  const router = useRouter();
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
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Register the header "Tambah Anggaran" button → batch add form (carrying the current period)
  const periodRefState = useRef({ periodType, year, month });
  periodRefState.current = { periodType, year, month };
  useSetPageActions({
    addLabel: "Tambah Anggaran",
    onAdd: () => {
      const p = periodRefState.current;
      router.push(`/finance/budget/add?type=${p.periodType}&year=${p.year}&month=${p.month}`);
    },
  });

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
      .select("id, category_id, year, month, planned_amount, notes, created_at")
      .eq("year", year)
      .order("created_at", { ascending: true });
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
    setLoading(false);
  }, [periodType, year, month]);

  useEffect(() => {
    if (authorized) fetchData();
  }, [authorized, fetchData]);

  // All budget entries for a category (ledger), and the summed "Rencana" total.
  const entriesByCat = useMemo(() => {
    const map: Record<string, BudgetRow[]> = {};
    for (const b of budgets) (map[b.category_id] ??= []).push(b);
    return map;
  }, [budgets]);
  const plannedByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of budgets) map[b.category_id] = (map[b.category_id] ?? 0) + Number(b.planned_amount ?? 0);
    return map;
  }, [budgets]);

  if (!authorized) return null;

  const incomeCats = categories.filter((c) => c.type === "in");
  const expenseCats = categories.filter((c) => c.type === "out");

  const totals = (cats: Category[]) => {
    let planned = 0, actual = 0;
    for (const c of cats) {
      planned += plannedByCat[c.id] ?? 0;
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
        entriesByCat={entriesByCat}
        plannedByCat={plannedByCat}
        actuals={actuals}
        loading={loading}
        onEditCat={setEditingCat}
      />

      {/* Expense budget table */}
      <BudgetSection
        title="Anggaran Pengeluaran"
        kind="expense"
        cats={expenseCats}
        entriesByCat={entriesByCat}
        plannedByCat={plannedByCat}
        actuals={actuals}
        loading={loading}
        onEditCat={setEditingCat}
      />

      {/* Per-category edit modal */}
      {editingCat && (
        <CategoryBudgetModal
          cat={editingCat}
          entries={entriesByCat[editingCat.id] ?? []}
          periodType={periodType}
          year={year}
          month={month}
          onClose={() => setEditingCat(null)}
          onSaved={() => { setEditingCat(null); fetchData(); }}
        />
      )}
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

/* ── Budget section (summary rows + per-category actions) ──────────── */

function BudgetSection({
  title, kind, cats, entriesByCat, plannedByCat, actuals, loading, onEditCat,
}: {
  title: string;
  kind: "income" | "expense";
  cats: Category[];
  entriesByCat: Record<string, BudgetRow[]>;
  plannedByCat: Record<string, number>;
  actuals: Record<string, number>;
  loading: boolean;
  onEditCat: (cat: Category) => void;
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
              <th className="px-2 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, k) => (
                <tr key={k} className="border-b border-gray-50">
                  {[1, 2, 3, 4, 5, 6].map((c) => (
                    <td key={c} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : cats.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                  Belum ada kategori {income ? "pemasukan" : "pengeluaran"}. Tambahkan lewat halaman Cashflow.
                </td>
              </tr>
            ) : (
              cats.map((cat) => (
                <BudgetCategoryRow
                  key={cat.id}
                  cat={cat}
                  income={income}
                  entryCount={(entriesByCat[cat.id] ?? []).length}
                  planned={plannedByCat[cat.id] ?? 0}
                  actual={actuals[cat.id] ?? 0}
                  onEdit={() => onEditCat(cat)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── One category summary row with a three-dots actions menu ───────── */

function BudgetCategoryRow({
  cat, income, entryCount, planned, actual, onEdit,
}: {
  cat: Category;
  income: boolean;
  entryCount: number;
  planned: number;
  actual: number;
  onEdit: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  // Fixed viewport coords for the portalled menu (escapes the table's overflow clip).
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);

  function toggleMenu() {
    if (menu) { setMenu(null); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 160, height = 48;
    const openUp = r.bottom + height + 8 > window.innerHeight;
    setMenu({
      top: openUp ? r.top - height - 4 : r.bottom + 4,
      left: Math.max(8, r.right - width),
    });
  }

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  // Income remaining = still to earn; Expense remaining = budget left
  const diff = income ? actual - planned : planned - actual;
  const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0;
  const over = !income && actual > planned && planned > 0;

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-medium text-gray-800">
        {cat.name}
        {entryCount > 0 && (
          <span className="ml-1.5 text-xs text-gray-400 font-normal">({entryCount} entri)</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-semibold text-gray-800">
        {planned ? displayRupiah(planned) : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3 text-right font-semibold text-gray-700">{displayRupiah(actual)}</td>
      <td className={`px-4 py-3 text-right font-semibold ${diff < 0 ? "text-red-500" : "text-emerald-600"}`}>
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
      <td className="px-2 py-3 text-right">
        <button
          ref={btnRef}
          onClick={toggleMenu}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Aksi"
        >
          <MoreVertical size={16} />
        </button>
        {menu && createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
            <div
              style={{ top: menu.top, left: menu.left }}
              className="fixed z-50 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-left"
            >
              <button
                onClick={() => { setMenu(null); onEdit(); }}
                className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Pencil size={14} className="text-gray-400" /> Edit anggaran
              </button>
            </div>
          </>,
          document.body,
        )}
      </td>
    </tr>
  );
}

/* ── Modal: edit ALL ledger entries for one category ───────────────── */

type EditRow = { key: string; id: string | null; amount: string; note: string; createdAt: string | null };

function CategoryBudgetModal({
  cat, entries, periodType, year, month, onClose, onSaved,
}: {
  cat: Category;
  entries: BudgetRow[];
  periodType: PeriodType;
  year: number;
  month: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<EditRow[]>(() =>
    entries.length
      ? entries.map((e) => ({
          key: e.id,
          id: e.id,
          amount: new Intl.NumberFormat("id-ID").format(Number(e.planned_amount)),
          note: e.notes ?? "",
          createdAt: e.created_at,
        }))
      : [{ key: Math.random().toString(36).slice(2), id: null, amount: "", note: "", createdAt: null }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = rows.reduce((s, r) => s + parseRupiahInput(r.amount), 0);
  const periodLabel = periodType === "month" ? `${MONTHS_ID[month - 1]} ${year}` : `Tahun ${year}`;

  function updateRow(key: string, field: "amount" | "note", value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { key: Math.random().toString(36).slice(2), id: null, amount: "", note: "", createdAt: null }]);
  }
  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    const client = supabase.from("cashflow_budgets" as never) as any;
    const targetMonth = periodType === "month" ? month : null;

    const keptIds = new Set(rows.filter((r) => r.id && parseRupiahInput(r.amount) > 0).map((r) => r.id));
    const ops: Promise<any>[] = [];

    // Delete: original entries removed from the list, or cleared to 0.
    for (const e of entries) {
      if (!keptIds.has(e.id)) ops.push(client.delete().eq("id", e.id));
    }

    // Update changed existing rows; insert new rows.
    const inserts: any[] = [];
    for (const r of rows) {
      const amount = parseRupiahInput(r.amount);
      const note = r.note.trim() || null;
      if (r.id) {
        if (amount <= 0) continue; // handled by delete above
        const orig = entries.find((e) => e.id === r.id);
        if (orig && (Number(orig.planned_amount) !== amount || (orig.notes ?? null) !== note)) {
          ops.push(client.update({ planned_amount: amount, notes: note }).eq("id", r.id));
        }
      } else if (amount > 0) {
        inserts.push({ category_id: cat.id, year, month: targetMonth, planned_amount: amount, notes: note });
      }
    }
    if (inserts.length) ops.push(client.insert(inserts));

    const results = await Promise.all(ops);
    setSaving(false);
    const firstError = results.find((r: any) => r?.error)?.error;
    if (firstError) { setError(firstError.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Edit Anggaran — {cat.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{periodLabel}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-black w-28">Tanggal</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-black w-40">Jumlah</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-black">Catatan</th>
                  <th className="px-2 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-400">
                      {r.createdAt ? formatEntryDate(r.createdAt) : <span className="text-gray-300">Baru</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none select-none">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={r.amount}
                          onChange={(e) => updateRow(r.key, "amount", formatRupiahInput(e.target.value))}
                          className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 text-right"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="Catatan (opsional)"
                        value={r.note}
                        onChange={(e) => updateRow(r.key, "note", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => removeRow(r.key)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                        title="Hapus baris"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} className="px-3 py-2.5">
                    <button onClick={addRow} className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors">
                      <Plus size={14} /> Tambah Entri
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-3 px-1">
            <span className="text-xs text-gray-400">Baris tanpa jumlah akan diabaikan / dihapus.</span>
            <span className="text-sm font-semibold text-gray-700">Total: {displayRupiah(total)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 shrink-0">
          {error && <p className="text-sm text-red-500 mr-auto">{error}</p>}
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
