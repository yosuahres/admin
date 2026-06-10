//admin/events/page.tsx
"use client";
import { useRef, useState } from "react";
import MasterDataTable from "@/components/MasterDataTable";
import ModalForm from "@/components/ModalForm";
import { generateOccurrences } from "@/utils/occurrenceGenerator";
import type { ColumnSchema } from "@/utils/exportutils";
import { useSetPageActions } from "@/contexts/page-actions";
import { createClient } from "@/lib/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/types/database.types";

const EVENTS_SCHEMA: ColumnSchema[] = [
  { key: "event_name",          label: "Nama Event",        type: "string",  required: true },
  { key: "event_type",          label: "Tipe Event",        type: "string" },
  { key: "event_date",          label: "Tanggal",           type: "date",    required: true },
  { key: "start_time",          label: "Jam Mulai",         type: "string" },
  { key: "end_time",            label: "Jam Selesai",       type: "string" },
  { key: "location",            label: "Lokasi",            type: "string" },
  { key: "description",         label: "Deskripsi",         type: "string" },
  { key: "capacity",            label: "Kapasitas",         type: "number" },
  { key: "recurrence_rule",     label: "Recurrence Rule",   type: "string" },
  { key: "recurrence_end_date", label: "Akhir Recurrence",  type: "date" },
];

// Map friendly label → RRULE value
const RECURRENCE_OPTIONS = [
  { label: "Tidak berulang",  value: "" },
  { label: "Setiap Minggu",   value: "FREQ=WEEKLY;BYDAY=SU" },
  { label: "Setiap Senin",    value: "FREQ=WEEKLY;BYDAY=MO" },
  { label: "Setiap Selasa",   value: "FREQ=WEEKLY;BYDAY=TU" },
  { label: "Setiap Rabu",     value: "FREQ=WEEKLY;BYDAY=WE" },
  { label: "Setiap Kamis",    value: "FREQ=WEEKLY;BYDAY=TH" },
  { label: "Setiap Jumat",    value: "FREQ=WEEKLY;BYDAY=FR" },
  { label: "Setiap Sabtu",    value: "FREQ=WEEKLY;BYDAY=SA" },
];

type Occurrence = {
  id: string;
  occurrence_date: string;
  start_time: string | null;
  is_cancelled: boolean;
};

