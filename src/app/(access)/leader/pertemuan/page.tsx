"use client";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  ListFilter,
  MapPin,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSetPageActions } from "@/contexts/page-actions";

type IcareGroup = {
  id: string;
  nama_icare: string;
  lokasi_pertemuan: string | null;
};

type Jemaat = {
  id: string;
  nama_lengkap: string;
};

type Meeting = {
  id: string;
  tanggal: string;
  topik: string | null;
  jumlah_hadir: number;
  catatan: string | null;
  lokasi: string | null;
};

type AttendanceMap = Record<string, boolean>;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CheckboxRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm text-left w-full transition-colors ${
        checked
          ? "bg-blue-50 border-blue-200 text-blue-800"
          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
      }`}
    >
      <div
        className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
          checked ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
        }`}
      >
        {checked && <Check size={10} className="text-white" strokeWidth={3} />}
      </div>
      <span className="truncate">{label}</span>
    </button>
  );
}

const ALL_COLUMNS = [
  { key: "tanggal", label: "Tanggal" },
  { key: "topik", label: "Topik / Firman" },
  { key: "lokasi", label: "Lokasi" },
  { key: "jumlah_hadir", label: "Kehadiran" },
  { key: "catatan", label: "Catatan" },
];

export default function PertemuanPage() {
  const [authorized, setAuthorized] = useState(false);
  const [group, setGroup] = useState<IcareGroup | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Jemaat[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadError, setLoadError] = useState<"no_jemaat" | "no_group" | null>(null);

  // stable refs so header-registered callbacks always see latest data
  const groupRef = useRef<IcareGroup | null>(null);
  const membersRef = useRef<Jemaat[]>([]);
  useEffect(() => { groupRef.current = group; }, [group]);
  useEffect(() => { membersRef.current = members; }, [members]);

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [topik, setTopik] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [catatan, setCatatan] = useState("");
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState("");
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // toolbar
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("tanggal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [colsOpen, setColsOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const colsRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openAddModalRef = useRef<() => void>(() => {});

  const supabase = createClient();

  useEffect(() => {
    if (localStorage.getItem("role") !== "leader") {
      window.location.href = "/login";
      return;
    }
    setAuthorized(true);
    loadData();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) setColsOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadData = async () => {
    setLoadingPage(true);
    setLoadError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingPage(false); return; }

    const { data: self } = await supabase.from("jemaat").select("id").eq("user_id", user.id).maybeSingle();
    if (!self) { setLoadError("no_jemaat"); setLoadingPage(false); return; }

    const { data: g } = await supabase
      .from("icare_groups").select("id, nama_icare, lokasi_pertemuan")
      .eq("leader_id", self.id).maybeSingle();
    if (!g) { setLoadError("no_group"); setLoadingPage(false); return; }

    setGroup(g);
    groupRef.current = g;

    const { data: icareMembers } = await supabase
      .from("icare_members").select("jemaat(id, nama_lengkap)")
      .eq("icare_id", g.id).order("join_date", { ascending: true });

    const membersData: Jemaat[] = (icareMembers ?? [])
      .map((r: any) => r.jemaat).filter(Boolean)
      .sort((a: Jemaat, b: Jemaat) => a.nama_lengkap.localeCompare(b.nama_lengkap));

    setMembers(membersData);
    membersRef.current = membersData;

    const { data: meetingsData } = await supabase
      .from("icare_meetings").select("id, tanggal, topik, jumlah_hadir, catatan, lokasi")
      .eq("icare_id", g.id).order("tanggal", { ascending: false });

    setMeetings(meetingsData ?? []);
    setLoadingPage(false);
  };

  const blankAttendance = (list: Jemaat[]): AttendanceMap => {
    const map: AttendanceMap = {};
    list.forEach((m) => { map[m.id] = false; });
    return map;
  };

  const openAddModal = () => {
    const g = groupRef.current;
    const m = membersRef.current;
    setEditingMeeting(null);
    setTanggal(new Date().toISOString().split("T")[0]);
    setTopik("");
    setLokasi(g?.lokasi_pertemuan ?? "");
    setCatatan("");
    setAttendance(blankAttendance(m));
    setFormError("");
    setShowModal(true);
  };
  openAddModalRef.current = openAddModal;

  useSetPageActions({
    addLabel: "Catat Pertemuan",
    onAdd: () => openAddModalRef.current(),
  });

  const openEditModal = async (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setTanggal(meeting.tanggal);
    setTopik(meeting.topik ?? "");
    setLokasi(meeting.lokasi ?? "");
    setCatatan(meeting.catatan ?? "");
    setAttendance(blankAttendance(membersRef.current));
    setFormError("");
    setShowModal(true);

    setLoadingAttendance(true);
    const { data } = await supabase
      .from("icare_attendance").select("jemaat_id, hadir").eq("meeting_id", meeting.id);
    if (data) {
      const map = blankAttendance(membersRef.current);
      data.forEach((r: any) => { map[r.jemaat_id] = r.hadir; });
      setAttendance(map);
    }
    setLoadingAttendance(false);
  };

  const closeModal = () => { setShowModal(false); setEditingMeeting(null); };

  const handleSave = async () => {
    if (!groupRef.current || !tanggal) { setFormError("Tanggal wajib diisi."); return; }
    setFormError(""); setSubmitting(true);
    const jumlah_hadir = Object.values(attendance).filter(Boolean).length;
    const currentMembers = membersRef.current;

    if (editingMeeting) {
      const { error: mErr } = await supabase.from("icare_meetings").update({
        tanggal, topik: topik || null, lokasi: lokasi || null, catatan: catatan || null, jumlah_hadir,
      }).eq("id", editingMeeting.id);
      if (mErr) { setFormError(mErr.message); setSubmitting(false); return; }
      if (currentMembers.length > 0) {
        await supabase.from("icare_attendance").delete().eq("meeting_id", editingMeeting.id);
        const rows = currentMembers.map((m) => ({
          meeting_id: editingMeeting.id, jemaat_id: m.id,
          hadir: attendance[m.id] ?? false, keterangan: null,
        }));
        const { error: aErr } = await supabase.from("icare_attendance").insert(rows as any);
        if (aErr) { setFormError("Tersimpan, tapi gagal update kehadiran: " + aErr.message); setSubmitting(false); return; }
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: meeting, error: mErr } = await supabase.from("icare_meetings").insert({
        icare_id: groupRef.current.id, tanggal, topik: topik || null, lokasi: lokasi || null,
        catatan: catatan || null, jumlah_hadir, created_by: user?.id ?? null,
      } as any).select().single();
      if (mErr) { setFormError(mErr.message); setSubmitting(false); return; }
      if (currentMembers.length > 0) {
        const rows = currentMembers.map((m) => ({
          meeting_id: meeting.id, jemaat_id: m.id,
          hadir: attendance[m.id] ?? false, keterangan: null,
        }));
        const { error: aErr } = await supabase.from("icare_attendance").insert(rows as any);
        if (aErr) { setFormError("Tersimpan, tapi gagal simpan kehadiran: " + aErr.message); setSubmitting(false); return; }
      }
    }
    await loadData();
    closeModal();
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!editingMeeting) return;
    setDeleting(true);
    await supabase.from("icare_attendance").delete().eq("meeting_id", editingMeeting.id);
    await supabase.from("icare_meetings").delete().eq("id", editingMeeting.id);
    await loadData();
    closeModal();
    setDeleting(false);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    setMenuOpen(false);
    for (const id of selectedIds) {
      await supabase.from("icare_attendance").delete().eq("meeting_id", id);
      await supabase.from("icare_meetings").delete().eq("id", id);
    }
    await loadData();
    clearSelection();
    setBulkDeleting(false);
  };

  // ── derived table data ───────────────────────────────────────────────────────
  const filtered = meetings.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      fmtDate(m.tanggal).toLowerCase().includes(q) ||
      (m.topik ?? "").toLowerCase().includes(q) ||
      (m.lokasi ?? "").toLowerCase().includes(q) ||
      (m.catatan ?? "").toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const valA = sortKey === "tanggal"
      ? new Date(a.tanggal).getTime()
      : ((a as any)[sortKey] ?? "");
    const valB = sortKey === "tanggal"
      ? new Date(b.tanggal).getTime()
      : ((b as any)[sortKey] ?? "");
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const total = sorted.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = sorted.slice((page - 1) * limit, page * limit);
  const visibleColumns = ALL_COLUMNS.filter((c) => !hiddenCols.has(c.key));

  // ── selection helpers ────────────────────────────────────────────────────────
  const allPageIds = paginated.map((m) => m.id);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const somePageSelected = allPageIds.some((id) => selectedIds.has(id));

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllPage() {
    if (allPageSelected) {
      setSelectedIds((prev) => { const next = new Set(prev); allPageIds.forEach((id) => next.delete(id)); return next; });
    } else {
      setSelectedIds((prev) => { const next = new Set(prev); allPageIds.forEach((id) => next.add(id)); return next; });
    }
  }

  function clearSelection() { setSelectedIds(new Set()); setMenuOpen(false); }

  const selectedCount = selectedIds.size;
  const selectedItem = selectedCount === 1
    ? meetings.find((m) => selectedIds.has(m.id)) ?? null
    : null;

  const presentCount = Object.values(attendance).filter(Boolean).length;

  if (!authorized || loadingPage) return null;

  return (
    <div className="p-4">

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/25 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                {editingMeeting ? "Edit Pertemuan" : "Catat Pertemuan Baru"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal *</label>
                  <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Lokasi</label>
                  <input type="text" value={lokasi} onChange={(e) => setLokasi(e.target.value)}
                    placeholder={groupRef.current?.lokasi_pertemuan ?? ""}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Topik / Firman</label>
                <input type="text" value={topik} onChange={(e) => setTopik(e.target.value)}
                  placeholder="Topik atau judul firman"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Catatan</label>
                <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2}
                  placeholder="Catatan tambahan..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">
                    Kehadiran —{" "}
                    {loadingAttendance
                      ? <span className="text-gray-400">Memuat...</span>
                      : <span className="text-blue-600 font-semibold">{presentCount}/{members.length}</span>
                    }
                  </label>
                  {!loadingAttendance && (
                    <div className="flex gap-3 text-xs">
                      <button onClick={() => { const a: AttendanceMap = {}; members.forEach((m) => { a[m.id] = true; }); setAttendance(a); }}
                        className="text-blue-600 hover:underline">Semua</button>
                      <button onClick={() => setAttendance(blankAttendance(members))}
                        className="text-gray-400 hover:underline">Reset</button>
                    </div>
                  )}
                </div>
                {members.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-lg">Belum ada anggota.</p>
                ) : loadingAttendance ? (
                  <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-lg">Memuat kehadiran...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                    {members.map((m) => (
                      <CheckboxRow key={m.id} label={m.nama_lengkap} checked={attendance[m.id] ?? false}
                        onToggle={() => setAttendance((prev) => ({ ...prev, [m.id]: !prev[m.id] }))} />
                    ))}
                  </div>
                )}
              </div>
              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">⚠ {formError}</p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-2">
              <div>
                {editingMeeting && (
                  <button onClick={handleDelete} disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60">
                    {deleting
                      ? <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                      : <Trash2 size={13} />}
                    Hapus
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Batal
                </button>
                <button onClick={handleSave} disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-black hover:bg-gray-800 disabled:opacity-60 text-white rounded-lg">
                  {submitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────────────────── */}
      {!group && (
        <p className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          {loadError === "no_jemaat"
            ? "Akun Anda belum ditautkan ke data jemaat. Minta admin untuk menautkan akun Anda di halaman Users."
            : "Anda belum ditugaskan sebagai leader di iCare group manapun. Hubungi admin."}
        </p>
      )}

      {/* ── Table section ─────────────────────────────────────────────────────── */}
      {group && (
        <div className="flex flex-col gap-2 w-full">

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex items-center flex-1 min-w-[180px] max-w-xs">
              <Search size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari topik, lokasi, catatan..."
                className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400"
              />
              {searchInput && (
                <button onClick={() => setSearchInput("")} className="absolute right-2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Active sort chip */}
            {sortKey !== "tanggal" && (
              <button
                onClick={() => { setSortKey("tanggal"); setSortDir("desc"); setPage(1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                {sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {ALL_COLUMNS.find((c) => c.key === sortKey)?.label ?? sortKey}
                <X size={11} className="ml-0.5 text-blue-400" />
              </button>
            )}

            <div className="flex-1" />

            {/* Sort */}
            <div ref={sortRef} className="relative">
              <button
                onClick={() => setSortOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg shadow-sm transition-colors ${
                  sortKey !== "tanggal"
                    ? "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                    : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
                }`}
              >
                <ListFilter size={14} />
                Urutkan
              </button>
              {sortOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1 mb-0.5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Urutkan</p>
                    {sortKey !== "tanggal" && (
                      <button
                        onClick={() => { setSortKey("tanggal"); setSortDir("desc"); setPage(1); setSortOpen(false); }}
                        className="text-xs text-blue-500 hover:text-blue-700"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1 px-3 pb-2">
                    <button
                      onClick={() => { setSortDir("asc"); setPage(1); }}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs rounded-md border transition-colors ${
                        sortDir === "asc" ? "border-blue-400 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <ArrowUp size={11} /> A → Z
                    </button>
                    <button
                      onClick={() => { setSortDir("desc"); setPage(1); }}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs rounded-md border transition-colors ${
                        sortDir === "desc" ? "border-blue-400 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <ArrowDown size={11} /> Z → A
                    </button>
                  </div>
                  <div className="border-t border-gray-100 mb-1" />
                  {ALL_COLUMNS.map((col) => (
                    <button
                      key={col.key}
                      onClick={() => { setSortKey(col.key); setPage(1); setSortOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors ${
                        sortKey === col.key ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {col.label}
                      {sortKey === col.key && (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Columns visibility */}
            <div ref={colsRef} className="relative">
              <button
                onClick={() => setColsOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg shadow-sm transition-colors ${
                  hiddenCols.size > 0
                    ? "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                    : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
                }`}
              >
                <Columns3 size={14} />
                Kolom
                {hiddenCols.size > 0 && (
                  <span className="text-xs font-semibold text-blue-600">
                    {ALL_COLUMNS.length - hiddenCols.size}/{ALL_COLUMNS.length}
                  </span>
                )}
              </button>
              {colsOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tampilkan Kolom</p>
                  {ALL_COLUMNS.map((col) => (
                    <label key={col.key} className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hiddenCols.has(col.key)}
                        onChange={() => setHiddenCols((prev) => {
                          const next = new Set(prev);
                          if (next.has(col.key)) next.delete(col.key); else next.add(col.key);
                          return next;
                        })}
                        className="rounded accent-black"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table card */}
          <div className="flex flex-col w-full border border-gray-200 bg-white rounded-xl overflow-hidden">
            <div className="relative">
              <div className="block w-full overflow-x-auto">
                <table className="table-fixed min-w-[700px] w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="sticky left-0 z-30 w-10 border-b border-gray-100 bg-gray-100 p-2 text-center">
                        <input
                          type="checkbox"
                          className="rounded-sm accent-black"
                          checked={allPageSelected}
                          ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                          onChange={toggleAllPage}
                        />
                      </th>
                      {visibleColumns.map((col) => (
                        <th
                          key={col.key}
                          className="w-48 sticky top-0 z-20 border-b border-gray-100 px-4 py-3 text-left text-xs font-semibold text-black bg-gray-100"
                        >
                          <span className="flex items-center gap-1">
                            {col.label}
                            {sortKey === col.key && (
                              sortDir === "asc"
                                ? <ArrowUp size={12} className="text-blue-500" />
                                : <ArrowDown size={12} className="text-blue-500" />
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumns.length + 1} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <Calendar size={18} className="text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-400">Belum ada pertemuan tercatat</p>
                            <button onClick={() => openAddModalRef.current()}
                              className="text-xs text-blue-600 hover:underline">Catat sekarang</button>
                          </div>
                        </td>
                      </tr>
                    ) : paginated.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumns.length + 1} className="py-20 text-center text-sm text-gray-400">
                          Tidak ada hasil untuk &ldquo;{search}&rdquo;
                        </td>
                      </tr>
                    ) : (
                      paginated.map((meeting) => {
                        const pct = members.length > 0
                          ? Math.round((meeting.jumlah_hadir / members.length) * 100) : 0;
                        const isSelected = selectedIds.has(meeting.id);
                        return (
                          <tr
                            key={meeting.id}
                            className="group border-b border-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <td className="sticky left-0 z-10 w-10 border-r border-gray-100 p-2 text-center bg-white group-hover:bg-gray-100">
                              <input
                                type="checkbox"
                                className="accent-black"
                                checked={isSelected}
                                onChange={() => toggleRow(meeting.id)}
                              />
                            </td>
                            {visibleColumns.map((col) => (
                              <td
                                key={col.key}
                                className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap truncate max-w-[12rem]"
                              >
                                {col.key === "tanggal" && (
                                  <span className="font-medium">{fmtDate(meeting.tanggal)}</span>
                                )}
                                {col.key === "topik" && (
                                  meeting.topik
                                    ? <span className="truncate block">{meeting.topik}</span>
                                    : <span className="text-gray-300">—</span>
                                )}
                                {col.key === "lokasi" && (
                                  meeting.lokasi
                                    ? <span className="flex items-center gap-1 text-gray-500 text-xs"><MapPin size={11} />{meeting.lokasi}</span>
                                    : <span className="text-gray-300">—</span>
                                )}
                                {col.key === "jumlah_hadir" && (
                                  <span className="flex items-center gap-2">
                                    <span className="tabular-nums">{meeting.jumlah_hadir}/{members.length}</span>
                                    <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                  </span>
                                )}
                                {col.key === "catatan" && (
                                  meeting.catatan
                                    ? <span className="text-gray-500 text-xs truncate block">{meeting.catatan}</span>
                                    : <span className="text-gray-300">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {total > 0
                    ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} dari ${total}`
                    : "0 data"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded transition-colors enabled:text-gray-600 enabled:border-gray-200 enabled:hover:bg-gray-100 disabled:text-gray-300 disabled:border-gray-100 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded transition-colors enabled:text-gray-600 enabled:border-gray-200 enabled:hover:bg-gray-100 disabled:text-gray-300 disabled:border-gray-100 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[20, 50, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => { setLimit(v); setPage(1); }}
                    className={`px-3 py-1.5 text-sm border ${
                      limit === v
                        ? "rounded-lg border-gray-200 font-semibold text-black bg-white shadow-sm"
                        : "rounded border-transparent text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {limit === v ? `${v} rows` : v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Selection bar ─────────────────────────────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-2xl shadow-xl text-sm">
          <input type="checkbox" checked readOnly className="accent-black mr-1" />
          <span className="text-gray-700 font-medium whitespace-nowrap">
            {selectedCount} row{selectedCount > 1 ? "s" : ""} selected
          </span>

          <div ref={menuRef} className="relative ml-1">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[130px]">
                <button
                  disabled={selectedCount !== 1 || !selectedItem}
                  onClick={() => {
                    if (selectedItem) {
                      setMenuOpen(false);
                      openEditModal(selectedItem);
                      clearSelection();
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Pencil size={14} /> Update
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 size={14} />
                  {bulkDeleting ? "Menghapus..." : "Delete"}
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          <button
            onClick={() => setSelectedIds(new Set(paginated.map((m) => m.id)))}
            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Select all
          </button>

          <button
            onClick={clearSelection}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
