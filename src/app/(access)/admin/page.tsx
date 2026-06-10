// admin/page.tsx
"use client";
import {
  Award,
  Cake,
  CalendarDays,
  Church,
  PartyPopper,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
};
const STATUS_LABELS: Record<string, string> = {
  aktif: "Aktif",
  "tidak aktif": "Tidak Aktif",
  pindah: "Pindah",
  meninggal: "Meninggal",
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

// ---- SWR fetcher ----
const supabase = createClient();

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

// ---- Main page ----
export default function DashboardPage() {
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") window.location.href = "/login";
  }, []);

  const { data: dashData, isLoading } = useSWR(
    "admin-dashboard",
    fetchDashboardData,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300_000,
    },
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

  const newThisMonth = useMemo(() => {
    if (!dashData) return null;
    const now = new Date();
    return jemaat.filter((j) => {
      if (!j.tanggal_join) return false;
      const d = new Date(j.tanggal_join);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [dashData, jemaat]);

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

  // Member growth – last 6 months
  const growthData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = `${MONTH_ID[d.getMonth()]} ${d.getFullYear()}`;
      const baru = jemaat.filter((j) => {
        if (!j.tanggal_join) return false;
        const jd = new Date(j.tanggal_join);
        return (
          jd.getMonth() === d.getMonth() && jd.getFullYear() === d.getFullYear()
        );
      }).length;
      return { month: label, baru };
    });
  }, [jemaat]);

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
      "< 18": 0,
      "18–25": 0,
      "26–40": 0,
      "41–60": 0,
      "> 60": 0,
    };
    for (const j of jemaat) {
      if (!j.dob) continue;
      const age = getCurrentAge(j.dob);
      if (age < 18) buckets["< 18"]++;
      else if (age <= 25) buckets["18–25"]++;
      else if (age <= 40) buckets["26–40"]++;
      else if (age <= 60) buckets["41–60"]++;
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Ringkasan data jemaat dan kelompok iCare
        </p>
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
          label="Baru Bulan Ini"
          value={isLoading ? null : (newThisMonth ?? 0)}
          sub="bergabung"
          iconBg="bg-orange-500"
        />
      </div>

      {/* Row 2: Growth bar + Status pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Jemaat Baru per Bulan (6 Bulan Terakhir)"
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
