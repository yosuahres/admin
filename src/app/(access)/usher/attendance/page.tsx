//usher/attendance/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { useSetPageActions } from "@/contexts/page-actions";
import { createClient } from "@/lib/supabase/client";

type Report = {
  id: string;
  submitted_at: string;
  total_members: number;
  total_visitors: number;
  is_official: boolean;
  notes: string | null;
  event_occurrences: {
    occurrence_date: string;
    events: { event_name: string } | null;
  } | null;
};

type OccurrenceOption = { value: string; label: string };

const EMPTY_FORM = {
  occurrence_id: "",
  total_members: "",
  total_visitors: "",
  notes: "",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Custom combobox ───────────────────────────────────────────────────────────
function EventCombobox({
  options,
  value,
  onChange,
}: {
  options: OccurrenceOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (opt: OccurrenceOption) => {
    onChange(opt.value);
    setOpen(false);
    setQuery("");
  };

  const handleOpen = () => {
    setOpen(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={open ? () => { setOpen(false); setQuery(""); } : handleOpen}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <span className={selected ? "text-gray-900 truncate" : "text-gray-400"}>
          {selected ? selected.label : "— Pilih Event —"}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari event..."
              className="flex-1 text-sm outline-none placeholder:text-gray-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options list */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-400">
                Tidak ada event ditemukan
              </li>
            ) : (
              filtered.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      opt.value === value
                        ? "bg-gray-900 text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Add report modal ──────────────────────────────────────────────────────────
function AddReportModal({
  isOpen,
  onClose,
  onSubmit,
  occurrenceOptions,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: typeof EMPTY_FORM) => void;
  occurrenceOptions: OccurrenceOption[];
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM);
      setError("");
    }
  }, [isOpen]);

  const setField = (key: keyof typeof EMPTY_FORM, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.occurrence_id) {
      setError("Pilih event terlebih dahulu.");
      return;
    }
    setError("");
    onSubmit(form);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Laporan Baru</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Event combobox */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Event <span className="text-red-500">*</span>
            </label>
            <EventCombobox
              options={occurrenceOptions}
              value={form.occurrence_id}
              onChange={(v) => { setField("occurrence_id", v); setError(""); }}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { key: "total_members", label: "Jemaat (member)" },
                { key: "total_visitors", label: "Pengunjung (tamu)" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  {label}
                </label>
                <input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Catatan
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Keterangan tambahan, kondisi khusus, dll..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Kirim Laporan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UsherAttendancePage() {
  const supabase = createClient();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [occurrenceOptions, setOccurrenceOptions] = useState<OccurrenceOption[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => setRefreshTrigger((k) => k + 1);

  useEffect(() => {
    loadReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  useEffect(() => {
    loadOccurrences();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("attendance_reports")
      .select(
        "id, submitted_at, total_members, total_visitors, is_official, notes, event_occurrences(occurrence_date, events(event_name))"
      )
      .eq("submitted_by", user.id)
      .order("submitted_at", { ascending: false })
      .limit(100);

    setReports((data as any) ?? []);
    setLoading(false);
  };

  const loadOccurrences = async () => {
    const { data } = await supabase
      .from("event_occurrences")
      .select("id, occurrence_date, start_time, events(event_name)")
      .eq("is_cancelled", false)
      .order("occurrence_date", { ascending: false })
      .limit(200);

    setOccurrenceOptions(
      ((data as any[]) ?? []).map((occ) => ({
        value: occ.id,
        label: `${occ.events?.event_name ?? "—"} · ${fmtDate(occ.occurrence_date)}${
          occ.start_time ? ` ${occ.start_time.slice(0, 5)}` : ""
        }`,
      }))
    );
  };

  const handleSubmit = async (form: typeof EMPTY_FORM) => {
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSubmitting(false); return; }

    const { error } = await supabase.from("attendance_reports").insert({
      occurrence_id: form.occurrence_id,
      submitted_by: user.id,
      total_members: parseInt(form.total_members || "0"),
      total_visitors: parseInt(form.total_visitors || "0"),
      notes: form.notes || null,
    });

    if (error) {
      alert(`Gagal menyimpan: ${error.message}`);
    } else {
      setIsModalOpen(false);
      triggerRefresh();
    }
    setIsSubmitting(false);
  };

  useSetPageActions({
    addLabel: "Laporan Baru",
    onAdd: () => setIsModalOpen(true),
  });

  const filtered = search
    ? reports.filter((r) =>
        r.event_occurrences?.events?.event_name
          ?.toLowerCase()
          .includes(search.toLowerCase())
      )
    : reports;

  return (
    <div className="p-4">
      <div className="flex flex-col gap-2 w-full">

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari event..."
              className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Table Card */}
        <div className="flex flex-col w-full border border-gray-200 bg-white rounded-xl overflow-hidden">
          <div className="block w-full overflow-x-auto">
            <table className="table-fixed min-w-[700px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-100">
                  {["Event", "Tanggal", "Jemaat", "Tamu", "Total", "Status", "Catatan"].map((h) => (
                    <th
                      key={h}
                      className="w-40 border-b border-gray-100 px-4 py-3 text-left text-xs font-semibold text-black bg-gray-100"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-sm text-gray-400">
                      {search ? `Tidak ada hasil untuk "${search}"` : "Belum ada laporan."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((report) => {
                    const total = report.total_members + report.total_visitors;
                    return (
                      <tr key={report.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap truncate max-w-[12rem]">
                          {report.event_occurrences?.events?.event_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {report.event_occurrences?.occurrence_date
                            ? fmtDate(report.event_occurrences.occurrence_date)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                          {report.total_members.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                          {report.total_visitors.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 tabular-nums">
                          {total.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            report.is_official
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}>
                            {report.is_official ? "Resmi" : "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400 truncate max-w-[12rem]">
                          {report.notes ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center px-4 py-2 border-t border-gray-100 bg-gray-100">
            <span className="text-xs text-gray-400">{filtered.length} laporan</span>
          </div>
        </div>
      </div>

      <AddReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        occurrenceOptions={occurrenceOptions}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
