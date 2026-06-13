"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/utils/api";
import { ArrowLeft } from "lucide-react";
import { SessionForm, LineItemsTable, SummaryBar } from "../../add/page";
import type { LineItem } from "../../add/page";

type Category = { id: string; name: string; type: string };

function formatRupiah(value: string) {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("id-ID").format(Number(num));
}

function parseRupiah(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

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

export default function CashflowEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("cashflow_categories")
      .select("id, name, type")
      .order("name")
      .then(({ data }) => { if (data) setCategories(data); });
  }, []);

  useEffect(() => {
    supabase
      .from("cashflow_transactions_view")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) { setNotFound(true); setLoading(false); return; }
        setDate(data.transaction_date ?? new Date().toISOString().split("T")[0]);
        setDescription(data.description ?? "");
        setItems([{
          id: data.id ?? Math.random().toString(36).slice(2),
          type: data.type === "in" ? "income" : "expense",
          category: data.category_id ?? "",
          description: data.description ?? "",
          amount: new Intl.NumberFormat("id-ID").format(Number(data.amount ?? 0)),
          notes: data.notes ?? "",
        }]);
        setLoading(false);
      });
  }, [id]);

  const totalIncome = items
    .filter((i) => i.type === "income")
    .reduce((s, i) => s + parseRupiah(i.amount), 0);
  const totalExpense = items
    .filter((i) => i.type === "expense")
    .reduce((s, i) => s + parseRupiah(i.amount), 0);
  const net = totalIncome - totalExpense;

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

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Memuat...</div>;
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
        <p className="text-sm">Transaksi tidak ditemukan.</p>
        <button
          onClick={() => router.push("/finance/cashflow")}
          className="text-sm text-blue-600 hover:underline"
        >
          Kembali ke Cashflow
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/finance/cashflow")}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-semibold text-gray-900">Edit Transaksi</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/finance/cashflow")}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => router.push("/finance/cashflow")}
            className="px-4 py-1.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
          >
            Simpan
          </button>
        </div>
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

        <SummaryBar income={totalIncome} expense={totalExpense} net={net} />
      </div>
    </div>
  );
}
