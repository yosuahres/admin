// admin/jemaat/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import MasterDataTable from "@/components/MasterDataTable";
import ModalForm from "@/components/ModalForm";
import type { ColumnSchema } from "@/utils/exportutils";
import { useSetPageActions } from "@/contexts/page-actions";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type Jemaat = Database["public"]["Tables"]["jemaat"]["Row"];
type StatusJemaat = Database["public"]["Enums"]["status_jemaat_type"];
type ProfileOption = { value: string; label: string };

const JEMAAT_SCHEMA: ColumnSchema[] = [
  { key: "nama_lengkap",       label: "Nama Lengkap",       type: "string",  required: true },
  { key: "email",              label: "Email",              type: "string" },
  { key: "phone_number",       label: "No. Telepon",        type: "string" },
  { key: "gender",             label: "Gender",             type: "string" },
  { key: "dob",                label: "Tanggal Lahir",      type: "date" },  // not required
  { key: "alamat",             label: "Alamat",             type: "string" },
  { key: "status_jemaat",      label: "Status Jemaat",      type: "string" },
  { key: "marital_status",     label: "Status Pernikahan",  type: "string" },
  { key: "is_baptized",        label: "Sudah Baptis",       type: "boolean" },
  { key: "tanggal_baptis",     label: "Tanggal Baptis",     type: "date" },
  { key: "discipleship_stage", label: "Tahap Pemuridan",    type: "string" },
  { key: "notes",              label: "Catatan",            type: "string" },
];

