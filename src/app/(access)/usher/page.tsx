//usher/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  TrendingUp,
  Users,
  UserCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────
type AttendanceReport = {
  id: string;
  submitted_at: string;
  total_members: number;
  total_visitors: number;
  is_official: boolean;
  occurrence_id: string;
  event_occurrences: {
    occurrence_date: string;
    start_time: string | null;
    events: { event_name: string; event_type: string | null } | null;
  } | null;
};

type UpcomingOccurrence = {
  id: string;
  occurrence_date: string;
  start_time: string | null;
  events: { event_name: string; event_type: string | null } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function fmtTime(t: string | null) {
  return t ? t.slice(0, 5) : null;
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null;
  sub?: string;
  iconBg: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        {loading ? (
          <div className="h-7 w-14 bg-gray-100 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
        )}
        {sub && !loading && (
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
  className = "",
  action,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UsherDashboardPage() {
  const supabase = createClient();

  const [authorized, setAuthorized] = useState(false);
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingOccurrence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role === "usher") setAuthorized(true);
    else window.location.href = "/login";
  }, []);

  useEffect(() => {
    if (!authorized) return;
    loadDashboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  const loadDashboard = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const nextWeek = new Date(today);
    nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);

    const [{ data: rData }, { data: uData }] = await Promise.all([
      supabase
        .from("attendance_reports")
        .select(
          "id, submitted_at, total_members, total_visitors, is_official, occurrence_id, event_occurrences(occurrence_date, start_time, events(event_name, event_type))"
        )
        .eq("submitted_by", user.id)
        .order("submitted_at", { ascending: false })
        .limit(50),
      supabase
        .from("event_occurrences")
        .select("id, occurrence_date, start_time, events(event_name, event_type)")
        .eq("is_cancelled", false)
        .gte("occurrence_date", today.toISOString().split("T")[0])
        .lte("occurrence_date", nextWeek.toISOString().split("T")[0])
        .order("occurrence_date", { ascending: true }),
    ]);

    setReports((rData as any) ?? []);
    setUpcoming((uData as any) ?? []);
    setLoading(false);
  };

  // ── Computed values ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (loading) return null;
    const totalReports = reports.length;
    const totalMembers = reports.reduce((s, r) => s + r.total_members, 0);
    const totalVisitors = reports.reduce((s, r) => s + r.total_visitors, 0);
    const avgTotal = totalReports > 0
      ? Math.round((totalMembers + totalVisitors) / totalReports)
      : 0;
    return { totalReports, totalMembers, totalVisitors, avgTotal };
  }, [reports, loading]);

  const reportedIds = useMemo(
    () => new Set(reports.map((r) => r.occurrence_id)),
    [reports]
  );

  // Last 10 reports for trend chart (chronological order)
  const trendData = useMemo(
    () =>
      [...reports]
        .slice(0, 10)
        .reverse()
        .map((r) => ({
          label: r.event_occurrences?.occurrence_date
            ? fmtDate(r.event_occurrences.occurrence_date)
            : "—",
          jemaat: r.total_members,
          tamu: r.total_visitors,
          total: r.total_members + r.total_visitors,
        })),
    [reports]
  );

  const recentReports = reports.slice(0, 6);

  if (!authorized) return null;

  return (
    <div className="p-6 space-y-6">

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={ClipboardList}
          label="Total Laporan Saya"
          value={kpis?.totalReports.toLocaleString("id-ID") ?? null}
          sub="laporan dikirim"
          iconBg="bg-blue-500"
          loading={loading}
        />
        <KpiCard
          icon={TrendingUp}
          label="Rata-rata Hadir"
          value={kpis?.avgTotal.toLocaleString("id-ID") ?? null}
          sub="orang per event"
          iconBg="bg-violet-500"
          loading={loading}
        />
        <KpiCard
          icon={UserCheck}
          label="Total Jemaat"
          value={kpis?.totalMembers.toLocaleString("id-ID") ?? null}
          sub="member hadir"
          iconBg="bg-emerald-500"
          loading={loading}
        />
        <KpiCard
          icon={Users}
          label="Total Tamu"
          value={kpis?.totalVisitors.toLocaleString("id-ID") ?? null}
          sub="pengunjung hadir"
          iconBg="bg-orange-500"
          loading={loading}
        />
      </div>

      {/* Upcoming events + Trend chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Upcoming events */}
        <SectionCard
          title="Event Minggu Ini"
          className="lg:col-span-2"
          action={
            <Link
              href="/usher/attendance"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Lihat semua
            </Link>
          }
        >
          <div className="p-4 space-y-2">
            {loading ? (
              [1, 2, 3].map((k) => <Skeleton key={k} className="h-14" />)
            ) : upcoming.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CalendarDays size={28} className="text-gray-200" />
                <p className="text-sm text-gray-400">
                  Tidak ada event minggu ini
                </p>
              </div>
            ) : (
              upcoming.map((occ) => {
                const reported = reportedIds.has(occ.id);
                const t = fmtTime(occ.start_time);
                return (
                  <div
                    key={occ.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                      reported
                        ? "bg-green-50 border-green-100"
                        : "bg-white border-gray-100"
                    }`}
                  >
                    <div className={`shrink-0 ${reported ? "text-green-500" : "text-gray-300"}`}>
                      {reported ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Clock size={18} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {occ.events?.event_name ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtDate(occ.occurrence_date)}
                        {t && <> · {t}</>}
                      </p>
                    </div>
                    {occ.events?.event_type && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border border-gray-200 text-gray-400 bg-gray-50">
                        {occ.events.event_type}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        {/* Trend chart */}
        <SectionCard title="Tren Kehadiran (10 Laporan Terakhir)" className="lg:col-span-3">
          <div className="p-5">
            {loading ? (
              <Skeleton className="h-52" />
            ) : trendData.length === 0 ? (
              <div className="flex items-center justify-center h-52 text-sm text-gray-400">
                Belum ada laporan
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={trendData}
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
                      name === "jemaat" ? "Jemaat" : "Tamu",
                    ]}
                  />
                  <Bar dataKey="jemaat" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="tamu" stackId="a" fill="#A78BFA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {!loading && trendData.length > 0 && (
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shrink-0" />
                  Jemaat
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-violet-400 shrink-0" />
                  Tamu
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Recent reports table */}
      <SectionCard
        title="Laporan Terbaru"
        action={
          <Link
            href="/usher/attendance"
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Lihat semua
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100">
                {["Event", "Tanggal", "Jemaat", "Tamu", "Total", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-semibold text-black text-left border-b border-gray-100"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, k) => (
                  <tr key={k} className="border-b border-gray-50">
                    {[1, 2, 3, 4, 5, 6].map((c) => (
                      <td key={c} className="px-4 py-3">
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : recentReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    Belum ada laporan yang dikirim.{" "}
                    <Link href="/usher/attendance" className="text-blue-600 underline underline-offset-2">
                      Buat laporan pertama
                    </Link>
                  </td>
                </tr>
              ) : (
                recentReports.map((r) => {
                  const total = r.total_members + r.total_visitors;
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap max-w-[12rem] truncate">
                        {r.event_occurrences?.events?.event_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {r.event_occurrences?.occurrence_date
                          ? fmtShortDate(r.event_occurrences.occurrence_date)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 tabular-nums">
                        {r.total_members.toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-gray-700 tabular-nums">
                        {r.total_visitors.toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums">
                        {total.toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            r.is_official
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {r.is_official ? "Resmi" : "Draft"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