export default function EventsPage() {
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [editItem, setEditItem]             = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const tableItemsRef = useRef<any[]>([]);

  // Expanded row state
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [occurrences, setOccurrences]       = useState<Occurrence[]>([]);
  const [loadingOcc, setLoadingOcc]         = useState(false);

  // Track which row is saving its recurrence change
  const [savingRecurrenceId, setSavingRecurrenceId] = useState<string | null>(null);

  const supabase = createClient();
  const triggerRefresh = () => setRefreshTrigger((k) => k + 1);

  // ── Fetch occurrences for expanded row ──────────────────────────
  const loadOccurrences = async (eventId: string) => {
    setLoadingOcc(true);
    const { data } = await supabase
      .from("event_occurrences")
      .select("id, occurrence_date, start_time, is_cancelled")
      .eq("event_id", eventId)
      .order("occurrence_date");
    setOccurrences(data ?? []);
    setLoadingOcc(false);
  };

  const toggleExpand = (item: any) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      setOccurrences([]);
    } else {
      setExpandedId(item.id);
      loadOccurrences(item.id);
    }
  };

  // ── Inline recurrence change: save + auto-generate ──────────────
  const handleRecurrenceChange = async (item: any, newRule: string) => {
    setSavingRecurrenceId(item.id);

    // 1. Persist the new rule
    const { error } = await supabase
      .from("events")
      .update({ recurrence_rule: newRule || null })
      .eq("id", item.id);

    if (error) {
      alert(`Gagal menyimpan recurrence: ${error.message}`);
      setSavingRecurrenceId(null);
      return;
    }

    // 2. Auto-generate occurrences if a rule was chosen
    if (newRule) {
      const updatedItem = { ...item, recurrence_rule: newRule };
      await generateOccurrences(updatedItem);

      // Reload occurrences if this row is expanded
      if (expandedId === item.id) {
        await loadOccurrences(item.id);
      }
    }

    setSavingRecurrenceId(null);
    triggerRefresh();
  };

  // ── Cancel / restore an occurrence ─────────────────────────────
  const toggleCancelOccurrence = async (occ: Occurrence, eventId: string) => {
    await supabase
      .from("event_occurrences")
      .update({ is_cancelled: !occ.is_cancelled })
      .eq("id", occ.id);
    loadOccurrences(eventId);
  };

  // ── Columns ─────────────────────────────────────────────────────
  const columns = [
    {
      key: "event_name",
      label: "Nama Event",
      render: (value: string, item: any) => (
        <button
          onClick={() => toggleExpand(item)}
          className="flex items-center gap-1.5 text-left hover:text-blue-600 transition-colors"
        >
          <span
            className={`text-xs transition-transform duration-200 inline-block ${
              expandedId === item.id ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
          {value}
        </button>
      ),
    },
    {
      key: "event_type",
      label: "Tipe",
      render: (value: string) =>
        value ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            {value}
          </span>
        ) : "-",
    },
    {
      key: "event_date",
      label: "Tanggal",
      render: (value: string) =>
        value
          ? new Date(value).toLocaleDateString("id-ID", {
              day: "numeric", month: "long", year: "numeric",
            })
          : "-",
    },
    {
      key: "start_time",
      label: "Waktu",
      render: (value: string, item: any) => {
        if (!value) return "-";
        const fmt = (t: string) => t.slice(0, 5);
        return item.end_time ? `${fmt(value)} – ${fmt(item.end_time)}` : fmt(value);
      },
    },
    {
      key: "recurrence_rule",
      label: "Recurrence",
      render: (value: string, item: any) => {
        const isSaving = savingRecurrenceId === item.id;
        return (
          <div className="flex items-center gap-1.5">
            <select
              value={value ?? ""}
              disabled={isSaving}
              onChange={(e) => handleRecurrenceChange(item, e.target.value)}
              className={`text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors ${
                value
                  ? "border-purple-200 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-500"
              } disabled:opacity-50 disabled:cursor-wait`}
            >
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {isSaving && (
              <span className="text-xs text-gray-400 animate-pulse">Menyimpan...</span>
            )}
          </div>
        );
      },
    },
    { key: "location", label: "Lokasi" },
    {
      key: "capacity",
      label: "Kapasitas",
      render: (value: number) =>
        value ? value.toLocaleString("id-ID") : <span className="text-gray-400">—</span>,
    },
    {
      key: "created_at",
      label: "Dibuat",
      render: (value: string) =>
        value ? new Date(value).toLocaleDateString("id-ID") : "-",
    },
  ];

  // ── Expanded row renderer ────────────────────────────────────────
  const renderExpandedRow = (item: any) => {
    if (expandedId !== item.id) return null;

    return (
      <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">
            Occurrences
            {occurrences.length > 0 && (
              <span className="ml-2 text-xs text-gray-400 font-normal">
                ({occurrences.length} total)
              </span>
            )}
          </h3>
          {occurrences.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />
                Aktif
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-200 inline-block" />
                Dibatalkan
              </span>
            </div>
          )}
        </div>

        {loadingOcc ? (
          <div className="flex items-center gap-2 py-3">
            <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            <p className="text-xs text-gray-400">Memuat occurrences...</p>
          </div>
        ) : occurrences.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">
            {item.recurrence_rule
              ? "Occurrences akan dibuat otomatis saat recurrence diatur."
              : "Atur recurrence pada kolom di atas untuk membuat jadwal berulang."}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {occurrences.map((occ) => (
              <div
                key={occ.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors ${
                  occ.is_cancelled
                    ? "border-red-100 bg-red-50 text-red-400 line-through"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                <span>
                  {new Date(occ.occurrence_date).toLocaleDateString("id-ID", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                  {occ.start_time && (
                    <span className="ml-1 text-gray-400">{occ.start_time.slice(0, 5)}</span>
                  )}
                </span>
                <button
                  onClick={() => toggleCancelOccurrence(occ, item.id)}
                  title={occ.is_cancelled ? "Pulihkan" : "Batalkan"}
                  className={`ml-2 text-xs rounded px-1 hover:opacity-80 transition-opacity ${
                    occ.is_cancelled ? "text-green-500" : "text-red-400"
                  }`}
                >
                  {occ.is_cancelled ? "↩" : "✕"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Form fields ─────────────────────────────────────────────────
  const fields = [
    {
      name: "event_name", label: "Nama Event", type: "text" as const,
      required: true, placeholder: "e.g. Ibadah Natal 2025",
    },
    {
      name: "event_type", label: "Tipe Event", type: "select" as const,
      required: false,
      options: [
        "Ibadah Umum", "Ibadah Pemuda", "Ibadah Anak", "Retreat",
        "Seminar", "Discipleship Journey", "Baptisan", "Pernikahan", "Lainnya",
      ].map((d) => ({ value: d, label: d })),
    },
    { name: "event_date",  label: "Tanggal",     type: "date" as const, required: true },
    { name: "start_time",  label: "Jam Mulai",   type: "time" as const, required: false },
    { name: "end_time",    label: "Jam Selesai", type: "time" as const, required: false },
    {
      name: "location", label: "Lokasi", type: "text" as const,
      required: false, placeholder: "Nama tempat / alamat",
    },
    {
      name: "capacity", label: "Kapasitas", type: "number" as const,
      required: false, placeholder: "Maks. jumlah peserta",
    },
    {
      name: "recurrence_rule", label: "Pengulangan", type: "select" as const,
      required: false,
      options: RECURRENCE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    },
    {
      name: "recurrence_end_date", label: "Berulang Hingga", type: "date" as const,
      required: false,
    },
    {
      name: "description", label: "Deskripsi", type: "textarea" as const,
      required: false, placeholder: "Keterangan tambahan tentang event...",
    },
  ];

  // ── CRUD handlers ────────────────────────────────────────────────
  const handleAdd  = () => { setEditItem(null); setIsModalOpen(true); };
  const handleEdit = (item: any) => { setEditItem(item); setIsModalOpen(true); };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Yakin ingin menghapus event ini? Semua occurrence-nya akan ikut terhapus.")) return;
    const { error } = await supabase.from("events").delete().eq("id", id as string);
    if (error) alert(`Gagal menghapus: ${error.message}`);
    else triggerRefresh();
  };

  const handleSubmit = async (data: Record<string, string>) => {
    setIsSubmitting(true);

    const payload = {
      event_name:          data.event_name,
      event_type:          data.event_type          || null,
      event_date:          data.event_date,
      start_time:          data.start_time          || null,
      end_time:            data.end_time            || null,
      location:            data.location            || null,
      description:         data.description         || null,
      capacity:            data.capacity ? parseInt(data.capacity) : null,
      recurrence_rule:     data.recurrence_rule     || null,
      recurrence_end_date: data.recurrence_end_date || null,
    };

    let savedItem: any = null;

    if (editItem) {
      const { data: updated, error } = await supabase
        .from("events")
        .update(payload as TablesUpdate<"events">)
        .eq("id", editItem.id)
        .select()
        .single();
      if (error) { alert(`Gagal menyimpan: ${error.message}`); setIsSubmitting(false); return; }
      savedItem = updated;
    } else {
      const { data: inserted, error } = await supabase
        .from("events")
        .insert(payload as TablesInsert<"events">)
        .select()
        .single();
      if (error) { alert(`Gagal menyimpan: ${error.message}`); setIsSubmitting(false); return; }
      savedItem = inserted;
    }

    // Auto-generate occurrences for all events (recurring or not)
    if (savedItem) {
      await generateOccurrences(savedItem);
    }

    setIsModalOpen(false);
    setEditItem(null);
    triggerRefresh();
    setIsSubmitting(false);
  };

  const handleImport = async (rows: Record<string, any>[]) => {
    const payload: TablesInsert<"events">[] = rows.map((row) => ({
      event_name:          row.event_name,
      event_type:          row.event_type?.trim()          || null,
      event_date:          row.event_date,
      start_time:          row.start_time?.trim()          || null,
      end_time:            row.end_time?.trim()            || null,
      location:            row.location?.trim()            || null,
      description:         row.description?.trim()         || null,
      capacity:            row.capacity ? parseInt(row.capacity) : null,
      recurrence_rule:     row.recurrence_rule?.trim()     || null,
      recurrence_end_date: row.recurrence_end_date?.trim() || null,
    }));

    const { data: inserted, error } = await supabase
      .from("events")
      .insert(payload)
      .select();

    if (error) throw new Error(error.message);

    // Auto-generate occurrences for all imported events (recurring or not)
    if (inserted) {
      await Promise.all(
        inserted
          .map((ev: any) => generateOccurrences(ev))
      );
    }
    triggerRefresh();
  };

  useSetPageActions({
    addLabel: "Event Baru",
    onAdd: handleAdd,
    exportTitle: "Events",
    exportSchema: EVENTS_SCHEMA,
    getItems: () => tableItemsRef.current,
    onImport: handleImport,
  });

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="p-4">
      <MasterDataTable
        title="Events"
        endpoint="/api/events"
        columns={columns}
        exportSchema={EVENTS_SCHEMA}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onImport={handleImport}
        onItemsChange={(items) => { tableItemsRef.current = items; }}
        refreshTrigger={refreshTrigger}
        renderExpandedRow={renderExpandedRow}
        defaultSortKey="event_date"
        defaultSortDir="desc"
      />

      <ModalForm
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditItem(null); }}
        title={editItem ? "Edit Event" : "Tambah Event"}
        fields={fields}
        onSubmit={handleSubmit}
        initialData={editItem}
        submitText={editItem ? "Simpan Perubahan" : "Tambah Event"}
        isLoading={isSubmitting}
      />
    </div>
  );
}