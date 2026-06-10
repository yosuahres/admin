//usher/attendance/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Occurrence = {
  id: string;
  occurrence_date: string;
  start_time: string | null;
  end_time: string | null;
  events: {
    event_name: string;
    event_type: string | null;
    location: string | null;
  };
};

const EMPTY_FORM = {
  total_members: "",
  total_visitors: "",
  notes: "",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtTime(t: string | null) {
  return t ? t.slice(0, 5) : null;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

export default function UsherAttendancePage() {
  const router = useRouter();
  const supabase = createClient();

  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [selectedOcc, setSelectedOcc] = useState<Occurrence | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [loadingOcc, setLoadingOcc] = useState(true);

  useEffect(() => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const nextWeek = new Date(today);
    nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
    
    const fromDate = today.toISOString().split("T")[0];
    const toDate = nextWeek.toISOString().split("T")[0];
    
    supabase
      .from("event_occurrences")
      .select(
        "id, occurrence_date, start_time, end_time, events(event_name, event_type, location)"
      )
      .eq("is_cancelled", false)
      .gte("occurrence_date", fromDate)
      .lte("occurrence_date", toDate)
      .order("occurrence_date", { ascending: true })
      .limit(20)
      .then(({ data }) => {
        setOccurrences((data as any) ?? []);
        setLoadingOcc(false);
      });
  }, []);

  const setField = (key: string, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!selectedOcc) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { error } = await supabase.from("attendance_reports").insert({
      occurrence_id: selectedOcc.id,
      submitted_by: user.id,
      total_members: parseInt(form.total_members || "0"),
      total_visitors: parseInt(form.total_visitors || "0"),
      notes: form.notes || null,
    });

    if (error) alert(`Gagal menyimpan: ${error.message}`);
    else setSubmitDone(true);

    setSubmitting(false);
  };

  const resetForm = () => {
    setSubmitDone(false);
    setSelectedOcc(null);
    setForm(EMPTY_FORM);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {submitDone ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10L8 14L16 6"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Laporan Terkirim</h3>
          <p className="text-sm text-gray-500 mb-5">
            Laporan untuk{" "}
            <span className="font-medium text-gray-700">
              {selectedOcc?.events.event_name}
            </span>{" "}
            telah disimpan.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Laporan Lagi
            </button>
            <Link
              href="/usher/attendance/history"
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Lihat Riwayat
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div>
            {loadingOcc ? (
              <Card className="p-6 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
              </Card>
            ) : occurrences.length === 0 ? (
              <Card className="p-6 text-center text-sm text-gray-400">
                Tidak ada event tersedia dalam 7 hari ke depan.
              </Card>
            ) : (
              <Card>
                <div className="divide-y divide-gray-100">
                  {occurrences.map((occ) => {
                    const isSelected = selectedOcc?.id === occ.id;
                    const startTime = fmtTime(occ.start_time);
                    const endTime = fmtTime(occ.end_time);
                    return (
                      <button
                        key={occ.id}
                        onClick={() => setSelectedOcc(isSelected ? null : occ)}
                        className={`w-full text-left px-4 py-3.5 transition-colors first:rounded-t-xl last:rounded-b-xl flex items-center justify-between gap-3 ${
                          isSelected ? "bg-gray-900 text-white" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className={`text-sm font-medium truncate ${isSelected ? "text-white" : "text-gray-900"}`}>
                            {occ.events.event_name}
                          </div>
                          <div className={`text-xs mt-0.5 ${isSelected ? "text-gray-300" : "text-gray-400"}`}>
                            {fmtDate(occ.occurrence_date)}
                            {startTime && <> · {startTime}{endTime ? `–${endTime}` : ""}</>}
                            {occ.events.location && <> · {occ.events.location}</>}
                          </div>
                        </div>
                        {occ.events.event_type && (
                          <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                            isSelected
                              ? "border-white/30 text-gray-200 bg-white/10"
                              : "border-gray-200 text-gray-500 bg-gray-50"
                          }`}>
                            {occ.events.event_type}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {selectedOcc && (
            <>
              <div>
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "total_members", label: "Jemaat (member)" },
                      { key: "total_visitors", label: "Pengunjung (tamu)" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                          {label}
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={form[key as keyof typeof form] as string}
                          onChange={(e) => setField(key, e.target.value)}
                          placeholder="0"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div>
                <Card className="p-4">
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="Keterangan tambahan, kondisi khusus, dll..."
                    className="w-full text-sm text-gray-900 placeholder-gray-300 resize-none outline-none"
                  />
                </Card>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {submitting ? "Menyimpan..." : "Kirim Laporan"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}