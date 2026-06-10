"use client";
import { Activity, Calendar, TrendingUp, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
const GENDER_COLORS = ["#3B82F6", "#EC4899", "#9CA3AF"];

type IcareGroup = { id: string; nama_icare: string };
type Meeting = {
  id: string;
  tanggal: string;
  jumlah_hadir: number;
  topik: string | null;
};
type MemberDetail = { id: string; nama_lengkap: string; gender: string | null };

function fmtShort(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_ID[d.getMonth()]}`;
}

function fmtMonthYear(iso: string) {
  const d = new Date(iso);
  return `${MONTH_ID[d.getMonth()]} ${d.getFullYear()}`;
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
  value: string | number;
  sub?: string;
  iconBg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm">
      <div className={`${iconBg} p-3 rounded-lg shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
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
      className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm ${className}`}
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

export default function LeaderDashboardPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<IcareGroup | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<MemberDetail[]>([]);
  const [loadError, setLoadError] = useState<"no_jemaat" | "no_group" | null>(
    null,
  );

  useEffect(() => {
    if (localStorage.getItem("role") !== "leader") {
      window.location.href = "/login";
      return;
    }
    setAuthorized(true);

    const loadData = async () => {
      const supabase = createClient();
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: self } = await supabase
        .from("jemaat")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!self) {
        setLoadError("no_jemaat");
        setLoading(false);
        return;
      }

      const { data: g } = await supabase
        .from("icare_groups")
        .select("id, nama_icare")
        .eq("leader_id", self.id)
        .maybeSingle();
      if (!g) {
        setLoadError("no_group");
        setLoading(false);
        return;
      }

      setGroup(g);

      const [{ data: meetingsData }, { data: icareMembers }] =
        await Promise.all([
          supabase
            .from("icare_meetings")
            .select("id, tanggal, jumlah_hadir, topik")
            .eq("icare_id", g.id)
            .order("tanggal", { ascending: false })
            .limit(24),
          supabase
            .from("icare_members")
            .select("jemaat(id, nama_lengkap, gender)")
            .eq("icare_id", g.id),
        ]);

      setMeetings(meetingsData ?? []);
      setMembers(
        (icareMembers ?? [])
          .map((r: { jemaat: MemberDetail | null }) => r.jemaat)
          .filter((m): m is MemberDetail => m !== null),
      );
      setLoading(false);
    };

    loadData();
  }, []);

  // --- Chart data derivations ---

  const attendanceTrend = useMemo(
    () =>
      [...meetings]
        .slice(0, 12)
        .reverse()
        .map((m) => ({
          date: fmtShort(m.tanggal),
          hadir: m.jumlah_hadir,
          rate:
            members.length > 0
              ? Math.round((m.jumlah_hadir / members.length) * 100)
              : 0,
        })),
    [meetings, members],
  );

  const monthlyData = useMemo(() => {
    const asc = [...meetings].reverse();
    const map = new Map<string, number>();
    for (const m of asc) {
      const key = fmtMonthYear(m.tanggal);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .slice(-6)
      .map(([month, pertemuan]) => ({ month, pertemuan }));
  }, [meetings]);

  const genderData = useMemo(() => {
    const male = members.filter((m) => m.gender === "L").length;
    const female = members.filter((m) => m.gender === "P").length;
    const other = members.length - male - female;
    return [
      { name: "Laki-laki", value: male },
      { name: "Perempuan", value: female },
      ...(other > 0 ? [{ name: "Lainnya", value: other }] : []),
    ].filter((d) => d.value > 0);
  }, [members]);

  // KPI values
  const lastMeeting = meetings[0] ?? null;
  const avgAttendance =
    meetings.length > 0
      ? Math.round(
          meetings.reduce((s, m) => s + m.jumlah_hadir, 0) / meetings.length,
        )
      : 0;
  const avgRate =
    members.length > 0 ? Math.round((avgAttendance / members.length) * 100) : 0;

  if (!authorized) return null;

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="animate-pulse">
          <div className="h-7 bg-gray-200 rounded w-40 mb-1" />
          <div className="h-4 bg-gray-100 rounded w-64 mb-5" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {["kpi-a", "kpi-b", "kpi-c", "kpi-d"].map((k) => (
              <div key={k} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2 h-72 bg-gray-200 rounded-xl" />
            <div className="h-72 bg-gray-200 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-72 bg-gray-200 rounded-xl" />
            <div className="h-72 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError === "no_jemaat") {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium">
            Akun belum terhubung ke data jemaat.
          </p>
          <p className="text-amber-600 text-sm mt-1">
            Hubungi admin untuk menautkan akun Anda.
          </p>
        </div>
      </div>
    );
  }

  if (loadError === "no_group") {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <p className="text-blue-800 font-medium">
            Belum ada kelompok iCare yang ditugaskan.
          </p>
          <p className="text-blue-600 text-sm mt-1">
            Hubungi admin untuk mendapatkan kelompok iCare.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        {group && (
          <p className="text-sm text-gray-500 mt-0.5">
            Kelompok iCare:{" "}
            <span className="font-medium text-gray-700">
              {group.nama_icare}
            </span>
          </p>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          label="Total Anggota"
          value={members.length}
          sub="dalam kelompok"
          iconBg="bg-blue-500"
        />
        <KpiCard
          icon={Calendar}
          label="Total Pertemuan"
          value={meetings.length}
          sub="semua waktu"
          iconBg="bg-violet-500"
        />
        <KpiCard
          icon={Activity}
          label="Kehadiran Terakhir"
          value={lastMeeting ? lastMeeting.jumlah_hadir : "—"}
          sub={
            lastMeeting ? fmtShort(lastMeeting.tanggal) : "belum ada pertemuan"
          }
          iconBg="bg-emerald-500"
        />
        <KpiCard
          icon={TrendingUp}
          label="Rata-rata Kehadiran"
          value={members.length > 0 ? `${avgRate}%` : "—"}
          sub={`${avgAttendance} dari ${members.length} anggota`}
          iconBg="bg-orange-500"
        />
      </div>

      {/* Row 2: Attendance Trend + Gender Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Tren Kehadiran (12 Pertemuan Terakhir)"
          className="lg:col-span-2"
        >
          {attendanceTrend.length === 0 ? (
            <EmptyChart message="Belum ada data pertemuan" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={attendanceTrend}
                margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="date"
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
                  formatter={(val) => [`${val} orang`, "Hadir"]}
                />
                <Line
                  type="monotone"
                  dataKey="hadir"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#3B82F6", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Distribusi Gender Anggota">
          {genderData.length === 0 ? (
            <EmptyChart message="Belum ada data anggota" />
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={74}
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
                    formatter={(val, name) => [`${val} orang`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
                {genderData.map((d, i) => (
                  <div
                    key={d.name}
                    className="flex items-center gap-1.5 text-sm text-gray-600"
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
      </div>

      {/* Row 3: Attendance Rate % + Monthly Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Tingkat Kehadiran per Pertemuan (%)">
          {attendanceTrend.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={attendanceTrend}
                margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F3F4F6"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                  }}
                  formatter={(val) => [`${val}%`, "Tingkat Kehadiran"]}
                />
                <Bar dataKey="rate" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Jumlah Pertemuan per Bulan">
          {monthlyData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={monthlyData}
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
                  formatter={(val) => [`${val}x`, "Pertemuan"]}
                />
                <Bar dataKey="pertemuan" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
