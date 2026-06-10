// components/ReportsView.tsx
"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Filter,
  Loader2,
  Users,
  CalendarDays,
  TrendingUp,
  Activity,
  UserCheck,
  UserPlus,
  Edit2,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { REPORT_CONFIGS } from "@/config/reportConfigs";
import ReportFilterBar from "@/components/ReportFilterBar";
import { runReportQuery } from "@/utils/reportQuery";
import { exportToExcel } from "@/utils/exportutils";
import type { ActiveFilters, ReportConfig } from "@/types/report.types";
import { useSetPageActions } from "@/contexts/page-actions";

interface ReportsViewProps {
  role: "admin" | "leader";
}

function IcareSummaryBar({ data }: { data: any[] }) {
  if (data.length === 0) return null;

  const totalMeetings   = data.length;
  const totalAttendance = data.reduce((s, r) => s + (r.jumlah_hadir ?? 0), 0);
  const avgAttendance   = totalMeetings > 0 ? Math.round(totalAttendance / totalMeetings) : 0;

  const now = new Date();
  const meetingsThisMonth = data.filter((m) => {
    const d = new Date(m.tanggal);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const attendanceThisMonth = data
    .filter((m) => {
      const d = new Date(m.tanggal);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, r) => s + (r.jumlah_hadir ?? 0), 0);

  const uniqueIcares = new Set(
    data.map((m) => m.icare_groups?.nama_icare).filter(Boolean)
  ).size;

  const stats = [
    { label: "Grup iCare",            value: uniqueIcares,                                    icon: Activity,     color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Total Pertemuan",       value: totalMeetings,                                   icon: CalendarDays, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Total Kehadiran",       value: totalAttendance,                                 icon: Users,        color: "text-blue-600",   bg: "bg-blue-50" },
    { label: "Rata-rata per Meeting", value: avgAttendance,                                   icon: TrendingUp,   color: "text-teal-600",   bg: "bg-teal-50" },
    { label: "Bulan Ini",             value: `${meetingsThisMonth}x (${attendanceThisMonth} orang)`, icon: CalendarDays, color: "text-green-600",  bg: "bg-green-50" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-xl border border-gray-100 ${s.bg} px-4 py-3 flex items-center gap-3`}
        >
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
            <s.icon size={15} className={s.color} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-medium leading-none">{s.label}</p>
            <p className={`text-lg font-bold leading-tight mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsherSummaryBar({ data }: { data: any[] }) {
  if (data.length === 0) return null;

  const totalReports   = data.length;
  const totalMembers   = data.reduce((s, r) => s + (r.total_members  ?? 0), 0);
  const totalVisitors  = data.reduce((s, r) => s + (r.total_visitors ?? 0), 0);
  const totalAttendees = totalMembers + totalVisitors;
  const avgTotal       = totalReports > 0 ? Math.round(totalAttendees / totalReports) : 0;

  const stats = [
    { label: "Total Laporan",     value: totalReports,                          icon: CalendarDays, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Total Jemaat",      value: totalMembers.toLocaleString("id-ID"),  icon: UserCheck,    color: "text-blue-600",   bg: "bg-blue-50" },
    { label: "Total Tamu",        value: totalVisitors.toLocaleString("id-ID"), icon: UserPlus,     color: "text-teal-600",   bg: "bg-teal-50" },
    { label: "Total Keseluruhan", value: totalAttendees.toLocaleString("id-ID"),icon: Users,        color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Rata-rata / Ibadah",value: avgTotal.toLocaleString("id-ID"),      icon: TrendingUp,   color: "text-green-600",  bg: "bg-green-50" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-xl border border-gray-100 ${s.bg} px-4 py-3 flex items-center gap-3`}
        >
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
            <s.icon size={15} className={s.color} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-medium leading-none">{s.label}</p>
            <p className={`text-lg font-bold leading-tight mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportsView({ role }: ReportsViewProps) {
  const supabase = createClient();

  const availableConfigs = REPORT_CONFIGS.filter(
    (c) => !c.allowedRoles || c.allowedRoles.includes(role)
  );

  const [selectedConfigId, setSelectedConfigId] = useState<string>(availableConfigs[0].id);
  const [filters, setFilters]       = useState<ActiveFilters>({});
  const [data, setData]             = useState<any[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);
  const [page, setPage]             = useState(1);
  const [limit, setLimit]           = useState(50);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);

  const config: ReportConfig =
    availableConfigs.find((c) => c.id === selectedConfigId) ?? availableConfigs[0];

  const totalPages    = Math.ceil(total / limit) || 1;
  const isIcareReport = selectedConfigId === "icare_report";
  const isUsherReport = selectedConfigId === "usher_attendance";
  const needsSummary  = isIcareReport || isUsherReport;

  useEffect(() => {
    setFilters({});
    setPage(1);
    setData([]);
    setTotal(0);
  }, [selectedConfigId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await runReportQuery(supabase, config, filters, "", page, limit);
      setData(result.data);
      setTotal(result.total);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [config, filters, page, limit]);

  useEffect(() => { load(); }, [load]);

  const [allSummaryData, setAllSummaryData] = useState<any[]>([]);
  useEffect(() => {
    if (!needsSummary) { setAllSummaryData([]); return; }
    (async () => {
      try {
        const result = await runReportQuery(supabase, config, filters, "", 1, 1000);
        setAllSummaryData(result.data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [needsSummary, config, filters]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (
        value === undefined || value === null || value === "" ||
        (Array.isArray(value) && value.length === 0)
      ) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearch("");
    setPage(1);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const result = await runReportQuery(
        supabase, config, filters, debouncedSearch, 1, 10000
      );
      const exportData = config.transformForExport
        ? config.transformForExport(result.data)
        : result.data;
      exportToExcel(exportData, config.label);
    } finally {
      setLoading(false);
    }
  };

  const exportRef = useRef(handleExport);
  exportRef.current = handleExport;
  useSetPageActions({ onExport: () => exportRef.current() });

  const handleEditClick = (row: any) => {
    setEditingRow(row);
    const initialValues: Record<string, any> = {};
    config.columns.forEach((col) => {
      if (col.editable) {
        initialValues[col.key] = row[col.key] ?? "";
      }
    });
    setEditValues(initialValues);
  };

  const handleEditSave = async () => {
    if (!editingRow || !editingRow.id) return;
    setSaving(true);
    try {
      const response = await fetch(
        `/api/reports/${config.id}/${editingRow.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editValues),
        }
      );
      if (!response.ok) throw new Error("Failed to update");
      // Refresh data
      await load();
      setEditingRow(null);
      setEditValues({});
    } catch (error) {
      console.error("Edit error:", error);
      alert("Error saving changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/reports/${config.id}/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      // Refresh data
      await load();
      setDeletingId(null);
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting record");
    } finally {
      setSaving(false);
    }
  };

  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="relative inline-flex items-center">
          <select
            value={selectedConfigId}
            onChange={(e) => setSelectedConfigId(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-sm font-semibold border border-transparent rounded-lg bg-gray-100 text-gray-900 outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer min-w-[160px]"
          >
            {availableConfigs.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <ChevronsUpDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="flex items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Reset {activeFilterCount} filter
            </button>
          )}
          <span className="text-sm text-gray-400">
            {loading ? "Memuat..." : `${total.toLocaleString("id-ID")} hasil`}
          </span>
        </div>
      </div>

      {config.filters.length > 0 && (
        <ReportFilterBar
          filters={config.filters}
          values={filters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />
      )}

      {!loading && allSummaryData.length > 0 && isIcareReport && (
        <IcareSummaryBar data={allSummaryData} />
      )}
      {!loading && allSummaryData.length > 0 && isUsherReport && (
        <UsherSummaryBar data={allSummaryData} />
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {config.columns.map((col) => (
                  <th
                    key={col.key}
                    className="sticky top-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200 whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200 whitespace-nowrap">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={config.columns.length + 1} className="py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-500" size={24} />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={config.columns.length + 1} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Filter size={32} className="opacity-30" />
                      <span className="text-sm">Tidak ada data yang cocok dengan filter</span>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={handleClearFilters}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          Reset semua filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={row.id ?? i} className="hover:bg-gray-50 transition-colors">
                    {config.columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-gray-700 whitespace-nowrap max-w-[220px] truncate"
                      >
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "-")}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(row)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 hover:text-blue-700 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingId(row.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 hover:text-red-700 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-100">
          <div className="flex items-center gap-2">
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

      {/* Edit Modal */}
      {editingRow && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Edit Data</h2>
              <button
                onClick={() => {
                  setEditingRow(null);
                  setEditValues({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.columns
                  .filter((col) => col.editable)
                  .map((col) => (
                    <div 
                      key={col.key} 
                      className={`space-y-1.5 ${col.inputType === "textarea" ? "md:col-span-2" : ""}`}
                    >
                      <label className="block text-sm font-medium text-gray-700">
                        {col.label}
                      </label>
                      {col.inputType === "textarea" ? (
                        <textarea
                          value={editValues[col.key] ?? ""}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              [col.key]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500"
                          rows={3}
                        />
                      ) : col.inputType === "select" && col.options ? (
                        <select
                          value={editValues[col.key] ?? ""}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              [col.key]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">-- Pilih --</option>
                          {col.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={col.inputType || "text"}
                          value={editValues[col.key] ?? ""}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              [col.key]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setEditingRow(null);
                  setEditValues({});
                }}
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Hapus Data</h2>
            <p className="text-sm text-gray-600">
              Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setDeletingId(null)}
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {saving ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


