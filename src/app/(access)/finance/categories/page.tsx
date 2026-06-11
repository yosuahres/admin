"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/api";
import type { Database } from "@/types/database.types";

type Category = Database["public"]["Tables"]["cashflow_categories"]["Row"];
type CategoryInsert = Database["public"]["Tables"]["cashflow_categories"]["Insert"];

const TYPES: { value: "in" | "out"; label: string }[] = [
  { value: "in", label: "Pemasukan" },
  { value: "out", label: "Pengeluaran" },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<{ type: "in" | "out"; name: string }>({
    type: "in",
    name: "",
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function loadCategories() {
    const { data } = await supabase
      .from("cashflow_categories")
      .select("*")
      .order("type")
      .order("name");
    if (data) setCategories(data);
  }

  function openAdd() {
    setForm({ type: "in", name: "" });
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setForm({
      type: cat.type as "in" | "out",
      name: cat.name || "",
    });
    setEditId(cat.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      return showToast("Nama kategori wajib diisi.", "error");
    }

    setLoading(true);

    if (editId) {
      const { error } = await supabase
        .from("cashflow_categories")
        .update({ type: form.type, name: form.name })
        .eq("id", editId);
      if (error) showToast("Gagal update: " + error.message, "error");
      else showToast("Kategori berhasil diupdate!");
    } else {
      const { error } = await supabase
        .from("cashflow_categories")
        .insert({ type: form.type, name: form.name } as CategoryInsert);
      if (error) showToast("Gagal simpan: " + error.message, "error");
      else showToast("Kategori berhasil ditambahkan!");
    }

    setLoading(false);
    setShowForm(false);
    loadCategories();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus kategori ini?")) return;
    setDeleting(id);
    const { error } = await supabase.from("cashflow_categories").delete().eq("id", id);
    setDeleting(null);
    if (error) showToast("Gagal hapus: " + error.message, "error");
    else {
      showToast("Kategori dihapus.");
      loadCategories();
    }
  }

  const incomeCats = categories.filter((c) => c.type === "in");
  const expenseCats = categories.filter((c) => c.type === "out");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 text-sm font-semibold flex items-center gap-2 transition-all ${
            toast.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      {showForm ? (
        // Form
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-800">
              {editId ? "Edit Kategori" : "Tambah Kategori Baru"}
            </h1>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-700 transition text-2xl"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6 bg-white p-8">
            {/* Tipe */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-3">Tipe Kategori</label>
              <div className="grid grid-cols-2 gap-3">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                    className={`py-3 text-sm font-semibold transition ${
                      form.type === t.value
                        ? "bg-gray-800 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nama */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Nama Kategori *</label>
              <input
                type="text"
                placeholder="Contoh: Persembahan Minggu, Operasional, dll..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 text-sm text-gray-800 focus:outline-none transition border-b border-gray-200 focus:border-gray-800"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 text-sm font-semibold text-gray-600 hover:text-gray-900 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-900 text-white text-sm font-bold transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                ) : null}
                {editId ? "Update" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Kategori Keuangan</h1>
            <button
              onClick={openAdd}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-bold transition"
            >
              + Tambah Kategori
            </button>
          </div>

          {/* Pemasukan Section */}
          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-4 uppercase tracking-widest">Pemasukan</h2>
            <div className="overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-transparent">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Nama Kategori</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {incomeCats.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="text-center py-12 text-gray-400 text-sm">
                        Belum ada kategori pemasukan.
                      </td>
                    </tr>
                  ) : (
                    incomeCats.map((cat) => (
                      <tr key={cat.id} className="hover:bg-gray-50 transition group">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-gray-800">{cat.name}</p>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => openEdit(cat)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(cat.id!)}
                              disabled={deleting === cat.id}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition disabled:opacity-40"
                              title="Hapus"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a2 2 0 012-2h4a2 2 0 012 2M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pengeluaran Section */}
          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-4 uppercase tracking-widest">Pengeluaran</h2>
            <div className="overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-transparent">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Nama Kategori</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenseCats.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="text-center py-12 text-gray-400 text-sm">
                        Belum ada kategori pengeluaran.
                      </td>
                    </tr>
                  ) : (
                    expenseCats.map((cat) => (
                      <tr key={cat.id} className="hover:bg-gray-50 transition group">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-gray-800">{cat.name}</p>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => openEdit(cat)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(cat.id!)}
                              disabled={deleting === cat.id}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition disabled:opacity-40"
                              title="Hapus"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a2 2 0 012-2h4a2 2 0 012 2M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
