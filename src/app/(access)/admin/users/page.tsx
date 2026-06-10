// admin/users/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import MasterDataTable from "@/components/MasterDataTable";
import ModalForm from "@/components/ModalForm";
import type { ColumnSchema } from "@/utils/exportutils";
import { useSetPageActions } from "@/contexts/page-actions";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const USERS_SCHEMA: ColumnSchema[] = [
  { key: "id",        label: "User ID (UUID)",  type: "string", required: true },
  { key: "full_name", label: "Full Name",        type: "string", required: true },
  { key: "role",      label: "Role",             type: "string", required: true },
];

const ROLE_OPTIONS = [
  { value: "admin",   label: "Admin" },
  { value: "pastor",  label: "Pastor" },
  { value: "leader",  label: "Leader" },
  { value: "finance", label: "Finance" },
  { value: "usher",   label: "Usher" },
];

type ProfileWithJemaat = Profile & {
  jemaat_nama?: string | null;
  jemaat_id?: string | null;
};

export default function UsersPage() {
  const [isModalOpen,    setIsModalOpen]    = useState(false);
  const [editItem,       setEditItem]       = useState<ProfileWithJemaat | null>(null);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [jemaatOptions,  setJemaatOptions]  = useState<{ value: string; label: string }[]>([]);
  const [linkedJemaatId, setLinkedJemaatId] = useState("");
  const tableItemsRef = useRef<any[]>([]);

  const supabase = createClient();
  const triggerRefresh = () => setRefreshTrigger((k) => k + 1);

  // Load jemaat names that are not yet linked to any user (or are linked to the current editItem)
  useEffect(() => {
    const loadJemaat = async () => {
      const { data, error } = await supabase
        .from("jemaat")
        .select("id, nama_lengkap, user_id")
        .order("nama_lengkap");

      if (error) { console.error(error); return; }

      const filtered = (data ?? []).filter(
        (j) => j.user_id === null || (editItem && j.user_id === editItem.id),
      );

      setJemaatOptions([
        { value: "", label: "— Tidak ditautkan —" },
        ...filtered.map((j) => ({ value: j.id, label: j.nama_lengkap })),
      ]);
    };

    loadJemaat();
  }, [editItem, supabase]);

  useEffect(() => {
    if (!editItem) { setLinkedJemaatId(""); return; }
    if (editItem.jemaat_id !== undefined) {
      setLinkedJemaatId(editItem.jemaat_id ?? "");
      return;
    }
    supabase
      .from("jemaat")
      .select("id")
      .eq("user_id", editItem.id)
      .maybeSingle()
      .then(({ data }) => setLinkedJemaatId(data?.id ?? ""));
  }, [editItem, supabase]);

  const columns = [
    { key: "full_name", label: "Full Name" },
    { key: "email",     label: "Email" },
    {
      key: "jemaat_nama",
      label: "Linked Jemaat",
      render: (value: string) =>
        value ? (
          <span className="text-sm text-gray-800">{value}</span>
        ) : (
          <span className="text-xs text-gray-400 italic">— Tidak ditautkan —</span>
        ),
    },
    {
      key: "role",
      label: "Role",
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          value === "admin"  ? "bg-red-100 text-red-800"       :
          value === "pastor" ? "bg-blue-100 text-blue-800"     :
          value === "leader" ? "bg-yellow-100 text-yellow-800" :
          value === "finance" ? "bg-green-100 text-green-800" :
                               "bg-gray-100 text-gray-800"
        }`}>
          {value?.charAt(0).toUpperCase() + value?.slice(1)}
        </span>
      ),
    },
    {
      key: "updated_at",
      label: "Last Updated",
      render: (value: string) =>
        value ? new Date(value).toLocaleDateString("id-ID") : "Never",
    },
  ];

  const fields = [
    {
      name: "email",
      label: "Email",
      type: "text" as const,
      required: true,
      placeholder: "pengguna@gereja.org",
    },
    {
      name: "password",
      label: editItem ? "Password Baru" : "Password",
      type: "password" as const,
      required: !editItem,
      placeholder: editItem ? "Kosongkan jika tidak diubah" : "Minimal 8 karakter",
    },
    {
      name: "full_name",
      label: "Full Name",
      type: "text" as const,
      required: true,
      placeholder: "Nama lengkap",
    },
    {
      name: "role",
      label: "Role",
      type: "select" as const,
      required: true,
      options: ROLE_OPTIONS,
    },
    {
      name: "jemaat_id",
      label: "Tautkan ke Jemaat",
      type: "select" as const,
      required: false,
      options: jemaatOptions,
    },
  ];

  const handleAdd = () => {
    setEditItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: ProfileWithJemaat) => {
    setEditItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Yakin ingin menghapus user ini?")) return;

    const res = await fetch("/api/users/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const json = await res.json();
    if (!res.ok) {
      alert(`Gagal menghapus: ${json.error}`);
    } else {
      triggerRefresh();
    }
  };

  const handleSubmit = async (data: Record<string, string>) => {
    setIsSubmitting(true);
    try {
      // Validate all required fields are non-empty
      if (!data.email?.trim() || !data.full_name?.trim() || !data.role?.trim()) {
        alert("Harap isi semua field yang diperlukan");
        setIsSubmitting(false);
        return;
      }

      if (!data.password && !editItem) {
        alert("Password harus diisi untuk user baru");
        setIsSubmitting(false);
        return;
      }

      let userId: string | null = null;

      if (editItem) {
        const res = await fetch("/api/users/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id:        editItem.id,
            email:     data.email.trim().toLowerCase(),
            password:  data.password || undefined,
            full_name: data.full_name.trim(),
            role:      data.role.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) { alert(`Gagal mengupdate: ${json.error}`); return; }
        userId = editItem.id;
      } else {
        const res = await fetch("/api/users/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email:     data.email.trim().toLowerCase(),
            password:  data.password.trim(),
            full_name: data.full_name.trim(),
            role:      data.role.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) { alert(`Gagal membuat user: ${json.error}`); return; }
        userId = json.id ?? json.user?.id ?? null;
      }

      if (userId) {
        const jemaatId = data.jemaat_id?.trim() || null;

        if (editItem) {
          await supabase
            .from("jemaat")
            .update({ user_id: null })
            .eq("user_id", userId);
        }

        if (jemaatId) {
          const { error: linkError } = await supabase
            .from("jemaat")
            .update({ user_id: userId })
            .eq("id", jemaatId);

          if (linkError) {
            alert(`User dibuat, tapi gagal menautkan jemaat: ${linkError.message}`);
          }
        }
      }

      setIsModalOpen(false);
      setEditItem(null);
      triggerRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (rows: Record<string, any>[]) => {
    const payload = rows.map((row) => ({
      id:        row.id?.trim(),
      full_name: row.full_name?.trim(),
      role:      row.role?.trim().toLowerCase() || "finance",
    }));

    const validRoles = new Set(["admin", "pastor", "leader", "finance", "usher"]);
    const invalidRows = payload.filter((r) => !validRoles.has(r.role));
    if (invalidRows.length > 0) {
      throw new Error(
        `Role tidak valid: ${invalidRows.map((r) => `"${r.role}"`).join(", ")}. ` +
        `Diizinkan: admin, pastor, leader, finance, usher.`,
      );
    }

    const { error } = await supabase.from("profiles").insert(payload);
    if (error) throw new Error(error.message);
    triggerRefresh();
  };

  useSetPageActions({
    addLabel: "User Baru",
    onAdd: handleAdd,
    exportTitle: "Users",
    exportSchema: USERS_SCHEMA,
    getItems: () => tableItemsRef.current,
    onImport: handleImport,
  });

  return (
    <div className="p-4">
      <MasterDataTable
        title="Users"
        endpoint="/api/profiles"
        columns={columns}
        exportSchema={USERS_SCHEMA}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onImport={handleImport}
        onItemsChange={(items) => { tableItemsRef.current = items; }}
        refreshTrigger={refreshTrigger}
      />

      <ModalForm
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditItem(null); }}
        title={editItem ? "Edit User" : "Tambah User Baru"}
        fields={fields}
        initialData={
          editItem
            ? {
                email:     editItem.email ?? "",
                full_name: editItem.full_name ?? "",
                role:      editItem.role ?? "",
                jemaat_id: linkedJemaatId,
              }
            : undefined
        }
        onSubmit={handleSubmit}
        submitText={editItem ? "Simpan Perubahan" : "Buat User"}
        isLoading={isSubmitting}
      />
    </div>
  );
}