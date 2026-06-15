"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, CalendarDays, ChevronUp, ChevronDown as ChevronDownIcon } from "lucide-react";
import {
  ComposedChart, Bar, Line,
  PieChart, Pie,
  ResponsiveContainer, CartesianGrid,
  XAxis, YAxis, Tooltip, Legend,
} from "recharts";
import { supabase } from "@/utils/api";
import type { Database } from "@/types/database.types";

type MonthlySummaryRow = Database["public"]["Views"]["cashflow_monthly_summary"]["Row"];
type TxViewRow = Database["public"]["Views"]["cashflow_transactions_view"]["Row"];

const MONTH_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];

const CAT_COLORS = [
  "#10B981","#3B82F6","#8B5CF6","#F59E0B","#EC4899",
  "#14B8A6","#F97316","#6366F1","#06B6D4","#84CC16",
];
const EXP_COLORS = [
  "#EF4444","#F97316","#F59E0B","#DC2626","#B91C1C",
  "#FB923C","#FCA5A5","#FBBF24","#FDE68A","#FED7AA",
];

function displayRupiah(n: number) {
  const abs = Math.abs(n);
  return (n < 0 ? "-" : "") + "Rp " + new Intl.NumberFormat("id-ID").format(abs);
}
function shortRupiah(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)} jt`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)} rb`;
  return String(n);
}
function formatMonthDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${MONTH_ID[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`;
}

type RangeOption = "all" | "3m" | "6m" | "12m" | "custom";

function CardSkeleton() {
  return <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />;
}
function ChartSkeleton() {
  return <div className="h-52 bg-gray-100 rounded-xl animate-pulse" />;
}

const DAYS_ID = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function CalendarPicker({
  customFrom, customTo, setCustomFrom, setCustomTo,
  calendarYear, calendarMonth, setCalendarYear, setCalendarMonth,
  hoverDate, setHoverDate, onApply,
}: {
  customFrom: string; customTo: string;
  setCustomFrom: (v: string) => void; setCustomTo: (v: string) => void;
  calendarYear: number; calendarMonth: number;
  setCalendarYear: (v: number) => void; setCalendarMonth: (v: number) => void;
  hoverDate: string | null; setHoverDate: (v: string | null) => void;
  onApply: () => void;
}) {
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  function toDateStr(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function handleDayClick(dateStr: string) {
    if (!customFrom || (customFrom && customTo)) {
      setCustomFrom(dateStr);
      setCustomTo("");
    } else {
      if (dateStr < customFrom) {
        setCustomTo(customFrom);
        setCustomFrom(dateStr);
      } else {
        setCustomTo(dateStr);
      }
    }
  }

  function isInRange(dateStr: string) {
    const end = customTo || hoverDate;
    if (!customFrom || !end) return false;
    const [from, to] = customFrom <= end ? [customFrom, end] : [end, customFrom];
    return dateStr > from && dateStr < to;
  }

  function isStart(dateStr: string) { return dateStr === customFrom; }
  function isEnd(dateStr: string) { return dateStr === customTo; }
  function isHover(dateStr: string) { return !customTo && dateStr === hoverDate; }

  function prevMonth() {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); }
    else setCalendarMonth(calendarMonth - 1);
  }
  function nextMonth() {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); }
    else setCalendarMonth(calendarMonth + 1);
  }

  const emptyCells = Array.from({ length: firstDay }, (_, i) => ({ key: `e${i}`, empty: true as const }));
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => ({ key: `d${i + 1}`, day: i + 1, empty: false as const }));
  const cells = [...emptyCells, ...dayCells];

  return (
    <div className="px-3 pt-2 pb-3 border-t border-gray-100 mt-1 w-56">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronDownIcon size={12} className="rotate-90" />
        </button>
        <span className="text-xs font-semibold text-gray-700">
          {MONTHS_ID[calendarMonth]} {calendarYear}
        </span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronDownIcon size={12} className="-rotate-90" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_ID.map((d) => (
          <div key={d} className="text-center text-[9px] font-semibold text-gray-400 py-0.5">{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell) => {
          if (cell.empty) return <div key={cell.key} />;
          const dateStr = toDateStr(calendarYear, calendarMonth, cell.day);
          const start = isStart(dateStr);
          const end = isEnd(dateStr);
          const inRange = isInRange(dateStr);
          const hover = isHover(dateStr);

          return (
            <button
              key={cell.key}
              onClick={() => handleDayClick(dateStr)}
              onMouseEnter={() => setHoverDate(dateStr)}
              onMouseLeave={() => setHoverDate(null)}
              className={[
                "text-[10px] h-6 w-full flex items-center justify-center transition-colors",
                start || end
                  ? "bg-blue-500 text-white rounded-full font-semibold z-10"
                  : inRange
                  ? "bg-blue-50 text-blue-700 rounded-none"
                  : hover
                  ? "bg-blue-100 text-blue-600 rounded-full"
                  : "text-gray-700 hover:bg-gray-100 rounded-full",
              ].join(" ")}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {/* Range display */}
      {(customFrom || customTo) && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500 flex justify-between items-center gap-1">
          <span className="truncate">
            {customFrom
              ? new Date(customFrom + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
              : "—"}
          </span>
          <span className="text-gray-300 shrink-0">→</span>
          <span className="truncate text-right">
            {customTo
              ? new Date(customTo + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
              : "Pilih akhir"}
          </span>
        </div>
      )}

      {/* Apply */}
      <button
        onClick={() => { if (customFrom && customTo) onApply(); }}
        disabled={!customFrom || !customTo}
        className="w-full mt-2 text-xs font-medium bg-blue-500 text-white rounded-md py-1.5 hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Terapkan
      </button>

      {/* Reset */}
      {(customFrom || customTo) && (
        <button
          onClick={() => { setCustomFrom(""); setCustomTo(""); }}
          className="w-full mt-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          Reset pilihan
        </button>
      )}
    </div>
  );
}

export default function FinanceDashboardPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allMonthly, setAllMonthly] = useState<MonthlySummaryRow[]>([]);
  const [catData, setCatData] = useState<Pick<TxViewRow, "type" | "category_name" | "amount" | "transaction_date">[]>([]);
  const [recentTx, setRecentTx] = useState<TxViewRow[]>([]);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [filterRange, setFilterRange] = useState<RangeOption>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const rangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) setRangeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role === "finance" || role === "admin") {
      setAuthorized(true);
      fetchData();
    } else {
      window.location.href = "/login";
    }
  }, []);

  async function fetchData() {
    setLoading(true);
    const [
      { data: monthly },
      { data: cats },
      { data: recent },
    ] = await Promise.all([
      supabase
        .from("cashflow_monthly_summary")
        .select("month, total_in, total_out, net")
        .order("month", { ascending: true }),
      supabase
        .from("cashflow_transactions_view")
        .select("type, category_name, amount, transaction_date"),
      supabase
        .from("cashflow_transactions_view")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(5),
    ]);

    if (monthly) setAllMonthly(monthly);
    if (cats) setCatData(cats);
    if (recent) setRecentTx(recent);
    setLoading(false);
  }

  const monthlyChartData = useMemo(
    () =>
      allMonthly.map((m) => ({
        month: m.month ? formatMonthDate(m.month) : "—",
        pemasukan: Number(m.total_in ?? 0),
        pengeluaran: Number(m.total_out ?? 0),
        saldo: Number(m.net ?? 0),
        rawMonth: m.month ?? "",
      })),
    [allMonthly],
  );

  const filteredChartData = useMemo(() => {
    if (filterRange === "all") return monthlyChartData;
    if (filterRange === "custom") {
      if (!customFrom) return monthlyChartData;
      return monthlyChartData.filter((m) => {
        const d = m.rawMonth.slice(0, 10);
        return d >= customFrom && (!customTo || d <= customTo);
      });
    }
    const months = filterRange === "3m" ? 3 : filterRange === "6m" ? 6 : 12;
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    return monthlyChartData.filter((m) => m.rawMonth && new Date(m.rawMonth) >= cutoff);
  }, [filterRange, monthlyChartData, customFrom, customTo]);

  const filteredCatData = useMemo(() => {
    if (filterRange === "all") return catData;
    if (filterRange === "custom") {
      if (!customFrom) return catData;
      return catData.filter((t) => {
        const d = t.transaction_date?.slice(0, 10) ?? "";
        return d >= customFrom && (!customTo || d <= customTo);
      });
    }
    const months = filterRange === "3m" ? 3 : filterRange === "6m" ? 6 : 12;
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    return catData.filter((t) => t.transaction_date && new Date(t.transaction_date) >= cutoff);
  }, [filterRange, catData, customFrom, customTo]);

  const analytics = useMemo(() => {
    let income = 0, expense = 0;
    for (const m of filteredChartData) {
      income += m.pemasukan;
      expense += m.pengeluaran;
    }
    return { income, expense, net: income - expense, count: filteredCatData.length };
  }, [filteredChartData, filteredCatData]);

  const incomeByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filteredCatData) {
      if (t.type !== "in") continue;
      const cat = t.category_name ?? "Lainnya";
      map[cat] = (map[cat] ?? 0) + Number(t.amount ?? 0);
    }
    return Object.entries(map)
      .map(([name, value], i) => ({ name, value, fill: CAT_COLORS[i % CAT_COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCatData]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filteredCatData) {
      if (t.type !== "out") continue;
      const cat = t.category_name ?? "Lainnya";
      map[cat] = (map[cat] ?? 0) + Number(t.amount ?? 0);
    }
    return Object.entries(map)
      .map(([name, value], i) => ({ name, value, fill: EXP_COLORS[i % EXP_COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCatData]);

  const incomeCatTotal = incomeByCategory.reduce((s, d) => s + d.value, 0);
  const expenseCatTotal = expenseByCategory.reduce((s, d) => s + d.value, 0);

  if (!authorized) return null;

  return (
    <div className="p-4 flex flex-col gap-3">

      <div className="flex items-center justify-between">
        <div ref={rangeRef} className="relative">
          <button
            onClick={() => setRangeOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg bg-white shadow-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <CalendarDays size={13} className="text-gray-400" />
            {filterRange === "all" ? "All time" : filterRange === "3m" ? "3 bulan" : filterRange === "6m" ? "6 bulan" : filterRange === "12m" ? "12 bulan" : customFrom && customTo ? `${new Date(customFrom + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} – ${new Date(customTo + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}` : "Custom"}
            {rangeOpen ? <ChevronUp size={13} /> : <ChevronDownIcon size={13} />}
          </button>

          {rangeOpen && (
            <div className="absolute left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden"
              style={{ minWidth: "11rem" }}
            >
              {(
                [
                  { key: "all",    label: "All time",    dot: "#9CA3AF" },
                  { key: "3m",     label: "3 bulan",     dot: "#3B82F6" },
                  { key: "6m",     label: "6 bulan",     dot: "#8B5CF6" },
                  { key: "12m",    label: "12 bulan",    dot: "#EC4899" },
                  { key: "custom", label: "Custom range", dot: "#F59E0B" },
                ] as { key: RangeOption; label: string; dot: string }[]
              ).map(({ key, label, dot }) => (
                <button
                  key={key}
                  onClick={() => { setFilterRange(key); if (key !== "custom") setRangeOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    filterRange === key ? "bg-gray-50 font-medium text-gray-900" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                  {label}
                </button>
              ))}

              {filterRange === "custom" && (
                <CalendarPicker
                  customFrom={customFrom}
                  customTo={customTo}
                  setCustomFrom={setCustomFrom}
                  setCustomTo={setCustomTo}
                  calendarYear={calendarYear}
                  calendarMonth={calendarMonth}
                  setCalendarYear={setCalendarYear}
                  setCalendarMonth={setCalendarMonth}
                  hoverDate={hoverDate}
                  setHoverDate={setHoverDate}
                  onApply={() => setRangeOpen(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          [0,1,2,3].map((k) => <CardSkeleton key={k} />)
        ) : (
          <>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-emerald-700">Total Pemasukan</span>
                <TrendingUp size={13} className="text-emerald-600" />
              </div>
              <p className="text-base font-bold text-emerald-700 truncate">{displayRupiah(analytics.income)}</p>
              <p className="text-xs text-emerald-600 mt-0.5 opacity-70">{incomeByCategory.length} kategori</p>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-red-600">Total Pengeluaran</span>
                <TrendingDown size={13} className="text-red-500" />
              </div>
              <p className="text-base font-bold text-red-600 truncate">{displayRupiah(analytics.expense)}</p>
              <p className="text-xs text-red-500 mt-0.5 opacity-70">{expenseByCategory.length} kategori</p>
            </div>

            <div className={`border rounded-xl px-4 py-3 ${analytics.net >= 0 ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${analytics.net >= 0 ? "text-blue-700" : "text-orange-700"}`}>Saldo Bersih</span>
                <Wallet size={13} className={analytics.net >= 0 ? "text-blue-600" : "text-orange-600"} />
              </div>
              <p className={`text-base font-bold truncate ${analytics.net >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                {displayRupiah(analytics.net)}
              </p>
              <p className={`text-xs mt-0.5 opacity-70 ${analytics.net >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                {analytics.income > 0 ? `${Math.round((analytics.net / analytics.income) * 100)}% dari pemasukan` : "—"}
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">Total Transaksi</span>
                <CalendarDays size={13} className="text-gray-400" />
              </div>
              <p className="text-base font-bold text-gray-800">{analytics.count}</p>
              <p className="text-xs text-gray-400 mt-0.5">{filteredChartData.length} bulan tercatat</p>
            </div>
          </>
        )}
      </div>

      {/* Monthly trend charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-800">Tren Pemasukan</p>
          <p className="text-xs text-gray-400 mt-0.5">Jumlah pemasukan per bulan</p>
          {loading ? (
            <ChartSkeleton />
          ) : filteredChartData.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-gray-400 text-sm">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={filteredChartData} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                <YAxis tickFormatter={shortRupiah} tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: 12 }}
                  formatter={(val) => [displayRupiah(val as number), "Pemasukan"]}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={() => "Pemasukan"} />
                <Bar dataKey="pemasukan" fill="#10B981" radius={[4, 4, 0, 0]} barSize={32} />
                <Line
                  type="monotone"
                  dataKey="pemasukan"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ fill: "#F59E0B", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#F59E0B" }}
                  legendType="none"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-800">Tren Pengeluaran</p>
          <p className="text-xs text-gray-400 mt-0.5">Jumlah pengeluaran per bulan</p>
          {loading ? (
            <ChartSkeleton />
          ) : filteredChartData.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-gray-400 text-sm">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={filteredChartData} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                <YAxis tickFormatter={shortRupiah} tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: 12 }}
                  formatter={(val) => [displayRupiah(val as number), "Pengeluaran"]}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={() => "Pengeluaran"} />
                <Bar dataKey="pengeluaran" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={32} />
                <Line
                  type="monotone"
                  dataKey="pengeluaran"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ fill: "#F59E0B", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#F59E0B" }}
                  legendType="none"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category pies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Pemasukan per Kategori</h3>
          {loading ? <ChartSkeleton /> : incomeByCategory.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-gray-400 text-sm">Belum ada data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={incomeByCategory} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2} dataKey="value" />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: 12 }} formatter={(val) => [displayRupiah(val as number)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 mt-2">
                {incomeByCategory.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                    <span className="flex-1 text-gray-600 truncate">{d.name}</span>
                    <span className="font-medium text-gray-800 shrink-0">{displayRupiah(d.value)}</span>
                    <span className="text-gray-400 w-9 text-right shrink-0">
                      {incomeCatTotal > 0 ? `${Math.round((d.value / incomeCatTotal) * 100)}%` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Pengeluaran per Kategori</h3>
          {loading ? <ChartSkeleton /> : expenseByCategory.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-gray-400 text-sm">Belum ada data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2} dataKey="value" />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: 12 }} formatter={(val) => [displayRupiah(val as number)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 mt-2">
                {expenseByCategory.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                    <span className="flex-1 text-gray-600 truncate">{d.name}</span>
                    <span className="font-medium text-gray-800 shrink-0">{displayRupiah(d.value)}</span>
                    <span className="text-gray-400 w-9 text-right shrink-0">
                      {expenseCatTotal > 0 ? `${Math.round((d.value / expenseCatTotal) * 100)}%` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="flex flex-col w-full border border-gray-200 bg-white rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Transaksi Terbaru</h3>
        </div>
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
                Array.from({ length: 5 }).map((_, k) => (
                  <tr key={k} className="border-b border-gray-50">
                    {[1,2,3,4,5].map((c) => (
                      <td key={c} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : recentTx.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">Belum ada transaksi.</td>
                </tr>
              ) : (
                recentTx.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {t.transaction_date
                        ? new Date(t.transaction_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{t.description ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
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
      </div>
    </div>
  );
}