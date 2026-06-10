"use client";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSetPageActions } from "@/contexts/page-actions";
import MasterDataTable from "@/components/MasterDataTable";
import ModalForm from "@/components/ModalForm";
import type { ColumnSchema } from "@/utils/exportutils";

type LeaderOption = { value: string; label: string };

type Department = {
  id: string;
  nama_pelayanan: string;
  deskripsi: string | null;
  leader_id: string | null;
  created_at: string | null;
  jemaat_nama?: string | null;
  member_count?: number;
};

const DEPT_SCHEMA: ColumnSchema[] = [
  { key: "nama_pelayanan", label: "Nama Pelayanan", type: "string", required: true },
  { key: "deskripsi",      label: "Deskripsi",      type: "string" },
];

export default function PelayananPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isModalOpen,    setIsModalOpen]    = useState(false);
  const [editItem,       setEditItem]       = useState<Department | null>(null);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [leaderOptions,  setLeaderOptions]  = useState<LeaderOption[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const tableItemsRef = useRef<any[]>([]);

  const triggerRefresh = () => setRefreshTrigger((k) => k + 1);

  useEffect(() => {
    loadLeaderOptions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLeaderOptions = async () => {
    const { data } = await supabase
      .from("jemaat")
      .select("id, nama_lengkap")
      .order("nama_lengkap");
    setLeaderOptions([
      { value: "", label: "— Pilih Leader —" },
      ...(data ?? []).map((j: any) => ({ value: j.id, label: j.nama_lengkap })),
    ]);
  };

  const columns = [
    { key: "nama_pelayanan", label: "Nama Pelayanan" },
    {
      key: "leader_id",
      label: "Leader",
      render: (_: unknown, item: Department) =>
        item.jemaat_nama ? (
          <span className="text-xs text-purple-800 bg-purple-100 px-2 py-1 rounded-full font-medium">
            {item.jemaat_nama}
          </span>
        ) : (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
            Belum ada leader
          </span>
        ),
    },
    { key: "deskripsi", label: "Deskripsi" },
    {
      key: "member_count",
      label: "Anggota",
      render: (value: number) => (
        <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
          {value ?? 0} anggota
        </span>
      ),
    },
    {
      key: "id",
      label: "Aksi",
      render: (_: unknown, item: Department) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setEditItem(item); setIsModalOpen(true); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/admin/pelayanan/${item.id}`); }}
            className="p-1.5 text-gray-300 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      ),
    },
  ];

  const fields = [
    {
      name: "nama_pelayanan",
      label: "Nama Pelayanan",
      type: "text" as const,
      required: true,
      placeholder: "e.g. Tim Worship, Multimedia, Usher",
    },
    {
      name: "leader_id",
      label: "Leader",
      type: "select" as const,
      required: false,
      options: leaderOptions,
    },
    {
      name: "deskripsi",
      label: "Deskripsi",
      type: "textarea" as const,
      required: false,
      placeholder: "Deskripsi singkat tentang pelayanan ini...",
    },
  ];

  const handleAdd = () => { setEditItem(null); setIsModalOpen(true); };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus pelayanan ini? Semua anggota akan ikut terhapus.")) return;
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) alert("Gagal menghapus: " + error.message);
    else triggerRefresh();
  };

  const handleSubmit = async (data: Record<string, string>) => {
    setIsSubmitting(true);
    const payload = {
      nama_pelayanan: data.nama_pelayanan,
      deskripsi:      data.deskripsi  || null,
      leader_id:      data.leader_id  || null,
    };

    const { error } = editItem
      ? await supabase.from("departments").update(payload as any).eq("id", editItem.id)
      : await supabase.from("departments").insert(payload as any);

    if (error) {
      alert("Gagal menyimpan: " + error.message);
    } else {
      setIsModalOpen(false);
      setEditItem(null);
      triggerRefresh();
    }
    setIsSubmitting(false);
  };

  useSetPageActions({
    addLabel: "Tambah Pelayanan",
    onAdd: handleAdd,
    exportTitle: "Pelayanan",
    exportSchema: DEPT_SCHEMA,
    getItems: () => tableItemsRef.current,
  });

  return (
    <div className="p-4">
      <MasterDataTable
        title="Pelayanan"
        endpoint="/api/departments"
        columns={columns}
        onAdd={handleAdd}
        onEdit={(item) => { setEditItem(item); setIsModalOpen(true); }}
        onDelete={(id) => handleDelete(id as string)}
        onItemsChange={(items) => { tableItemsRef.current = items; }}
        refreshTrigger={refreshTrigger}
        defaultSortKey="nama_pelayanan"
        searchPlaceholder="Cari pelayanan..."
      />

      <ModalForm
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditItem(null); }}
        title={editItem ? "Edit Pelayanan" : "Tambah Pelayanan Baru"}
        fields={fields}
        initialData={editItem ?? undefined}
        onSubmit={handleSubmit}
        submitText={editItem ? "Simpan Perubahan" : "Tambah Pelayanan"}
        isLoading={isSubmitting}
      />
    </div>
  );
}
