// config/reportConfigs.tsx
import type { ReportConfig } from "@/types/report.types";

export const REPORT_CONFIGS: ReportConfig[] = [
  // ─── JEMAAT ────────────────────────────────────────────────────────────────
  {
    id: "jemaat",
    label: "Data Jemaat",
    allowedRoles: ["admin"], // ← admin only
    table: "jemaat",
    select: "*",
    searchColumn: "nama_lengkap",
    defaultSort: { column: "nama_lengkap", ascending: true },
    filters: [
      {
        key: "gender",
        label: "Jenis Kelamin",
        type: "select",
        options: [
          { value: "L", label: "Laki-laki" },
          { value: "P", label: "Perempuan" },
        ],
      },
      {
        key: "status_jemaat",
        label: "Status Jemaat",
        type: "multiselect",
        options: [
          { value: "aktif",       label: "Aktif" },
          { value: "tidak aktif", label: "Tidak Aktif" },
          { value: "pindah",      label: "Pindah" },
          { value: "meninggal",   label: "Meninggal" },
        ],
      },
      {
        key: "is_baptized",
        label: "Status Baptis",
        type: "select",
        options: [
          { value: "true",  label: "Sudah Baptis" },
          { value: "false", label: "Belum Baptis" },
        ],
      },
      {
        key: "marital_status",
        label: "Status Pernikahan",
        type: "multiselect",
        options: [
          { value: "single",   label: "Single" },
          { value: "married",  label: "Menikah" },
          { value: "divorced", label: "Cerai" },
          { value: "widowed",  label: "Janda/Duda" },
        ],
      },
      {
        key: "discipleship_stage",
        label: "Tahap Pemuridan",
        type: "multiselect",
        options: [
          { value: "Come",  label: "Come" },
          { value: "Grow",  label: "Grow" },
          { value: "Serve", label: "Serve" },
          { value: "Lead",  label: "Lead" },
        ],
      },
      {
        key: "alamat",
        label: "Alamat",
        type: "text",
        placeholder: "Cari berdasarkan alamat...",
      },
      {
        key: "tanggal_join",
        label: "Tanggal Join",
        type: "date_range",
      },
      {
        key: "dob",
        label: "Tanggal Lahir",
        type: "date_range",
      },
    ],
    columns: [
      { key: "nama_lengkap", label: "Nama Lengkap", editable: true, inputType: "text" },
      { key: "email",        label: "Email",         editable: true, inputType: "email" },
      { key: "phone_number", label: "No. Telepon",   editable: true, inputType: "text" },
      {
        key: "gender",
        label: "Gender",
        editable: true,
        inputType: "select",
        options: [
          { value: "L", label: "Laki-laki" },
          { value: "P", label: "Perempuan" },
        ],
        render: (v) => (v === "L" ? "Laki-laki" : v === "P" ? "Perempuan" : "-"),
      },
      {
        key: "status_jemaat",
        label: "Status",
        editable: true,
        inputType: "select",
        options: [
          { value: "aktif",       label: "Aktif" },
          { value: "tidak aktif", label: "Tidak Aktif" },
          { value: "pindah",      label: "Pindah" },
          { value: "meninggal",   label: "Meninggal" },
        ],
        render: (v) => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            v === "aktif"       ? "bg-green-100 text-green-800" :
            v === "tidak aktif" ? "bg-red-100 text-red-800" :
            "bg-gray-100 text-gray-600"
          }`}>
            {v ?? "-"}
          </span>
        ),
      },
      {
        key: "is_baptized",
        label: "Baptis",
        editable: true,
        inputType: "select",
        valueType: "boolean",
        options: [
          { value: "true",  label: "Sudah Baptis" },
          { value: "false", label: "Belum Baptis" },
        ],
        render: (v) => (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            v ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500"
          }`}>
            {v ? "Sudah" : "Belum"}
          </span>
        ),
      },
      {
        key: "marital_status",
        label: "Status Nikah",
        editable: true,
        inputType: "select",
        options: [
          { value: "single",   label: "Single" },
          { value: "married",  label: "Menikah" },
          { value: "divorced", label: "Cerai" },
          { value: "widowed",  label: "Janda/Duda" },
        ],
      },
      {
        key: "discipleship_stage",
        label: "Pemuridan",
        editable: true,
        inputType: "select",
        options: [
          { value: "Come",  label: "Come" },
          { value: "Grow",  label: "Grow" },
          { value: "Serve", label: "Serve" },
          { value: "Lead",  label: "Lead" },
        ],
      },
      {
        key: "tanggal_join",
        label: "Tanggal Join",
        editable: true,
        inputType: "date",
        render: (v) => v ? new Date(v).toLocaleDateString("id-ID") : "-",
      },
      { key: "alamat", label: "Alamat", editable: true, inputType: "textarea" },
    ],
  },

  // ─── ICARE REPORT ──────────────────────────────────────────────────────────
  {
    id: "icare_report",
    label: "Laporan iCare",
    allowedRoles: ["admin", "leader"], // ← both roles
    table: "icare_meetings",
    select: `*, icare_groups(nama_icare, lokasi_pertemuan, jemaat(nama_lengkap), icare_members(id))`,
    searchColumn: "topik",
    defaultSort: { column: "tanggal", ascending: false },
    filters: [
      {
        key: "tanggal",
        label: "Tanggal Pertemuan",
        type: "date_range",
      },
      {
        key: "jumlah_hadir",
        label: "Jumlah Kehadiran",
        type: "number_range",
      },
    ],
    transformForExport: (rows: any[]) =>
      rows.map((row) => {
        const group = row.icare_groups ?? {};
        return {
          "Nama iCare":     group.nama_icare ?? "-",
          "Leader":         group.jemaat?.nama_lengkap ?? "-",
          "Hari Pertemuan": row.tanggal
            ? new Date(row.tanggal).toLocaleDateString("id-ID", { weekday: "long" })
            : "-",
          "Lokasi iCare":   group.lokasi_pertemuan ?? "-",
          "Tanggal":        row.tanggal
            ? new Date(row.tanggal).toLocaleDateString("id-ID", {
                day: "numeric", month: "long", year: "numeric",
              })
            : "-",
          "Jumlah Hadir":   row.jumlah_hadir ?? 0,
          "Topik":          row.topik ?? "-",
          "Catatan":        row.catatan ?? "-",
        };
      }),
    columns: [
      {
        key: "icare_groups",
        label: "Nama iCare",
        render: (_, row) => row.icare_groups?.nama_icare ?? "-",
      },
      {
        key: "leader_id",
        label: "Leader",
        render: (_, row) => row.icare_groups?.jemaat?.nama_lengkap ?? "-",
      },
      {
        key: "hari",
        label: "Hari",
        render: (_, row) =>
          row.tanggal
            ? new Date(row.tanggal).toLocaleDateString("id-ID", { weekday: "long" })
            : "-",
      },
      {
        key: "tanggal",
        label: "Tanggal",
        render: (v) =>
          v
            ? new Date(v).toLocaleDateString("id-ID", {
                day: "numeric", month: "short", year: "numeric",
              })
            : "-",
      },
      {
        key: "jumlah_hadir",
        label: "Jumlah Hadir",
        editable: true,
        inputType: "number",
        render: (v) => (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-700 tabular-nums">
            {v ?? 0}
          </span>
        ),
      },
      {
        key: "topik",
        label: "Topik",
        editable: true,
        inputType: "text",
        render: (v) => <span className="text-sm text-gray-700">{v ?? "-"}</span>,
      },
      {
        key: "lokasi",
        label: "Lokasi",
        render: (v) => <span className="text-sm text-gray-600">{v ?? "-"}</span>,
      },
      {
        key: "catatan",
        label: "Catatan",
        editable: true,
        inputType: "textarea",
        render: (v) => (
          <span className="text-sm text-gray-500 max-w-xs truncate">{v ?? "-"}</span>
        ),
      },
    ],
  },

  // ─── USHER ATTENDANCE REPORTS ──────────────────────────────────────────────
  {
    id: "usher_attendance",
    label: "Kehadiran Ibadah",
    allowedRoles: ["admin", "leader"], // ← both roles
    table: "attendance_reports",
    select: `
      id,
      total_members,
      total_visitors,
      notes,
      submitted_at,
      event_occurrences(
        occurrence_date,
        start_time,
        end_time,
        events(event_name, event_type, location)
      )
    `,
    searchColumn: "notes",
    defaultSort: { column: "submitted_at", ascending: false },
    filters: [
      {
        key: "submitted_at",
        label: "Tanggal Laporan",
        type: "date_range",
      },
      {
        key: "total_members",
        label: "Jumlah Jemaat",
        type: "number_range",
      },
      {
        key: "total_visitors",
        label: "Jumlah Tamu",
        type: "number_range",
      },
    ],
    transformForExport: (rows: any[]) =>
      rows.map((row) => {
        const occ   = row.event_occurrences ?? {};
        const ev    = occ.events ?? {};
        const total = (row.total_members ?? 0) + (row.total_visitors ?? 0);
        return {
          "Nama Event":      ev.event_name  ?? "-",
          "Tipe Event":      ev.event_type  ?? "-",
          "Lokasi":          ev.location    ?? "-",
          "Tanggal":         occ.occurrence_date
            ? new Date(occ.occurrence_date).toLocaleDateString("id-ID", {
                day: "numeric", month: "long", year: "numeric",
              })
            : "-",
          "Jam Mulai":       occ.start_time ? occ.start_time.slice(0, 5) : "-",
          "Jam Selesai":     occ.end_time   ? occ.end_time.slice(0, 5)   : "-",
          "Jemaat (member)": row.total_members  ?? 0,
          "Tamu (visitor)":  row.total_visitors ?? 0,
          "Total Hadir":     total,
          "Catatan":         row.notes ?? "-",
          "Dilaporkan Pada": row.submitted_at
            ? new Date(row.submitted_at).toLocaleDateString("id-ID", {
                day: "numeric", month: "long", year: "numeric",
              })
            : "-",
        };
      }),
    columns: [
      {
        key: "event_occurrences",
        label: "Nama Event",
        render: (_, row) => row.event_occurrences?.events?.event_name ?? "-",
      },
      {
        key: "event_type",
        label: "Tipe",
        render: (_, row) => {
          const v = row.event_occurrences?.events?.event_type;
          return v ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
              {v}
            </span>
          ) : "-";
        },
      },
      {
        key: "occurrence_date",
        label: "Tanggal",
        render: (_, row) => {
          const d = row.event_occurrences?.occurrence_date;
          if (!d) return "-";
          return new Date(d).toLocaleDateString("id-ID", {
            day: "numeric", month: "short", year: "numeric",
          });
        },
      },
      {
        key: "start_time",
        label: "Waktu",
        render: (_, row) => {
          const s = row.event_occurrences?.start_time;
          const e = row.event_occurrences?.end_time;
          if (!s) return "-";
          return e ? `${s.slice(0, 5)}–${e.slice(0, 5)}` : s.slice(0, 5);
        },
      },
      {
        key: "total_members",
        label: "Jemaat",
        editable: true,
        inputType: "number",
        render: (v) => (
          <span className="font-semibold tabular-nums text-gray-700">{v ?? 0}</span>
        ),
      },
      {
        key: "total_visitors",
        label: "Tamu",
        editable: true,
        inputType: "number",
        render: (v) => (
          <span className="font-semibold tabular-nums text-gray-700">{v ?? 0}</span>
        ),
      },
      {
        key: "total_hadir",
        label: "Total",
        render: (_, row) => {
          const total = (row.total_members ?? 0) + (row.total_visitors ?? 0);
          return (
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-900 text-white tabular-nums">
              {total}
            </span>
          );
        },
      },
      {
        key: "location",
        label: "Lokasi",
        render: (_, row) => row.event_occurrences?.events?.location ?? "-",
      },
      {
        key: "notes",
        label: "Catatan",
        editable: true,
        inputType: "textarea",
      },
      {
        key: "created_at",
        label: "Dilaporkan",
        render: (v) =>
          v
            ? new Date(v).toLocaleDateString("id-ID", {
                day: "numeric", month: "short", year: "numeric",
              })
            : "-",
      },
    ],
  },

  // ─── FINANCE: CASHFLOW TRANSACTIONS ────────────────────────────────────────
  {
    id: "cashflow_transactions",
    label: "Transaksi Keuangan",
    allowedRoles: ["finance", "admin"],
    table: "cashflow_transactions_view",
    select: "*",
    searchColumn: "description",
    defaultSort: { column: "transaction_date", ascending: false },
    filters: [
      {
        key: "type",
        label: "Tipe",
        type: "select",
        options: [
          { value: "in",  label: "Masuk (Pemasukan)" },
          { value: "out", label: "Keluar (Pengeluaran)" },
        ],
      },
      {
        key: "transaction_date",
        label: "Tanggal",
        type: "date_range",
      },
      {
        key: "amount",
        label: "Jumlah",
        type: "number_range",
      },
    ],
    columns: [
      {
        key: "transaction_date",
        label: "Tanggal",
        editable: true,
        inputType: "date",
        render: (v) =>
          v
            ? new Date(v).toLocaleDateString("id-ID", {
                day: "numeric", month: "short", year: "numeric",
              })
            : "-",
      },
      { key: "description", label: "Deskripsi", editable: true, inputType: "text" },
      {
        key: "category_name",
        label: "Kategori",
        render: (v) =>
          v ? (
            <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-lg">
              {v}
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          ),
      },
      {
        key: "type",
        label: "Tipe",
        editable: true,
        inputType: "select",
        options: [
          { value: "in",  label: "Masuk (Pemasukan)" },
          { value: "out", label: "Keluar (Pengeluaran)" },
        ],
        render: (v) => (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
              v === "in"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-600 border-red-200"
            }`}
          >
            {v === "in" ? "Masuk" : "Keluar"}
          </span>
        ),
      },
      {
        key: "amount",
        label: "Jumlah",
        editable: true,
        inputType: "number",
        render: (v, row) => (
          <span
            className={`font-semibold tabular-nums ${
              row.type === "in" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {row.type === "out" ? "−" : "+"}Rp{" "}
            {Number(v ?? 0).toLocaleString("id-ID")}
          </span>
        ),
      },
      { key: "reference_no", label: "No. Ref",  editable: true, inputType: "text" },
      { key: "notes",        label: "Catatan",  editable: true, inputType: "textarea" },
    ],
    transformForExport: (rows: any[]) =>
      rows.map((row) => ({
        "Tanggal": row.transaction_date
          ? new Date(row.transaction_date).toLocaleDateString("id-ID", {
              day: "numeric", month: "long", year: "numeric",
            })
          : "-",
        "Deskripsi":       row.description    ?? "-",
        "Kategori":        row.category_name  ?? "-",
        "Tipe":            row.type === "in"  ? "Masuk" : "Keluar",
        "Jumlah":          Number(row.amount  ?? 0),
        "No. Referensi":   row.reference_no   ?? "-",
        "Catatan":         row.notes          ?? "-",
      })),
  },

  // ─── EVENTS ────────────────────────────────────────────────────────────────
  {
    id: "events",
    label: "Events",
    allowedRoles: ["admin", "leader"], // ← both roles
    table: "events",
    select: "*",
    searchColumn: "event_name",
    defaultSort: { column: "event_date", ascending: false },
    filters: [
      {
        key: "event_type",
        label: "Tipe Event",
        type: "multiselect",
        options: [
          "Ibadah Umum","Ibadah Pemuda","Ibadah Anak","Retreat",
          "Seminar","Konser","Baptisan","Pernikahan","Lainnya",
        ].map((d) => ({ value: d, label: d })),
      },
      {
        key: "event_date",
        label: "Tanggal Event",
        type: "date_range",
      },
      {
        key: "location",
        label: "Lokasi",
        type: "text",
        placeholder: "Cari lokasi event...",
      },
    ],
    columns: [
      { key: "event_name", label: "Nama Event", editable: true, inputType: "text" },
      {
        key: "event_type",
        label: "Tipe",
        editable: true,
        inputType: "select",
        options: [
          { value: "Ibadah Umum", label: "Ibadah Umum" },
          { value: "Ibadah Pemuda", label: "Ibadah Pemuda" },
          { value: "Ibadah Anak", label: "Ibadah Anak" },
          { value: "Retreat", label: "Retreat" },
          { value: "Seminar", label: "Seminar" },
          { value: "Konser", label: "Konser" },
          { value: "Baptisan", label: "Baptisan" },
          { value: "Pernikahan", label: "Pernikahan" },
          { value: "Lainnya", label: "Lainnya" },
        ],
        render: (v) =>
          v ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
              {v}
            </span>
          ) : "-",
      },
      {
        key: "event_date",
        label: "Tanggal",
        editable: true,
        inputType: "date",
        render: (v) =>
          v
            ? new Date(v).toLocaleDateString("id-ID", {
                day: "numeric", month: "long", year: "numeric",
              })
            : "-",
      },
      {
        key: "start_time",
        label: "Waktu",
        editable: true,
        inputType: "text",
        render: (v, row) => {
          if (!v) return "-";
          const fmt = (t: string) => t.slice(0, 5);
          return row.end_time ? `${fmt(v)} – ${fmt(row.end_time)}` : fmt(v);
        },
      },
      { key: "location", label: "Lokasi", editable: true, inputType: "text" },
      { key: "description", label: "Deskripsi", editable: true, inputType: "textarea" },
    ],
  },
];