// components/AdminDashboard.tsx
"use client";
import {
  Award,
  Baby,
  Cake,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Church,
  PartyPopper,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

const MONTH_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Ags",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const STATUS_COLORS: Record<string, string> = {
  aktif: "#10B981",
  "tidak aktif": "#9CA3AF",
  pindah: "#3B82F6",
  meninggal: "#F87171",
  "tidak di batam": "#F59E0B",
};
const STATUS_LABELS: Record<string, string> = {
  aktif: "Aktif",
  "tidak aktif": "Tidak Aktif",
  pindah: "Pindah",
  meninggal: "Meninggal",
  "tidak di batam": "Tidak di Batam",
};
const GENDER_COLORS = ["#3B82F6", "#EC4899", "#9CA3AF"];

// ---- Types ----
interface BirthdayPerson {
  id: string;
  nama_lengkap: string;
  dob: string;
  daysUntil: number;
  age: number;
}

interface JemaatRow {
  id: string;
  nama_lengkap: string;
  dob: string | null;
  gender: string | null;
  status_jemaat: string | null;
  tanggal_join: string | null;
  is_baptized: boolean | null;
  discipleship_stage: string | null;
}

interface GroupRow {
  id: string;
  nama_icare: string;
}

interface MemberRow {
  icare_id: string | null;
}

interface AttendanceRow {
  id: string;
  submitted_at: string | null;
  total_members: number;
  total_visitors: number;
  total_kids: number;
  event_occurrences: {
    occurrence_date: string | null;
    events: { event_name: string; event_type: string | null } | null;
  } | null;
}

// ---- Birthday helpers ----
function getDaysUntilBirthday(dob: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const birth = new Date(dob);
  const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getTurningAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age + 1;
}

function getCurrentAge(dob: string): number {
  return getTurningAge(dob) - 1;
}

function formatBirthDate(dob: string): string {
  return new Date(dob).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
  });
}

// ---- Finance helpers ----
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
  const MONTH_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
  const d = new Date(dateStr);
  return `${MONTH_SHORT[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`;
}

type RangeOption = "all" | "7d" | "30d" | "3m" | "6m" | "12m" | "custom";

