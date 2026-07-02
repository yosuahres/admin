//usher/attendance/history/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type PastReport = {
  id: string;
  submitted_at: string;
  total_members: number;
  total_visitors: number;
  total_kids: number;
  is_official: boolean;
  notes: string | null;
  event_occurrences: {
    occurrence_date: string;
    events: { event_name: string } | null;
  } | null;
};

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

export default function UsherAttendanceHistoryPage() {
  const supabase = createClient();
  const [history, setHistory] = useState<PastReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("attendance_reports")
        .select(
          `id, submitted_at, total_members, total_visitors, total_kids, is_official, notes,
           event_occurrences(occurrence_date, events(event_name))`
        )
        .eq("submitted_by", user.id)
        .order("submitted_at", { ascending: false })
        .limit(50);
      setHistory((data as any) ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-end">
        {!loading && history.length > 0 && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {history.length} laporan
          </span>
        )}
      </div>

      {loading ? (
        <Card className="p-8 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
        </Card>
      ) : history.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-gray-400 mb-3">Belum ada laporan yang dikirim.</p>
          <Link
            href="/usher/attendance"
            className="text-sm font-medium text-gray-900 underline underline-offset-2"
          >
            Buat laporan pertama
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {history.map((report) => {
            const total = report.total_members + report.total_visitors + report.total_kids;

            return (
              <Card key={report.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {report.event_occurrences?.events?.event_name ?? "—"}
                      </span>
                      {report.is_official && (
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-100 uppercase tracking-wide">
                          Resmi
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {report.event_occurrences?.occurrence_date
                        ? fmtShortDate(report.event_occurrences.occurrence_date)
                        : "—"}
                      {" · "}
                      Dikirim{" "}
                      {report.submitted_at ? fmtShortDate(report.submitted_at) : "—"}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-lg font-semibold text-gray-900 tabular-nums">
                      {total.toLocaleString("id-ID")}
                    </div>
                    <div className="text-[11px] text-gray-400">hadir</div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                  <span>
                    <span className="font-medium text-gray-700">
                      {report.total_members.toLocaleString("id-ID")}
                    </span>{" "}
                    jemaat
                  </span>
                  <span>
                    <span className="font-medium text-gray-700">
                      {report.total_visitors.toLocaleString("id-ID")}
                    </span>{" "}
                    tamu
                  </span>
                  <span>
                    <span className="font-medium text-gray-700">
                      {report.total_kids.toLocaleString("id-ID")}
                    </span>{" "}
                    anak
                  </span>
                </div>

                {report.notes && (
                  <p className="mt-2 text-xs text-gray-400 italic">{report.notes}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}