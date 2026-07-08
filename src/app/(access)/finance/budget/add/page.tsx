"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/utils/api";
import { SimpleSelect, CategorySelect } from "@/app/(access)/finance/cashflow/add/page";

type Category = { id: string; name: string; type: string };
type PeriodType = "month" | "year";

type BudgetLine = {
  id: string;
  type: "income" | "expense";
  category: string;   // category_id
  amount: string;     // formatted rupiah
};

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function newLine(): BudgetLine {
  return { id: Math.random().toString(36).slice(2), type: "income", category: "", amount: "" };
}
function formatRupiah(value: string) {
  const num = value.replace(/\D/g, "");
  return num ? new Intl.NumberFormat("id-ID").format(Number(num)) : "";
}
function parseRupiah(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

function BudgetAddInner() {
  const router = useRouter();
  const params = useSearchParams();

  const now = new Date();
  const [periodType, setPeriodType] = useState<PeriodType>(
    params.get("type") === "year" ? "year" : "month",
  );
  const [year, setYear] = useState(Number(params.get("year")) || now.getFullYear());
  const [month, setMonth] = useState(Number(params.get("month")) || now.getMonth() + 1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<BudgetLine[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-category modal
  const [addingForItemId, setAddingForItemId] = useState<string | null>(null);
  const [addingForType, setAddingForType] = useState<"in" | "out">("in");
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  useEffect(() => {
    supabase
      .from("cashflow_categories")
      .select("id, name, type")
      .order("name")
      .then(({ data }) => { if (data) setCategories(data); });
  }, []);

  function updateItem(id: string, field: keyof BudgetLine, value: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, [field]: value, ...(field === "type" ? { category: "" } : {}) } : i,
      ),
    );
  }
  function addRow() { setItems((prev) => [...prev, newLine()]); }
  function removeRow(id: string) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((i) => i.id !== id)));
  }

  async function handleSaveCat() {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    const { data, error: e } = await supabase
      .from("cashflow_categories")
      .insert({ name: newCatName.trim(), type: addingForType })
      .select("id, name, type")
      .single();
    setSavingCat(false);
    if (e || !data) return;
    setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    if (addingForItemId) updateItem(addingForItemId, "category", data.id);
    setAddingForItemId(null);
    setNewCatName("");
  }

  async function handleSave() {
    setError(null);
    const valid = items.filter((i) => i.category && parseRupiah(i.amount) > 0);
    if (valid.length === 0) {
      setError("Minimal satu baris harus punya kategori dan jumlah anggaran.");
      return;
    }

    // Aggregate by category (sum if the same category appears twice)
    const perCategory: Record<string, number> = {};
    for (const i of valid) perCategory[i.category] = (perCategory[i.category] ?? 0) + parseRupiah(i.amount);

    const targetMonth = periodType === "month" ? month : null;
    setSaving(true);

    // Find which categories already have a budget for this period → update; rest → insert
    const client = supabase.from("cashflow_budgets" as never) as any;
    let existingQuery = client.select("id, category_id").eq("year", year);
    existingQuery = targetMonth == null ? existingQuery.is("month", null) : existingQuery.eq("month", targetMonth);
    const { data: existingRows } = await existingQuery;
    const existingByCat: Record<string, string> = {};
    for (const r of (existingRows as { id: string; category_id: string }[]) ?? []) {
      existingByCat[r.category_id] = r.id;
    }

    const inserts: any[] = [];
    const updates: Promise<any>[] = [];
    for (const [categoryId, amount] of Object.entries(perCategory)) {
      const existingId = existingByCat[categoryId];
      if (existingId) {
        updates.push(client.update({ planned_amount: amount }).eq("id", existingId));
      } else {
        inserts.push({ category_id: categoryId, year, month: targetMonth, planned_amount: amount });
      }
    }

    const results = await Promise.all([
      inserts.length ? client.insert(inserts) : Promise.resolve({ error: null }),
      ...updates,
    ]);
    setSaving(false);

    const firstError = results.find((r: any) => r?.error)?.error;
    if (firstError) { setError(firstError.message); return; }

    router.push(`/finance/budget?type=${periodType}&year=${year}&month=${month}`);
  }

  const periodLabel = periodType === "month" ? `${MONTHS_ID[month - 1]} ${year}` : `Tahun ${year}`;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Action bar */}
      <div className="flex justify-between items-center gap-2 px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-sm font-semibold text-gray-800">Tambah Anggaran</h1>
        <div className="flex items-center gap-2">
          {error && <p className="text-sm text-red-500 mr-auto">{error}</p>}
          <button
            onClick={() => router.push("/finance/budget")}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Simpan
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Period selector */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Jenis Periode</label>
              <SimpleSelect
                value={periodType}
                options={[
                  { value: "month", label: "Bulanan" },
                  { value: "year", label: "Tahunan" },
                ]}
                onChange={(v) => setPeriodType(v as PeriodType)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Periode</label>
              <div className="flex gap-2">
                {periodType === "month" && (
                  <SimpleSelect
                    value={String(month)}
                    options={MONTHS_ID.map((m, i) => ({ value: String(i + 1), label: m }))}
                    onChange={(v) => setMonth(Number(v))}
                  />
                )}
                <SimpleSelect
                  value={String(year)}
                  options={Array.from({ length: 7 }, (_, i) => {
                    const y = now.getFullYear() - 3 + i;
                    return { value: String(y), label: String(y) };
                  })}
                  onChange={(v) => setYear(Number(v))}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Anggaran yang ditambahkan berlaku untuk <span className="font-medium text-gray-600">{periodLabel}</span>.
            Kategori yang sudah punya anggaran di periode ini akan diperbarui.
          </p>
        </div>

        {/* Line items */}
        <div className="flex flex-col w-full border border-gray-200 bg-white rounded-xl overflow-hidden">
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {items.map((item, idx) => {
              const dbType = item.type === "income" ? "in" : "out";
              const filteredCats = categories.filter((c) => c.type === dbType);
              return (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Baris {idx + 1}</span>
                    <button
                      onClick={() => removeRow(item.id)}
                      disabled={items.length === 1}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition disabled:opacity-25 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-500">Tipe</label>
                      <SimpleSelect
                        value={item.type}
                        options={[
                          { value: "income", label: "Pemasukan" },
                          { value: "expense", label: "Pengeluaran" },
                        ]}
                        onChange={(v) => updateItem(item.id, "type", v)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-500">Kategori</label>
                      <CategorySelect
                        value={item.category}
                        options={filteredCats}
                        onChange={(id) => updateItem(item.id, "category", id)}
                        onAddNew={() => { setAddingForItemId(item.id); setAddingForType(dbType); setNewCatName(""); }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-500">Jumlah Anggaran</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none select-none">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={item.amount}
                        onChange={(e) => updateItem(item.id, "amount", formatRupiah(e.target.value))}
                        className="w-full pl-8 pr-2 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 text-right"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="px-4 py-3">
              <button onClick={addRow} className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors">
                <Plus size={14} /> Tambah Baris
              </button>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-black w-40">Tipe</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-black w-64">Kategori</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-black">Jumlah Anggaran</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const dbType = item.type === "income" ? "in" : "out";
                  const filteredCats = categories.filter((c) => c.type === dbType);
                  return (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2">
                        <SimpleSelect
                          value={item.type}
                          options={[
                            { value: "income", label: "Pemasukan" },
                            { value: "expense", label: "Pengeluaran" },
                          ]}
                          onChange={(v) => updateItem(item.id, "type", v)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <CategorySelect
                          value={item.category}
                          options={filteredCats}
                          onChange={(id) => updateItem(item.id, "category", id)}
                          onAddNew={() => { setAddingForItemId(item.id); setAddingForType(dbType); setNewCatName(""); }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none select-none">Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={item.amount}
                            onChange={(e) => updateItem(item.id, "amount", formatRupiah(e.target.value))}
                            className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 text-right"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => removeRow(item.id)}
                          disabled={items.length === 1}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition disabled:opacity-25 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={4} className="px-4 py-2.5">
                    <button onClick={addRow} className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors">
                      <Plus size={14} /> Tambah Baris
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add category modal */}
      {addingForItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Tambah Kategori</h2>
              <button onClick={() => setAddingForItemId(null)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Tipe</label>
                <SimpleSelect
                  value={addingForType}
                  options={[
                    { value: "in", label: "Pemasukan" },
                    { value: "out", label: "Pengeluaran" },
                  ]}
                  onChange={(v) => setAddingForType(v as "in" | "out")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Nama Kategori <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Contoh: Persembahan Misi..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveCat(); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setAddingForItemId(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveCat}
                disabled={!newCatName.trim() || savingCat}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {savingCat && <Loader2 size={14} className="animate-spin" />}
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BudgetAddPage() {
  return (
    <Suspense fallback={null}>
      <BudgetAddInner />
    </Suspense>
  );
}
