"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SimpleSelect } from "@/app/(access)/finance/cashflow/add/page";
import type { Database } from "@/types/database.types";
import { supabase } from "@/utils/api";

type Jemaat = Database["public"]["Tables"]["jemaat"]["Row"];
type TitheInsert = Database["public"]["Tables"]["tithes"]["Insert"];

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const PAYMENT_OPTIONS = [
  { value: "tunai", label: "Tunai" },
  { value: "transfer", label: "Transfer Bank" },
  { value: "qris", label: "QRIS" },
];

function formatRupiah(value: string) {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("id-ID").format(Number(num));
}

function parseRupiah(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

interface FormState {
  giver_name: string;
  jemaat_id: string;
  payment_method: string;
  amount: string;
  transaction_date: string;
  period_month: number;
  period_year: number;
  notes: string;
}

export default function PerpuluhanAddPage() {
  const router = useRouter();
  const now = new Date();

  const [form, setForm] = useState<FormState>({
    giver_name: "",
    jemaat_id: "",
    payment_method: "tunai",
    amount: "",
    transaction_date: now.toISOString().split("T")[0],
    period_month: now.getMonth() + 1,
    period_year: now.getFullYear(),
    notes: "",
  });

  const [jemaatList, setJemaatList] = useState<Jemaat[]>([]);
  const [filteredJemaat, setFilteredJemaat] = useState<Jemaat[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadJemaat() {
      const { data } = await supabase
        .from("jemaat")
        .select("id, nama_lengkap, status_jemaat")
        .eq("status_jemaat", "aktif")
        .order("nama_lengkap");
      if (data) setJemaatList(data as Jemaat[]);
    }
    loadJemaat();
  }, []);

  // Autocomplete jemaat from the giver-name field
  useEffect(() => {
    if (!form.giver_name) {
      setFilteredJemaat([]);
      setShowDropdown(false);
      return;
    }
    const q = form.giver_name.toLowerCase();
    const filtered = jemaatList.filter((j) =>
      j.nama_lengkap.toLowerCase().includes(q),
    );
    const exact = jemaatList.some((j) => j.nama_lengkap === form.giver_name);
    setFilteredJemaat(filtered.slice(0, 8));
    setShowDropdown(!exact && filtered.length > 0);
  }, [form.giver_name, jemaatList]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectJemaat(j: Jemaat) {
    setForm((f) => ({ ...f, jemaat_id: j.id, giver_name: j.nama_lengkap }));
    setShowDropdown(false);
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  async function handleSave() {
    setError(null);
    const amount = parseRupiah(form.amount);
    if (!form.giver_name.trim()) {
      setError("Nama pemberi wajib diisi.");
      return;
    }
    if (amount <= 0) {
      setError("Jumlah perpuluhan wajib diisi.");
      return;
    }

    setSaving(true);
    const payload: TitheInsert = {
      amount,
      giver_name: form.giver_name.trim(),
      jemaat_id: form.jemaat_id || null,
      payment_method: form.payment_method,
      transaction_date: form.transaction_date,
      period_month: form.period_month,
      period_year: form.period_year,
      notes: form.notes.trim() || null,
    };

    const { error: insertError } = await supabase.from("tithes").insert(payload);
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push("/finance/perpuluhan");
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top action bar */}
      <div className="flex justify-end items-center gap-2 px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        {error && <p className="text-sm text-red-500 mr-auto">{error}</p>}
        <button
          type="button"
          onClick={() => router.push("/finance/perpuluhan")}
          className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Simpan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 w-full max-w-2xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Pemberi */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Nama <span className="text-red-500">*</span>
              </label>
              <div ref={dropdownRef} className="relative">
                <input
                  type="text"
                  placeholder="Ketik nama (jemaat atau lainnya)..."
                  autoComplete="off"
                  value={form.giver_name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      giver_name: e.target.value,
                      jemaat_id: "",
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {form.jemaat_id && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                    Jemaat
                  </span>
                )}
                {showDropdown && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden max-h-56 overflow-y-auto">
                    {filteredJemaat.map((j) => (
                      <button
                        type="button"
                        key={j.id}
                        onMouseDown={() => selectJemaat(j)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        {j.nama_lengkap}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Jumlah */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Jumlah Perpuluhan <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none select-none">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      amount: formatRupiah(e.target.value),
                    }))
                  }
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm text-right font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Tanggal */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Tanggal Diterima <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.transaction_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, transaction_date: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Periode bulan */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Periode Bulan
              </label>
              <SimpleSelect
                value={String(form.period_month)}
                options={MONTHS_ID.map((m, i) => ({
                  value: String(i + 1),
                  label: m,
                }))}
                onChange={(v) =>
                  setForm((f) => ({ ...f, period_month: Number(v) }))
                }
              />
            </div>

            {/* Periode tahun */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Periode Tahun
              </label>
              <SimpleSelect
                value={String(form.period_year)}
                options={yearOptions.map((y) => ({
                  value: String(y),
                  label: String(y),
                }))}
                onChange={(v) =>
                  setForm((f) => ({ ...f, period_year: Number(v) }))
                }
              />
            </div>

            {/* Metode Pembayaran */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Metode Pembayaran
              </label>
              <SimpleSelect
                value={form.payment_method}
                options={PAYMENT_OPTIONS}
                onChange={(v) =>
                  setForm((f) => ({ ...f, payment_method: v }))
                }
              />
            </div>

            {/* Catatan */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Catatan <span className="text-gray-400">(opsional)</span>
              </label>
              <input
                type="text"
                placeholder="Keterangan tambahan..."
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
