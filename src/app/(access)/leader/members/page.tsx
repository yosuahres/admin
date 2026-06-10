"use client";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  ListFilter,
  MoreHorizontal,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSetPageActions } from "@/contexts/page-actions";

type Member = {
  member_id: string;
  jemaat_id: string;
  nama_lengkap: string;
  gender: string | null;
  phone_number: string | null;
  join_date: string | null;
};

type Jemaat = {
  id: string;
  nama_lengkap: string;
  gender: string | null;
  phone_number: string | null;
};

const ALL_COLUMNS = [
  { key: "nama_lengkap", label: "Nama Lengkap" },
  { key: "gender", label: "Gender" },
  { key: "phone_number", label: "No. Telepon" },
  { key: "join_date", label: "Bergabung" },
];

export default function AnggotaPage() {
  const [authorized, setAuthorized] = useState(false);
  const [group, setGroup] = useState<{ id: string; nama_icare: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [allJemaat, setAllJemaat] = useState<Jemaat[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);

  // table
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("nama_lengkap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [colsOpen, setColsOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [bulkRemoving, setBulkRemoving] = useState(false);

  // add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addSelected, setAddSelected] = useState<Set<string>>(new Set());
  const [addFocusedIdx, setAddFocusedIdx] = useState(0);
  const [adding, setAdding] = useState(false);

  const groupRef = useRef<{ id: string; nama_icare: string } | null>(null);
  const colsRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const addSearchRef = useRef<HTMLInputElement>(null);
  const addListRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openAddModalRef = useRef<() => void>(() => {});
  const filteredAvailableRef = useRef<Jemaat[]>([]);
  const addFocusedIdxRef = useRef(0);
  addFocusedIdxRef.current = addFocusedIdx;

  const supabase = createClient();

  useEffect(() => {
    if (localStorage.getItem("role") !== "leader") { window.location.href = "/login"; return; }
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

  // keyboard nav for add modal — uses refs so no stale closures
  useEffect(() => {
    if (!showAddModal) return;
    setTimeout(() => addSearchRef.current?.focus(), 30);

    const handler = (e: KeyboardEvent) => {
      const list = filteredAvailableRef.current;
      const idx = addFocusedIdxRef.current;
      if (e.key === "Escape") { setShowAddModal(false); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAddFocusedIdx(Math.min(idx + 1, list.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAddFocusedIdx(Math.max(idx - 1, 0));
        return;
      }
      if (e.key === " " && (e.target as HTMLElement)?.tagName !== "INPUT") {
        e.preventDefault();
        const item = list[idx];
        if (item) setAddSelected((prev) => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; });
        return;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showAddModal]);

  // scroll focused item into view
  useEffect(() => {
    if (!showAddModal || !addListRef.current) return;
    const el = addListRef.current.querySelector(`[data-idx="${addFocusedIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [addFocusedIdx, showAddModal]);

  const loadData = async () => {
    setLoadingPage(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingPage(false); return; }

    const { data: self } = await supabase.from("jemaat").select("id").eq("user_id", user.id).maybeSingle();
    if (!self) { setLoadingPage(false); return; }

    const { data: g } = await supabase.from("icare_groups").select("id, nama_icare").eq("leader_id", self.id).maybeSingle();
    if (!g) { setLoadingPage(false); return; }

    setGroup(g);
    groupRef.current = g;

    await Promise.all([loadMembers(g.id), loadAllJemaat()]);
    setLoadingPage(false);
  };

  const loadMembers = async (icareId: string) => {
    const { data } = await supabase
      .from("icare_members")
      .select("id, join_date, jemaat(id, nama_lengkap, gender, phone_number)")
      .eq("icare_id", icareId)
      .order("join_date", { ascending: false });

    setMembers(
      (data ?? []).map((row: any) => ({
        member_id: row.id,
        jemaat_id: row.jemaat.id,
        nama_lengkap: row.jemaat.nama_lengkap,
        gender: row.jemaat.gender,
        phone_number: row.jemaat.phone_number,
        join_date: row.join_date,
      })),
    );
  };

  const loadAllJemaat = async () => {
    const { data } = await supabase
      .from("jemaat").select("id, nama_lengkap, gender, phone_number").order("nama_lengkap");
    setAllJemaat(data ?? []);
  };

  const openAddModal = () => {
    setAddSearch("");
    setAddSelected(new Set());
    setAddFocusedIdx(0);
    setShowAddModal(true);
  };
  openAddModalRef.current = openAddModal;

  useSetPageActions({
    addLabel: "Tambah Anggota",
    onAdd: () => openAddModalRef.current(),
  });

  const handleAddSelected = async () => {
    const g = groupRef.current;
    if (!g || addSelected.size === 0) return;
    setAdding(true);
    const rows = Array.from(addSelected).map((jemaatId) => ({
      icare_id: g.id, jemaat_id: jemaatId,
    }));
    const { error } = await supabase.from("icare_members").insert(rows as any);
    if (error) { alert("Gagal menambah anggota: " + error.message); setAdding(false); return; }
    await loadMembers(g.id);
    setShowAddModal(false);
    setAdding(false);
  };

  const handleBulkRemove = async () => {
    setBulkRemoving(true);
    setMenuOpen(false);
    for (const memberId of selectedIds) {
      await supabase.from("icare_members").delete().eq("id", memberId);
    }
    if (group) await loadMembers(group.id);
    clearSelection();
    setBulkRemoving(false);
  };

  // ── derived data ──────────────────────────────────────────────────────────────
  const memberJemaatIds = new Set(members.map((m) => m.jemaat_id));

  const filteredAvailable = allJemaat.filter(
    (j) =>
      !memberJemaatIds.has(j.id) &&
      (j.nama_lengkap.toLowerCase().includes(addSearch.toLowerCase()) ||
        (j.phone_number ?? "").includes(addSearch)),
  );
  filteredAvailableRef.current = filteredAvailable;

  const filtered = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.nama_lengkap.toLowerCase().includes(q) || (m.phone_number ?? "").includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    const valA =
      sortKey === "join_date" ? new Date(a.join_date ?? "").getTime() : ((a as any)[sortKey] ?? "");
    const valB =
      sortKey === "join_date" ? new Date(b.join_date ?? "").getTime() : ((b as any)[sortKey] ?? "");
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const total = sorted.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = sorted.slice((page - 1) * limit, page * limit);
  const visibleColumns = ALL_COLUMNS.filter((c) => !hiddenCols.has(c.key));

  const allPageIds = paginated.map((m) => m.member_id);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const somePageSelected = allPageIds.some((id) => selectedIds.has(id));

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllPage() {
    if (allPageSelected) {
      setSelectedIds((prev) => { const n = new Set(prev); allPageIds.forEach((id) => n.delete(id)); return n; });
    } else {
      setSelectedIds((prev) => { const n = new Set(prev); allPageIds.forEach((id) => n.add(id)); return n; });
    }
  }

  function clearSelection() { setSelectedIds(new Set()); setMenuOpen(false); }

  const selectedCount = selectedIds.size;

  if (!authorized || loadingPage) return null;

  return (
    <div className="p-4">

      {/* ── Add Modal (command-palette style) ─────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/30 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 flex flex-col overflow-hidden max-h-[82vh]">

            {/* Search bar */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                ref={addSearchRef}
                type="text"
                value={addSearch}
                onChange={(e) => { setAddSearch(e.target.value); setAddFocusedIdx(0); }}
                placeholder="Cari nama atau no. telepon jemaat..."
                className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
              />
              {addSearch && (
                <button onClick={() => { setAddSearch(""); addSearchRef.current?.focus(); }}
                  className="text-gray-400 hover:text-gray-600 shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Group label */}
            <div className="px-4 pb-1.5 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {group?.nama_icare}
              </p>
            </div>

            {/* List */}
            <div ref={addListRef} className="flex-1 overflow-y-auto">
              {filteredAvailable.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-sm text-gray-400">
                    {addSearch ? "Tidak ada jemaat yang cocok." : "Semua jemaat sudah menjadi anggota grup ini."}
                  </p>
                </div>
              ) : (
                filteredAvailable.map((j, idx) => {
                  const isSelected = addSelected.has(j.id);
                  const isFocused = idx === addFocusedIdx;
                  return (
                    <button
                      key={j.id}
                      data-idx={idx}
                      onClick={() => { setAddFocusedIdx(idx); setAddSelected((prev) => { const n = new Set(prev); n.has(j.id) ? n.delete(j.id) : n.add(j.id); return n; }); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-blue-50 hover:bg-blue-100"
                          : isFocused
                          ? "bg-gray-100"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                        isSelected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                      }`}>
                        {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>

                      {/* Avatar */}
                      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold ${
                        isSelected ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {j.nama_lengkap.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                          {j.nama_lengkap}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {j.gender === "L" ? "Laki-laki" : j.gender === "P" ? "Perempuan" : "—"}
                          {j.phone_number && ` · ${j.phone_number}`}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom bar */}
            <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-3 bg-gray-50">
              <div className="flex items-center gap-2.5 text-[11px] text-gray-400 select-none">
                <span className="flex items-center gap-0.5">
                  <ArrowUp size={10} /><ArrowDown size={10} /> Navigasi
                </span>
                <span>· Space Pilih</span>
                <span>· Esc Tutup</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100">
                  Batal
                </button>
                <button
                  onClick={handleAddSelected}
                  disabled={addSelected.size === 0 || adding}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  {adding && (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {adding
                    ? "Menambah..."
                    : addSelected.size > 0
                    ? `Tambah ${addSelected.size} Anggota`
                    : "Tambah Anggota"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────────────────── */}
      {!group && (
        <p className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          Anda belum ditugaskan sebagai leader di iCare group manapun. Hubungi admin.
        </p>
      )}

      {/* ── Table section ─────────────────────────────────────────────────────── */}
      {group && (
        <div className="flex flex-col gap-2 w-full">

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex items-center flex-1 min-w-[180px] max-w-xs">
              <Search size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari anggota..."
                className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400" />
              {searchInput && (
                <button onClick={() => setSearchInput("")} className="absolute right-2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex-1" />

            {/* Sort */}
            <div ref={sortRef} className="relative">
              <button onClick={() => setSortOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg shadow-sm transition-colors ${
                  sortKey !== "nama_lengkap"
                    ? "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                    : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
                }`}>
                <ListFilter size={14} /> Urutkan
              </button>
              {sortOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Urutkan</p>
                  <div className="flex gap-1 px-3 pb-2">
                    <button onClick={() => { setSortDir("asc"); setPage(1); }}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs rounded-md border transition-colors ${sortDir === "asc" ? "border-blue-400 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                      <ArrowUp size={11} /> A → Z
                    </button>
                    <button onClick={() => { setSortDir("desc"); setPage(1); }}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs rounded-md border transition-colors ${sortDir === "desc" ? "border-blue-400 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                      <ArrowDown size={11} /> Z → A
                    </button>
                  </div>
                  <div className="border-t border-gray-100 mb-1" />
                  {ALL_COLUMNS.map((col) => (
                    <button key={col.key} onClick={() => { setSortKey(col.key); setPage(1); setSortOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors ${
                        sortKey === col.key ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                      }`}>
                      {col.label}
                      {sortKey === col.key && (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Columns */}
            <div ref={colsRef} className="relative">
              <button onClick={() => setColsOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg shadow-sm transition-colors ${
                  hiddenCols.size > 0
                    ? "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                    : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
                }`}>
                <Columns3 size={14} /> Kolom
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
                      <input type="checkbox" checked={!hiddenCols.has(col.key)}
                        onChange={() => setHiddenCols((prev) => { const n = new Set(prev); n.has(col.key) ? n.delete(col.key) : n.add(col.key); return n; })}
                        className="rounded accent-black" />
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
                <table className="table-fixed min-w-[600px] w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="sticky left-0 z-30 w-10 border-b border-gray-100 bg-gray-100 p-2 text-center">
                        <input type="checkbox" className="rounded-sm accent-black" checked={allPageSelected}
                          ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                          onChange={toggleAllPage} />
                      </th>
                      {visibleColumns.map((col) => (
                        <th key={col.key}
                          className="w-48 sticky top-0 z-20 border-b border-gray-100 px-4 py-3 text-left text-xs font-semibold text-black bg-gray-100">
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
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumns.length + 1} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <Users size={18} className="text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-400">Belum ada anggota</p>
                            <button onClick={() => openAddModalRef.current()}
                              className="text-xs text-blue-600 hover:underline">Tambah sekarang</button>
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
                      paginated.map((member) => (
                        <tr key={member.member_id}
                          className="group border-b border-gray-50 hover:bg-gray-100 transition-colors">
                          <td className="sticky left-0 z-10 w-10 border-r border-gray-100 p-2 text-center bg-white group-hover:bg-gray-100">
                            <input type="checkbox" className="accent-black"
                              checked={selectedIds.has(member.member_id)}
                              onChange={() => toggleRow(member.member_id)} />
                          </td>
                          {visibleColumns.map((col) => (
                            <td key={col.key}
                              className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap truncate max-w-[12rem]">
                              {col.key === "nama_lengkap" && (
                                <span className="font-medium">{member.nama_lengkap}</span>
                              )}
                              {col.key === "gender" && (
                                member.gender ? (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    member.gender === "L"
                                      ? "bg-blue-50 text-blue-700"
                                      : "bg-pink-50 text-pink-700"
                                  }`}>
                                    {member.gender === "L" ? "Laki-laki" : "Perempuan"}
                                  </span>
                                ) : <span className="text-gray-300">—</span>
                              )}
                              {col.key === "phone_number" && (
                                member.phone_number ?? <span className="text-gray-300">—</span>
                              )}
                              {col.key === "join_date" && (
                                member.join_date
                                  ? new Date(member.join_date).toLocaleDateString("id-ID", {
                                      day: "numeric", month: "short", year: "numeric",
                                    })
                                  : <span className="text-gray-300">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
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
                  <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded transition-colors enabled:text-gray-600 enabled:border-gray-200 enabled:hover:bg-gray-100 disabled:text-gray-300 disabled:border-gray-100 disabled:cursor-not-allowed">
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded transition-colors enabled:text-gray-600 enabled:border-gray-200 enabled:hover:bg-gray-100 disabled:text-gray-300 disabled:border-gray-100 disabled:cursor-not-allowed">
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[20, 50, 100].map((v) => (
                  <button key={v} onClick={() => { setLimit(v); setPage(1); }}
                    className={`px-3 py-1.5 text-sm border ${
                      limit === v
                        ? "rounded-lg border-gray-200 font-semibold text-black bg-white shadow-sm"
                        : "rounded border-transparent text-gray-500 hover:bg-gray-100"
                    }`}>
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
            <button onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]">
                <button onClick={handleBulkRemove} disabled={bulkRemoving}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <Trash2 size={14} />
                  {bulkRemoving ? "Menghapus..." : "Keluarkan"}
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          <button onClick={() => setSelectedIds(new Set(paginated.map((m) => m.member_id)))}
            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            Select all
          </button>

          <button onClick={clearSelection}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
