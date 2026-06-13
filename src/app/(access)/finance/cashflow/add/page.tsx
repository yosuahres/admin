"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/utils/api";

export type LineItem = {
  id: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: string;
  notes: string;
};

type Category = { id: string; name: string; type: string };

function newItem(): LineItem {
  return {
    id: Math.random().toString(36).slice(2),
    type: "income",
    category: "",
    description: "",
    amount: "",
    notes: "",
  };
}

function formatRupiah(value: string) {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("id-ID").format(Number(num));
}

function parseRupiah(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

function displayRupiah(n: number) {
  return "Rp " + new Intl.NumberFormat("id-ID").format(n);
}

export default function CashflowAddPage() {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("cashflow_categories")
      .select("id, name, type")
      .order("name")
      .then(({ data }) => { if (data) setCategories(data); });
  }, []);

  function addRow() {
    setItems((prev) => [...prev, newItem()]);
  }

  function removeRow(id: string) {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateItem(id: string, field: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, [field]: value, ...(field === "type" ? { category: "" } : {}) }
          : i
      )
    );
  }

  async function handleSave() {
    setError(null);
    const validItems = items.filter((i) => i.description.trim() && parseRupiah(i.amount) > 0);
    if (!date) { setError("Tanggal wajib diisi."); return; }
    if (validItems.length === 0) { setError("Minimal satu baris harus memiliki deskripsi dan jumlah."); return; }

    setSaving(true);
    const rows = validItems.map((i) => ({
      transaction_date: date,
      description: i.description.trim(),
      type: i.type === "income" ? "in" : "out",
      category_id: i.category || null,
      amount: parseRupiah(i.amount),
      notes: i.notes.trim() || (description.trim() ? description.trim() : null),
    }));

    const { error: insertError } = await supabase.from("cashflow_transactions").insert(rows);
    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    router.push("/finance/cashflow");
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex justify-end items-center gap-2 px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        {error && <p className="text-sm text-red-500 mr-auto">{error}</p>}
        <button
          onClick={() => router.push("/finance/cashflow")}
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

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <SessionForm
          date={date}
          description={description}
          onDateChange={setDate}
          onDescriptionChange={setDescription}
        />

        <LineItemsTable
          items={items}
          categories={categories}
          onAdd={addRow}
          onRemove={removeRow}
          onUpdate={updateItem}
          onCategoryAdded={(cat) =>
            setCategories((prev) =>
              [...prev, cat].sort((a, b) => a.name.localeCompare(b.name))
            )
          }
        />

      </div>
    </div>
  );
}

/* ── Shared sub-components ───────────────────────────────────────── */

function SimpleSelect({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        !dropdownRef.current?.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className={`relative w-full ${className ?? ""}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400 text-left"
      >
        <span className="text-gray-700">{selected?.label}</span>
        <ChevronDown size={13} className="text-gray-400 shrink-0 ml-1" />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 140), zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 overflow-hidden"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${
                value === opt.value ? "font-semibold text-blue-600" : "text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

function CategorySelect({
  value,
  options,
  onChange,
  onAddNew,
}: {
  value: string;
  options: Category[];
  onChange: (id: string) => void;
  onAddNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((c) => c.id === value);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        !dropdownRef.current?.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative w-full">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400 text-left"
      >
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.name : "— Pilih —"}
        </span>
        <ChevronDown size={13} className="text-gray-400 shrink-0 ml-1" />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 180), zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto"
        >
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-50"
          >
            — Pilih —
          </button>
          {options.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => { onChange(cat.id); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${
                value === cat.id ? "font-semibold text-blue-600" : "text-gray-700"
              }`}
            >
              {cat.name}
            </button>
          ))}
          <div className="border-t border-gray-100 my-1" />
          <button
            type="button"
            onClick={() => { setOpen(false); onAddNew(); }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 font-medium"
          >
            <Plus size={13} />
            Tambah Kategori
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

export function SessionForm({
  date,
  description,
  onDateChange,
  onDescriptionChange,
}: {
  date: string;
  description: string;
  onDateChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            Tanggal <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Keterangan</label>
          <input
            type="text"
            placeholder="Misal: Kebaktian Minggu Pagi..."
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}

export function LineItemsTable({
  items,
  categories,
  onAdd,
  onRemove,
  onUpdate,
  onCategoryAdded,
}: {
  items: LineItem[];
  categories: Category[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof LineItem, value: string) => void;
  onCategoryAdded: (cat: Category) => void;
}) {
  const [addingForItemId, setAddingForItemId] = useState<string | null>(null);
  const [addingForType, setAddingForType] = useState<"in" | "out">("in");
  const [newCatName, setNewCatName] = useState("");
  const [saving, setSaving] = useState(false);

  function openAddCat(itemId: string, itemType: "income" | "expense") {
    setAddingForItemId(itemId);
    setAddingForType(itemType === "income" ? "in" : "out");
    setNewCatName("");
  }

  function closeModal() {
    setAddingForItemId(null);
    setNewCatName("");
  }

  async function handleSaveCat() {
    if (!newCatName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("cashflow_categories")
      .insert({ name: newCatName.trim(), type: addingForType })
      .select("id, name, type")
      .single();
    setSaving(false);
    if (error || !data) return;
    onCategoryAdded(data);
    if (addingForItemId) onUpdate(addingForItemId, "category", data.id);
    closeModal();
  }

  return (
    <>
      <div className="flex flex-col w-full border border-gray-200 bg-white rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-black bg-gray-100 w-36">Tipe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-black bg-gray-100 w-52">Kategori</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-black bg-gray-100">Deskripsi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-black bg-gray-100 w-40">Jumlah</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-black bg-gray-100 w-40">Catatan</th>
                <th className="px-4 py-3 bg-gray-100 w-10" />
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
                        onChange={(v) => onUpdate(item.id, "type", v)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <CategorySelect
                        value={item.category}
                        options={filteredCats}
                        onChange={(id) => onUpdate(item.id, "category", id)}
                        onAddNew={() => openAddCat(item.id, item.type)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="Deskripsi..."
                        value={item.description}
                        onChange={(e) => onUpdate(item.id, "description", e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
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
                          onChange={(e) => onUpdate(item.id, "amount", formatRupiah(e.target.value))}
                          className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 text-right"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="Opsional..."
                        value={item.notes}
                        onChange={(e) => onUpdate(item.id, "notes", e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => onRemove(item.id)}
                        disabled={items.length === 1}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition disabled:opacity-25 disabled:cursor-not-allowed"
                        title="Hapus baris"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={6} className="px-4 py-2.5">
                  <button
                    onClick={onAdd}
                    className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  >
                    <Plus size={14} />
                    Tambah Baris
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Category Modal */}
      {addingForItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Tambah Kategori</h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
              >
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
                onClick={closeModal}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveCat}
                disabled={!newCatName.trim() || saving}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function SummaryBar({
  income,
  expense,
  net,
}: {
  income: number;
  expense: number;
  net: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-0 bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-5 border-r border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Total Pemasukan</p>
        <p className="text-xl font-bold text-green-600">{displayRupiah(income)}</p>
      </div>
      <div className="px-6 py-5 border-r border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Total Pengeluaran</p>
        <p className="text-xl font-bold text-red-500">{displayRupiah(expense)}</p>
      </div>
      <div className="px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Saldo</p>
        <p className={`text-xl font-bold ${net >= 0 ? "text-gray-800" : "text-red-600"}`}>
          {displayRupiah(net)}
        </p>
      </div>
    </div>
  );
}