export default function JemaatPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Jemaat | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);
  const [assignedUserIds, setAssignedUserIds] = useState<Set<string>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0); // ← tells MasterDataTable to reload

  const tableItemsRef = useRef<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    loadProfileOptions();
  }, []);

  const triggerRefresh = () => setRefreshTrigger((k) => k + 1);

  const loadProfileOptions = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name");

    const { data: jemaatList } = await supabase
      .from("jemaat")
      .select("user_id")
      .not("user_id", "is", null);

    const usedIds = new Set(
      (jemaatList ?? []).map((j) => j.user_id).filter((id): id is string => id !== null),
    );
    setAssignedUserIds(usedIds);

    setProfileOptions(
      (profiles ?? []).map((p) => ({
        value: p.id,
        label: `${p.full_name} (${p.role})`,
      })),
    );
  };

  const availableProfileOptions = [
    { value: "", label: "— Tidak Dihubungkan —" },
    ...profileOptions.filter(
      (p) => !assignedUserIds.has(p.value) || p.value === (editItem?.user_id ?? ""),
    ),
  ];

  const columns = [
    { key: "nama_lengkap", label: "Nama Lengkap" },
    { key: "phone_number", label: "No. Telepon" },
    { key: "alamat", label: "Alamat" },
    {
      key: "gender",
      label: "Gender",
      render: (value: string) =>
        value === "L" ? "Laki-laki" : value === "P" ? "Perempuan" : "-",
    },
    {
      key: "dob",
      label: "Tanggal Lahir",
      render: (value: string) =>
        value ? new Date(value).toLocaleDateString("id-ID") : "-",
    },
    { key: "email", label: "Email" },
    {
      key: "status_jemaat",
      label: "Status Jemaat",
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            value === "aktif"
              ? "bg-green-100 text-green-800"
              : value === "tidak aktif"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-600"
          }`}
        >
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : "-"}
        </span>
      ),
    },
    {
      key: "marital_status",
      label: "Status Pernikahan",
      render: (value: string) => {
        const map: Record<string, string> = {
          single: "Single",
          married: "Menikah",
          divorced: "Cerai",
          widowed: "Janda/Duda",
        };
        return value ? (map[value] ?? value) : "-";
      },
    },
    {
      key: "is_baptized",
      label: "Sudah Baptis",
      render: (value: boolean) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            value ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500"
          }`}
        >
          {value ? "Sudah" : "Belum"}
        </span>
      ),
    },
    {
      key: "tanggal_baptis",
      label: "Tanggal Baptis",
      render: (value: string) =>
        value ? new Date(value).toLocaleDateString("id-ID") : "-",
    },
    {
      key: "discipleship_stage",
      label: "Tahap Pemuridan",
      render: (value: string) => value || "-",
    },
    {
      key: "notes",
      label: "Catatan",
      render: (value: string) => value || "-",
    },
  ];

  // ─── Modal fields ──────────────────────────────────────────────────────────────
  const fields = [
    {
      name: "user_id",
      label: "Akun Pengguna",
      type: "select" as const,
      required: false,
      options: availableProfileOptions,
    },
    {
      name: "nama_lengkap",
      label: "Nama Lengkap",
      type: "text" as const,
      required: true,
      placeholder: "Nama lengkap",
    },
    {
      name: "email",
      label: "Email",
      type: "email" as const,
      required: false,
      placeholder: "email@example.com",
    },
    {
      name: "phone_number",
      label: "No. Telepon",
      type: "text" as const,
      required: false,
      placeholder: "08xxxxxxxxxx",
    },
    {
      name: "gender",
      label: "Gender",
      type: "select" as const,
      required: false,
      options: [
        { value: "", label: "— Pilih Gender —" },
        { value: "L", label: "Laki-laki" },
        { value: "P", label: "Perempuan" },
      ],
    },
    { name: "dob", label: "Tanggal Lahir", type: "date" as const, required: false },  // not required
    {
      name: "alamat",
      label: "Alamat",
      type: "textarea" as const,
      required: false,
      placeholder: "Alamat lengkap",
    },
    {
      name: "status_jemaat",
      label: "Status",
      type: "select" as const,
      required: false,
      options: [
        { value: "aktif", label: "Aktif" },
        { value: "tidak aktif", label: "Tidak Aktif" },
        { value: "pindah", label: "Pindah" },
        { value: "meninggal", label: "Meninggal" },
        { value: "tidak di batam", label: "Tidak di Batam" },
      ],
    },
    {
      name: "marital_status",
      label: "Status Pernikahan",
      type: "select" as const,
      required: false,
      options: [
        { value: "", label: "— Pilih Status —" },
        { value: "single", label: "Single" },
        { value: "married", label: "Menikah" },
        { value: "divorced", label: "Cerai" },
        { value: "widowed", label: "Janda/Duda" },
      ],
    },
    {
      name: "is_baptized",
      label: "Sudah Baptis?",
      type: "select" as const,
      required: false,
      options: [
        { value: "false", label: "Belum" },
        { value: "true", label: "Sudah" },
      ],
    },
    { name: "tanggal_baptis", label: "Tanggal Baptis", type: "date" as const, required: false },
    {
      name: "discipleship_stage",
      label: "Tahap Pemuridan",
      type: "select" as const,
      required: false,
      options: [
        { value: "", label: "— Pilih Tahap —" },
        { value: "Come", label: "Come" },
        { value: "Grow", label: "Grow" },
        { value: "Serve", label: "Serve" },
        { value: "Lead", label: "Lead" },
      ],
    },
    {
      name: "notes",
      label: "Catatan",
      type: "textarea" as const,
      required: false,
      placeholder: "Catatan tambahan",
    },
  ];

  // ─── Handlers ──────────────────────────────────────────────────────────────────
  const handleAdd = () => {
    setEditItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: Jemaat) => {
    setEditItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Yakin ingin menghapus data jemaat ini?")) return;

    const { error } = await supabase.from("jemaat").delete().eq("id", id as string);

    if (error) {
      alert(`Gagal menghapus: ${error.message}`);
    } else {
      await loadProfileOptions();
      triggerRefresh(); // ← table re-fetches from /api/jemaat
    }
  };

  const handleSubmit = async (data: Record<string, string>) => {
    setIsSubmitting(true);

    const payload = {
      user_id: data.user_id || null,
      nama_lengkap: data.nama_lengkap,
      email: data.email || null,
      phone_number: data.phone_number || null,
      gender: data.gender || null,
      dob: (data.dob || null) as any,
      alamat: data.alamat || null,
      status_jemaat: (data.status_jemaat || "aktif") as StatusJemaat,
      marital_status: data.marital_status || null,
      is_baptized: data.is_baptized === "true",
      tanggal_baptis: data.tanggal_baptis || null,
      discipleship_stage: data.discipleship_stage || null,
      notes: data.notes || null,
    };

    const { error } = editItem
      ? await supabase.from("jemaat").update(payload).eq("id", editItem.id)
      : await supabase.from("jemaat").insert(payload);

    if (error) {
      alert(`Gagal menyimpan: ${error.message}`);
    } else {
      setIsModalOpen(false);
      setEditItem(null);
      await loadProfileOptions();
      triggerRefresh(); // ← table re-fetches from /api/jemaat
    }

    setIsSubmitting(false);
  };

  // ─── Import handler ────────────────────────────────────────────────────────────
  const handleImport = async (rows: Record<string, any>[]) => {
    const payload = rows.map((row) => ({
      nama_lengkap: row.nama_lengkap,
      email: row.email || null,
      phone_number: row.phone_number || null,
      gender: row.gender || null,
      dob: row.dob || null,  // nullable
      alamat: row.alamat || null,
      status_jemaat: (row.status_jemaat || "aktif") as StatusJemaat,
      marital_status: row.marital_status || null,
      is_baptized: row.is_baptized === true || row.is_baptized === "true",
      tanggal_baptis: row.tanggal_baptis || null,
      discipleship_stage: row.discipleship_stage || null,
      notes: row.notes || null,
    }));

    const { error } = await supabase.from("jemaat").insert(payload);
    if (error) throw new Error(error.message);

    await loadProfileOptions();
    triggerRefresh();
  };

  useSetPageActions({
    addLabel: "Jemaat Baru",
    onAdd: handleAdd,
    exportTitle: "Jemaat",
    exportSchema: JEMAAT_SCHEMA,
    getItems: () => tableItemsRef.current,
    onImport: handleImport,
  });

  return (
    <div className="p-4">
      <MasterDataTable
        title="Jemaat"
        endpoint="/api/jemaat"
        columns={columns}
        exportSchema={JEMAAT_SCHEMA}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onImport={handleImport}
        onItemsChange={(items) => { tableItemsRef.current = items; }}
        refreshTrigger={refreshTrigger}
      />

      <ModalForm
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditItem(null);
        }}
        title={editItem ? "Edit Jemaat" : "Tambah Jemaat"}
        fields={fields}
        initialData={
          editItem
            ? {
                ...editItem,
                is_baptized: editItem.is_baptized ? "true" : "false",
                dob: editItem.dob ?? "",
                tanggal_baptis: editItem.tanggal_baptis ?? "",
              }
            : undefined
        }
        onSubmit={handleSubmit}
        submitText={editItem ? "Simpan Perubahan" : "Tambah Jemaat"}
        isLoading={isSubmitting}
      />
    </div>
  );
}