const DAYS_ID = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
const MONTHS_ID_LONG = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

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
      setCustomFrom(dateStr); setCustomTo("");
    } else {
      if (dateStr < customFrom) { setCustomTo(customFrom); setCustomFrom(dateStr); }
      else setCustomTo(dateStr);
    }
  }

  function isInRange(dateStr: string) {
    const end = customTo || hoverDate;
    if (!customFrom || !end) return false;
    const [from, to] = customFrom <= end ? [customFrom, end] : [end, customFrom];
    return dateStr > from && dateStr < to;
  }

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
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronDown size={12} className="rotate-90" />
        </button>
        <span className="text-xs font-semibold text-gray-700">{MONTHS_ID_LONG[calendarMonth]} {calendarYear}</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronDown size={12} className="-rotate-90" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_ID.map((d) => (
          <div key={d} className="text-center text-[9px] font-semibold text-gray-400 py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell) => {
          if (cell.empty) return <div key={cell.key} />;
          const dateStr = toDateStr(calendarYear, calendarMonth, cell.day);
          const start = dateStr === customFrom;
          const end = dateStr === customTo;
          const inRange = isInRange(dateStr);
          const hover = !customTo && dateStr === hoverDate;
          return (
            <button
              key={cell.key}
              onClick={() => handleDayClick(dateStr)}
              onMouseEnter={() => setHoverDate(dateStr)}
              onMouseLeave={() => setHoverDate(null)}
              className={[
                "text-[10px] h-6 w-full flex items-center justify-center transition-colors",
                start || end ? "bg-blue-500 text-white rounded-full font-semibold z-10"
                  : inRange ? "bg-blue-50 text-blue-700 rounded-none"
                  : hover ? "bg-blue-100 text-blue-600 rounded-full"
                  : "text-gray-700 hover:bg-gray-100 rounded-full",
              ].join(" ")}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      {(customFrom || customTo) && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500 flex justify-between items-center gap-1">
          <span className="truncate">
            {customFrom ? new Date(customFrom + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
          </span>
          <span className="text-gray-300 shrink-0">→</span>
          <span className="truncate text-right">
            {customTo ? new Date(customTo + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "Pilih akhir"}
          </span>
        </div>
      )}
      <button
        onClick={() => { if (customFrom && customTo) onApply(); }}
        disabled={!customFrom || !customTo}
        className="w-full mt-2 text-xs font-medium bg-blue-500 text-white rounded-md py-1.5 hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Terapkan
      </button>
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

interface MonthlySummary { month: string | null; total_in: number | null; total_out: number | null; net: number | null; }
interface TxRow {
  id: string | null; transaction_date: string | null; description: string | null;
  category_name: string | null; type: string | null; amount: number | null;
}

// ---- SWR fetcher ----
const supabase = createClient();

async function fetchFinanceData() {
  const [{ data: monthly }, { data: cats }, { data: recent }] = await Promise.all([
    supabase.from("cashflow_monthly_summary").select("month, total_in, total_out, net").order("month", { ascending: true }),
    supabase.from("cashflow_transactions_view").select("type, category_name, amount"),
    supabase.from("cashflow_transactions_view").select("id, transaction_date, description, category_name, type, amount").order("transaction_date", { ascending: false }).limit(5),
  ]);
  return {
    monthly: (monthly ?? []) as MonthlySummary[],
    cats: (cats ?? []) as Pick<TxRow, "type" | "category_name" | "amount">[],
    recent: (recent ?? []) as TxRow[],
  };
}

async function fetchDashboardData() {
  const [
    { data: jemaatData, count },
    { data: groupsData },
    { data: membersData },
  ] = await Promise.all([
    supabase
      .from("jemaat")
      .select(
        "id, nama_lengkap, dob, gender, status_jemaat, tanggal_join, is_baptized, discipleship_stage",
        { count: "exact" },
      )
      .order("tanggal_join", { ascending: true }),
    supabase.from("icare_groups").select("id, nama_icare"),
    supabase.from("icare_members").select("icare_id"),
  ]);

  return {
    jemaat: (jemaatData ?? []) as JemaatRow[],
    count: count ?? 0,
    groups: (groupsData ?? []) as GroupRow[],
    members: (membersData ?? []) as MemberRow[],
  };
}

async function fetchAttendanceData() {
  // All ushers' reports (admin-wide), newest first
  const { data } = await supabase
    .from("attendance_reports")
    .select(
      "id, submitted_at, total_members, total_visitors, total_kids, event_occurrences!inner(occurrence_date, events!inner(event_name, event_type))"
    )
    .order("submitted_at", { ascending: false })
    .limit(1000);
  return (data ?? []) as unknown as AttendanceRow[];
}

// Chart label for a worship date (e.g. "Min, 5 Jul")
function fmtOccLabel(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ---- Sub-components ----
function BirthdayCard({ person }: { person: BirthdayPerson }) {
  const isToday = person.daysUntil === 0;
  const isTomorrow = person.daysUntil === 1;
  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all ${
        isToday
          ? "bg-amber-50 border-amber-200 shadow-sm"
          : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
          isToday ? "bg-amber-400 text-white" : "bg-gray-100 text-gray-500"
        }`}
      >
        {person.nama_lengkap.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          {person.nama_lengkap}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatBirthDate(person.dob)} · Usia {person.age}
        </p>
      </div>
      <div
        className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
          isToday
            ? "bg-amber-400 text-white"
            : isTomorrow
              ? "bg-orange-100 text-orange-700"
              : "bg-gray-100 text-gray-500"
        }`}
      >
        {isToday
          ? "🎉 Hari ini!"
          : isTomorrow
            ? "Besok"
            : `${person.daysUntil} hari lagi`}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null;
  sub?: string;
  iconBg: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-5 flex items-center gap-4">
      <div
        className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}
      >
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
          {label}
        </p>
        {value === null ? (
          <div className="h-7 w-16 bg-gray-100 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        )}
        {sub && value !== null && (
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-2xl shadow-sm p-5 ${className}`}
    >
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart({ message = "Belum ada data" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
      {message}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-52 bg-gray-100 rounded-xl animate-pulse" />;
}

// ---- Main component ----
export default function AdminDashboard() {
  const [filterRange, setFilterRange] = useState<RangeOption>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const rangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) setRangeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: dashData, isLoading } = useSWR(
    "admin-dashboard",
    fetchDashboardData,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300_000,
    },
  );

  const { data: finData, isLoading: finLoading } = useSWR(
    "admin-finance",
    fetchFinanceData,
    { revalidateOnFocus: false, dedupingInterval: 300_000 },
  );

  const { data: attData, isLoading: attLoading } = useSWR(
    "admin-attendance",
    fetchAttendanceData,
    { revalidateOnFocus: false, dedupingInterval: 300_000 },
  );

  const jemaat = dashData?.jemaat ?? [];
  const groups = dashData?.groups ?? [];
  const members = dashData?.members ?? [];

  // KPI values
  const totalActive = dashData
    ? jemaat.filter((j) => j.status_jemaat === "aktif").length
    : null;
  const totalBaptized = dashData
    ? jemaat.filter((j) => j.is_baptized).length
    : null;
  const totalGroups = dashData ? groups.length : null;

  const newInRange = useMemo(() => {
    if (!dashData) return null;
    const now = new Date();
    if (filterRange === "all") {
      return jemaat.filter((j) => j.tanggal_join).length;
    }
    if (filterRange === "custom") {
      return jemaat.filter((j) => {
        if (!j.tanggal_join) return false;
        const ds = j.tanggal_join.slice(0, 10);
        return ds >= customFrom && (!customTo || ds <= customTo);
      }).length;
    }
    const cutoff = getRangeCutoff(filterRange);
    if (!cutoff) {
      return jemaat.filter((j) => {
        if (!j.tanggal_join) return false;
        const d = new Date(j.tanggal_join);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
    }
    return jemaat.filter((j) => {
      if (!j.tanggal_join) return false;
      return new Date(j.tanggal_join) >= cutoff;
    }).length;
  }, [dashData, jemaat, filterRange, customFrom, customTo]);

  // Birthday
  const birthdays: BirthdayPerson[] = useMemo(
    () =>
      jemaat
        .filter((j) => j.dob !== null)
        .map((j) => ({
          id: j.id,
          nama_lengkap: j.nama_lengkap,
          dob: j.dob as string,
          daysUntil: getDaysUntilBirthday(j.dob as string),
          age: getTurningAge(j.dob as string),
        }))
        .filter((j) => j.daysUntil <= 7)
        .sort((a, b) => a.daysUntil - b.daysUntil),
    [jemaat],
  );
  const todayCount = birthdays.filter((b) => b.daysUntil === 0).length;

  // Member growth — filtered by date range
  const growthData = useMemo(() => {
    const now = new Date();
    let cutoffDate: Date | null = null;
    let fromDate = "";
    let toDate = "";

    if (filterRange === "custom") {
      fromDate = customFrom;
      toDate = customTo;
    } else {
      cutoffDate = getRangeCutoff(filterRange);
    }

    // Determine the set of months to display
    let monthsToShow: Date[] = [];
    if (filterRange === "all") {
      // find earliest tanggal_join
      const dates = jemaat.map((j) => j.tanggal_join).filter(Boolean) as string[];
      if (dates.length === 0) {
        monthsToShow = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (5 - i), 1));
      } else {
        const earliest = new Date(dates.sort()[0]);
        const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        const m = start;
        while (m <= end) {
          monthsToShow.push(new Date(m));
          m.setMonth(m.getMonth() + 1);
        }
      }
    } else if (filterRange === "custom" && fromDate) {
      const start = new Date(fromDate.slice(0, 7) + "-01");
      const endD = toDate ? new Date(toDate.slice(0, 7) + "-01") : new Date(now.getFullYear(), now.getMonth(), 1);
      const m = new Date(start);
      while (m <= endD) {
        monthsToShow.push(new Date(m));
        m.setMonth(m.getMonth() + 1);
      }
    } else {
      const numMonths = filterRange === "7d" ? 1 : filterRange === "30d" ? 2 : filterRange === "3m" ? 3 : filterRange === "6m" ? 6 : 12;
      monthsToShow = Array.from({ length: numMonths }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (numMonths - 1 - i), 1));
    }

    return monthsToShow.map((d) => {
      const label = `${MONTH_ID[d.getMonth()]} ${d.getFullYear()}`;
      const baru = jemaat.filter((j) => {
        if (!j.tanggal_join) return false;
        const jd = new Date(j.tanggal_join);
        if (filterRange === "custom") {
          const ds = j.tanggal_join.slice(0, 10);
          return ds >= fromDate && (!toDate || ds <= toDate) &&
            jd.getMonth() === d.getMonth() && jd.getFullYear() === d.getFullYear();
        }
        if (cutoffDate && jd < cutoffDate) return false;
        return jd.getMonth() === d.getMonth() && jd.getFullYear() === d.getFullYear();
      }).length;
      return { month: label, baru };
    });
  }, [jemaat, filterRange, customFrom, customTo]);

  // Status distribution
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of jemaat) {
      const s = j.status_jemaat ?? "tidak aktif";
      map[s] = (map[s] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([key, value]) => ({ key, name: STATUS_LABELS[key] ?? key, value }))
      .sort((a, b) => b.value - a.value);
  }, [jemaat]);

  // Gender distribution
  const genderData = useMemo(() => {
    const male = jemaat.filter((j) => j.gender === "L").length;
    const female = jemaat.filter((j) => j.gender === "P").length;
    const other = jemaat.length - male - female;
    return [
      { name: "Laki-laki", value: male },
      { name: "Perempuan", value: female },
      ...(other > 0 ? [{ name: "Lainnya", value: other }] : []),
    ].filter((d) => d.value > 0);
  }, [jemaat]);

  // iCare group sizes
  const groupSizeData = useMemo(
    () =>
      groups
        .map((g) => ({
          name:
            g.nama_icare.length > 18
              ? `${g.nama_icare.slice(0, 16)}…`
              : g.nama_icare,
          anggota: members.filter((m) => m.icare_id === g.id).length,
        }))
        .sort((a, b) => b.anggota - a.anggota)
        .slice(0, 10),
    [groups, members],
  );

  // Age group distribution
  const ageGroupData = useMemo(() => {
    const buckets: Record<string, number> = {
      "1 sd 5": 0,
      "6 sd 10": 0,
      "11 sd 17": 0,
      "18 sd 25": 0,
      "26 sd 40": 0,
      "41 sd 60": 0,
      "> 60": 0,
    };
    for (const j of jemaat) {
      if (!j.dob) continue;
      const age = getCurrentAge(j.dob);
      if (age <= 5) buckets["1 sd 5"]++;
      else if (age <= 10) buckets["6 sd 10"]++;
      else if (age <= 17) buckets["11 sd 17"]++;
      else if (age <= 25) buckets["18 sd 25"]++;
      else if (age <= 40) buckets["26 sd 40"]++;
      else if (age <= 60) buckets["41 sd 60"]++;
      else buckets["> 60"]++;
    }
    return Object.entries(buckets).map(([group, jumlah]) => ({
      group,
      jumlah,
    }));
  }, [jemaat]);

  // Discipleship stage
  const stageData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of jemaat) {
      const s = j.discipleship_stage ?? "Belum diisi";
      map[s] = (map[s] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([stage, jumlah]) => ({
        stage: stage.length > 20 ? `${stage.slice(0, 18)}…` : stage,
        jumlah,
      }))
      .sort((a, b) => b.jumlah - a.jumlah);
  }, [jemaat]);

  const baptismPct =
    jemaat.length > 0
      ? `${Math.round(((totalBaptized ?? 0) / jemaat.length) * 100)}% dari total`
      : undefined;

  // Finance computed values
  const finAnalytics = useMemo(() => {
    let income = 0, expense = 0;
    for (const m of finData?.monthly ?? []) {
      income += Number(m.total_in ?? 0);
      expense += Number(m.total_out ?? 0);
    }
    return { income, expense, net: income - expense };
  }, [finData]);

  const finMonthlyChart = useMemo(
    () =>
      (finData?.monthly ?? []).map((m) => ({
        month: m.month ? formatMonthDate(m.month) : "—",
        pemasukan: Number(m.total_in ?? 0),
        pengeluaran: Number(m.total_out ?? 0),
        saldo: Number(m.net ?? 0),
        rawMonth: m.month ?? "",
      })),
    [finData],
  );

  function getRangeCutoff(range: RangeOption): Date | null {
    const now = new Date();
    if (range === "7d") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    if (range === "30d") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    if (range === "3m") return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    if (range === "6m") return new Date(now.getFullYear(), now.getMonth() - 5, 1);
    if (range === "12m") return new Date(now.getFullYear(), now.getMonth() - 11, 1);
    return null;
  }

  const filteredFinChart = useMemo(() => {
    if (filterRange === "all") return finMonthlyChart;
    if (filterRange === "custom") {
      if (!customFrom) return finMonthlyChart;
      return finMonthlyChart.filter((m) => {
        const d = m.rawMonth.slice(0, 10);
        return d >= customFrom && (!customTo || d <= customTo);
      });
    }
    const cutoff = getRangeCutoff(filterRange);
    if (!cutoff) return finMonthlyChart;
    return finMonthlyChart.filter((m) => m.rawMonth && new Date(m.rawMonth) >= cutoff);
  }, [filterRange, finMonthlyChart, customFrom, customTo]);

  // Attendance (Kehadiran Ibadah) — respects the global date filter via occurrence_date
  const attFiltered = useMemo(() => {
    const inRange = (dateStr?: string | null) => {
      if (!dateStr) return false;
      const ds = dateStr.slice(0, 10);
      if (filterRange === "all") return true;
      if (filterRange === "custom") {
        if (!customFrom) return true;
        return ds >= customFrom && (!customTo || ds <= customTo);
      }
      const cutoff = getRangeCutoff(filterRange);
      if (!cutoff) return true;
      return new Date(ds) >= cutoff;
    };
    return (attData ?? []).filter((r) => inRange(r.event_occurrences?.occurrence_date));
  }, [attData, filterRange, customFrom, customTo]);

  const attKpis = useMemo(() => {
    const totalReports = attFiltered.length;
    const totalMembers = attFiltered.reduce((s, r) => s + (r.total_members ?? 0), 0);
    const totalVisitors = attFiltered.reduce((s, r) => s + (r.total_visitors ?? 0), 0);
    const totalKids = attFiltered.reduce((s, r) => s + (r.total_kids ?? 0), 0);
    const avgTotal = totalReports > 0
      ? Math.round((totalMembers + totalVisitors + totalKids) / totalReports)
      : 0;
    return { totalReports, totalMembers, totalVisitors, totalKids, avgTotal };
  }, [attFiltered]);

  const attTrend = useMemo(
    () =>
      [...attFiltered]
        .slice(0, 10) // latest 10 (attFiltered is submitted_at desc)
        .reverse()
        .map((r) => ({
          label: r.event_occurrences?.occurrence_date
            ? fmtOccLabel(r.event_occurrences.occurrence_date)
            : "—",
          jemaat: r.total_members,
          tamu: r.total_visitors,
          anak: r.total_kids,
        })),
    [attFiltered],
  );

  const rangeLabel =
    filterRange === "all" ? "All time"
    : filterRange === "7d" ? "7 hari"
    : filterRange === "30d" ? "30 hari"
    : filterRange === "3m" ? "3 bulan"
    : filterRange === "6m" ? "6 bulan"
    : filterRange === "12m" ? "12 bulan"
    : customFrom && customTo
      ? `${new Date(customFrom + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} – ${new Date(customTo + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`
      : "Custom";

  const newInRangeLabel =
    filterRange === "all" ? "Total bergabung"
    : filterRange === "7d" ? "Bergabung 7 hari"
    : filterRange === "30d" ? "Bergabung 30 hari"
    : filterRange === "3m" ? "Bergabung 3 bulan"
    : filterRange === "6m" ? "Bergabung 6 bulan"
    : filterRange === "12m" ? "Bergabung 12 bulan"
    : "Bergabung";

  return (
    <div className="p-6 space-y-6">
      {/* Date filter */}
      <div className="flex items-center justify-between">
        <div ref={rangeRef} className="relative">
          <button
            onClick={() => setRangeOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg bg-white shadow-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <CalendarDays size={13} className="text-gray-400" />
            {rangeLabel}
            {rangeOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {rangeOpen && (
            <div className="absolute left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5" style={{ minWidth: "11rem" }}>
              {([
                { key: "all",    label: "All time",      dot: "#9CA3AF" },
                { key: "7d",     label: "7 hari",        dot: "#06B6D4" },
                { key: "30d",    label: "30 hari",       dot: "#10B981" },
                { key: "3m",     label: "3 bulan",       dot: "#3B82F6" },
                { key: "6m",     label: "6 bulan",       dot: "#8B5CF6" },
                { key: "12m",    label: "12 bulan",      dot: "#EC4899" },
                { key: "custom", label: "Custom range",  dot: "#F59E0B" },
              ] as { key: RangeOption; label: string; dot: string }[]).map(({ key, label, dot }) => (
                <button
                  key={key}
                  onClick={() => { setFilterRange(key); if (key !== "custom") setRangeOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${filterRange === key ? "bg-gray-50 font-medium text-gray-900" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                  {label}
                </button>
              ))}
              {filterRange === "custom" && (
                <CalendarPicker
                  customFrom={customFrom} customTo={customTo}
                  setCustomFrom={setCustomFrom} setCustomTo={setCustomTo}
                  calendarYear={calendarYear} calendarMonth={calendarMonth}
                  setCalendarYear={setCalendarYear} setCalendarMonth={setCalendarMonth}
                  hoverDate={hoverDate} setHoverDate={setHoverDate}
                  onApply={() => setRangeOpen(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          label="Jemaat Aktif"
          value={
            isLoading ? null : (totalActive?.toLocaleString("id-ID") ?? "0")
          }
          sub={dashData ? `dari ${jemaat.length} total jemaat` : undefined}
          iconBg="bg-blue-500"
        />
        <KpiCard
          icon={Church}
          label="Kelompok iCare"
          value={isLoading ? null : (totalGroups ?? 0)}
          sub={dashData ? `${members.length} total anggota` : undefined}
          iconBg="bg-violet-500"
        />
        <KpiCard
          icon={Award}
          label="Terbaptis"
          value={isLoading ? null : (totalBaptized ?? 0)}
          sub={baptismPct}
          iconBg="bg-emerald-500"
        />
        <KpiCard
          icon={TrendingUp}
          label={newInRangeLabel}
          value={isLoading ? null : (newInRange ?? 0)}
          sub="orang"
          iconBg="bg-orange-500"
        />
      </div>

      {/* Row 2: Growth bar + Status pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title={`Jemaat Baru per Bulan${filterRange !== "all" ? ` · ${rangeLabel}` : ""}`}
          className="lg:col-span-2"
        >
          {isLoading ? (
            <ChartSkeleton />
          ) : growthData.every((d) => d.baru === 0) ? (
            <EmptyChart message="Belum ada data tanggal bergabung" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={growthData}
                margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F3F4F6"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                  }}
                  formatter={(val) => [`${val} orang`, "Jemaat Baru"]}
                />
                <Bar dataKey="baru" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Status Jemaat">
          {isLoading ? (
            <ChartSkeleton />
          ) : statusData.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((d) => (
                      <Cell
                        key={d.key}
                        fill={STATUS_COLORS[d.key] ?? "#9CA3AF"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                      fontSize: 12,
                    }}
                    formatter={(val) => [`${val} orang`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                {statusData.map((d) => (
                  <div
                    key={d.key}
                    className="flex items-center gap-1.5 text-xs text-gray-600"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: STATUS_COLORS[d.key] ?? "#9CA3AF" }}
                    />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Row 3: Gender pie + iCare sizes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Distribusi Gender">
          {isLoading ? (
            <ChartSkeleton />
          ) : genderData.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {genderData.map((d, i) => (
                      <Cell
                        key={d.name}
                        fill={GENDER_COLORS[i % GENDER_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                      fontSize: 12,
                    }}
                    formatter={(val) => [`${val} orang`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                {genderData.map((d, i) => (
                  <div
                    key={d.name}
                    className="flex items-center gap-1.5 text-xs text-gray-600"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        background: GENDER_COLORS[i % GENDER_COLORS.length],
                      }}
                    />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Anggota per Kelompok iCare" className="lg:col-span-2">
          {isLoading ? (
            <ChartSkeleton />
          ) : groupSizeData.length === 0 ? (
            <EmptyChart message="Belum ada kelompok iCare" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={groupSizeData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F3F4F6"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  width={96}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                  }}
                  formatter={(val) => [`${val} anggota`]}
                />
                <Bar dataKey="anggota" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 4: Age groups + Discipleship */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Distribusi Kelompok Usia">
          {isLoading ? (
            <ChartSkeleton />
          ) : ageGroupData.every((d) => d.jumlah === 0) ? (
            <EmptyChart message="Belum ada data tanggal lahir" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={ageGroupData}
                margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F3F4F6"
                  vertical={false}
                />
                <XAxis
                  dataKey="group"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                  }}
                  formatter={(val) => [`${val} orang`]}
                />
                <Bar dataKey="jumlah" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Tahap Pemuridan">
          {isLoading ? (
            <ChartSkeleton />
          ) : stageData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stageData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F3F4F6"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  width={88}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                  }}
                  formatter={(val) => [`${val} orang`]}
                />
                <Bar dataKey="jumlah" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Attendance / Kehadiran Ibadah */}
      <div>
        <h2 className="text-base font-bold text-gray-800 mb-3">Kehadiran Ibadah</h2>

        {/* Attendance KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KpiCard
            icon={TrendingUp}
            label="Rata-rata Hadir"
            value={attLoading ? null : attKpis.avgTotal.toLocaleString("id-ID")}
            sub="orang per event"
            iconBg="bg-violet-500"
          />
          <KpiCard
            icon={UserCheck}
            label="Total Jemaat"
            value={attLoading ? null : attKpis.totalMembers.toLocaleString("id-ID")}
            sub="member hadir"
            iconBg="bg-emerald-500"
          />
          <KpiCard
            icon={UserPlus}
            label="Total Tamu"
            value={attLoading ? null : attKpis.totalVisitors.toLocaleString("id-ID")}
            sub="pengunjung hadir"
            iconBg="bg-orange-500"
          />
          <KpiCard
            icon={Baby}
            label="Total Anak"
            value={attLoading ? null : attKpis.totalKids.toLocaleString("id-ID")}
            sub="anak hadir"
            iconBg="bg-teal-500"
          />
        </div>

        {/* Trend chart */}
        <ChartCard title="Tren Kehadiran (10 Laporan Terakhir)">
          {attLoading ? (
            <ChartSkeleton />
          ) : attTrend.length === 0 ? (
            <EmptyChart message="Belum ada laporan kehadiran" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={attTrend}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#9CA3AF" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9CA3AF" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                      fontSize: 12,
                    }}
                    formatter={(val, name) => [
                      `${val} orang`,
                      name === "jemaat" ? "Jemaat" : name === "tamu" ? "Tamu" : "Anak",
                    ]}
                  />
                  <Bar dataKey="jemaat" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="tamu" stackId="a" fill="#A78BFA" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="anak" stackId="a" fill="#34D399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shrink-0" />
                  Jemaat
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-violet-400 shrink-0" />
                  Tamu
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 shrink-0" />
                  Anak
                </div>
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* Finance Summary */}
      <div>
        <h2 className="text-base font-bold text-gray-800 mb-3">Ringkasan Keuangan</h2>

        {/* Finance KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {finLoading ? (
            [0, 1, 2].map((k) => (
              <div key={k} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))
          ) : (
            <>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-emerald-700">Total Pemasukan</span>
                  <TrendingUp size={14} className="text-emerald-600" />
                </div>
                <p className="text-lg font-bold text-emerald-700 truncate">{displayRupiah(finAnalytics.income)}</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-red-600">Total Pengeluaran</span>
                  <TrendingDown size={14} className="text-red-500" />
                </div>
                <p className="text-lg font-bold text-red-600 truncate">{displayRupiah(finAnalytics.expense)}</p>
              </div>
              <div className={`border rounded-xl px-5 py-4 ${finAnalytics.net >= 0 ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${finAnalytics.net >= 0 ? "text-blue-700" : "text-orange-700"}`}>Saldo Bersih</span>
                  <Wallet size={14} className={finAnalytics.net >= 0 ? "text-blue-600" : "text-orange-600"} />
                </div>
                <p className={`text-lg font-bold truncate ${finAnalytics.net >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                  {displayRupiah(finAnalytics.net)}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Monthly trend charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Pemasukan */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-800">Tren Pemasukan</p>
            <p className="text-xs text-gray-400 mt-0.5">Jumlah pemasukan per bulan</p>
            {finLoading ? (
              <ChartSkeleton />
            ) : filteredFinChart.length === 0 ? (
              <EmptyChart message="Belum ada data keuangan" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={filteredFinChart} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
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

          {/* Pengeluaran */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-800">Tren Pengeluaran</p>
            <p className="text-xs text-gray-400 mt-0.5">Jumlah pengeluaran per bulan</p>
            {finLoading ? (
              <ChartSkeleton />
            ) : filteredFinChart.length === 0 ? (
              <EmptyChart message="Belum ada data keuangan" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={filteredFinChart} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
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

        {/* Recent transactions */}
        <div className="flex flex-col w-full border border-gray-200 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
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
                {finLoading ? (
                  Array.from({ length: 5 }).map((_, k) => (
                    <tr key={k} className="border-b border-gray-50">
                      {[1, 2, 3, 4, 5].map((c) => (
                        <td key={c} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (finData?.recent ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">Belum ada transaksi.</td>
                  </tr>
                ) : (
                  (finData?.recent ?? []).map((t) => (
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

      {/* Birthday Widget */}
      <div className="max-w-md">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                <Cake size={15} className="text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">
                Ulang Tahun Minggu Ini
              </span>
            </div>
            {todayCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <PartyPopper size={11} />
                {todayCount} hari ini
              </span>
            )}
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {["bd-a", "bd-b", "bd-c"].map((k) => (
                  <div
                    key={k}
                    className="h-14 rounded-xl bg-gray-100 animate-pulse"
                  />
                ))}
              </div>
            ) : birthdays.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CalendarDays size={32} className="text-gray-200" />
                <p className="text-sm text-gray-400">
                  Tidak ada ulang tahun dalam 7 hari ke depan
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {birthdays.map((person) => (
                  <BirthdayCard key={person.id} person={person} />
                ))}
              </div>
            )}
          </div>
          {!isLoading && birthdays.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400">
                {birthdays.length} jemaat berulang tahun dalam 7 hari ke depan
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
