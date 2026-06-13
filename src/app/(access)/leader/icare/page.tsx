//leader/icare/page.tsx
"use client";
import {
  Calendar,
  Check,
  ChevronLeft,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
  FileText,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

type AttendanceEntry = {
  nama: string;
  hadir: boolean;
  keterangan: string | null;
};

type AttendanceMap = Record<string, boolean>;

const MONTH_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return {
    day: d.getDate(),
    month: MONTH_ID[d.getMonth()],
    year: d.getFullYear(),
    full: d.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
  };
}

function CheckboxRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm text-left w-full transition-colors ${
        checked ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
      }`}
    >
      <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
        checked ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
      }`}>
        {checked && <Check size={10} className="text-white" strokeWidth={3} />}
      </div>
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function IcareMeetingsPage() {
  const [authorized, setAuthorized] = useState(false);
  const [group, setGroup] = useState<IcareGroup | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Jemaat[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadError, setLoadError] = useState<"no_jemaat" | "no_group" | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [topik, setTopik] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [catatan, setCatatan] = useState("");
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [meetingAttendance, setMeetingAttendance] = useState<Record<string, AttendanceEntry[]>>({});

  const supabase = createClient();

  useEffect(() => {
    if (localStorage.getItem("role") !== "leader") { window.location.href = "/login"; return; }
    setAuthorized(true);
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingPage(true);
    setLoadError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingPage(false); return; }

    const { data: self } = await supabase.from("jemaat").select("id").eq("user_id", user.id).maybeSingle();
    if (!self) { setLoadError("no_jemaat"); setLoadingPage(false); return; }

    const { data: g, error: gErr } = await supabase
      .from("icare_groups").select("id, nama_icare, lokasi_pertemuan")
      .eq("leader_id", self.id).maybeSingle();
    if (gErr) { console.error("icare_groups query error:", gErr); }
    if (!g) { setLoadError("no_group"); setLoadingPage(false); return; }

    setGroup(g);
    setLokasi(g.lokasi_pertemuan ?? "");

    const { data: icareMembers } = await supabase
      .from("icare_members").select("jemaat(id, nama_lengkap)")
      .eq("icare_id", g.id).order("join_date", { ascending: true });

    const membersData: Jemaat[] = (icareMembers ?? [])
      .map((r: any) => r.jemaat).filter(Boolean)
      .sort((a: Jemaat, b: Jemaat) => a.nama_lengkap.localeCompare(b.nama_lengkap));

    setMembers(membersData);
    const initMap: AttendanceMap = {};
    membersData.forEach((m) => { initMap[m.id] = false; });
    setAttendance(initMap);

    const { data: meetingsData } = await supabase
      .from("icare_meetings").select("id, tanggal, topik, jumlah_hadir, catatan, lokasi")
      .eq("icare_id", g.id).order("tanggal", { ascending: false });

    setMeetings(meetingsData ?? []);
    setLoadingPage(false);
  };

  const loadMeetingAttendance = async (meetingId: string) => {
    if (meetingAttendance[meetingId]) return;
    const { data } = await supabase
      .from("icare_attendance").select("hadir, keterangan, jemaat(nama_lengkap)")
      .eq("meeting_id", meetingId).order("hadir", { ascending: false });
    const entries: AttendanceEntry[] = (data ?? []).map((r: any) => ({
      nama: r.jemaat?.nama_lengkap ?? "—", hadir: r.hadir, keterangan: r.keterangan,
    }));
    setMeetingAttendance((prev) => ({ ...prev, [meetingId]: entries }));
  };

  const selectMeeting = (id: string) => {
    setSelectedId(id);
    loadMeetingAttendance(id);
  };

  const handleSubmit = async () => {
    if (!group || !tanggal) { setFormError("Tanggal wajib diisi."); return; }
    setFormError(""); setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const jumlah_hadir = Object.values(attendance).filter(Boolean).length;
    const { data: meeting, error: mErr } = await supabase.from("icare_meetings").insert({
      icare_id: group.id, tanggal, topik: topik || null, lokasi: lokasi || null,
      catatan: catatan || null, jumlah_hadir, created_by: user?.id ?? null,
    } as any).select().single();
    if (mErr) { setFormError(mErr.message); setSubmitting(false); return; }
    if (members.length > 0) {
      const rows = members.map((m) => ({ meeting_id: meeting.id, jemaat_id: m.id, hadir: attendance[m.id] ?? false, keterangan: null }));
      const { error: aErr } = await supabase.from("icare_attendance").insert(rows as any);
      if (aErr) { setFormError("Pertemuan tersimpan, tapi gagal simpan kehadiran: " + aErr.message); setSubmitting(false); return; }
    }
    await loadData();
    setShowForm(false); setTopik(""); setCatatan(""); setSubmitting(false);
  };



  if (!authorized || loadingPage) return null;

  const selectedMeeting = meetings.find((m) => m.id === selectedId) ?? null;
  const presentCount = Object.values(attendance).filter(Boolean).length;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">

      {/* Modal: new meeting form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/25 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Catat Pertemuan Baru</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
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
                    placeholder={group?.lokasi_pertemuan ?? ""}
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
                    Kehadiran — <span className="text-blue-600 font-semibold">{presentCount}/{members.length}</span>
                  </label>
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => { const a: AttendanceMap = {}; members.forEach((m) => { a[m.id] = true; }); setAttendance(a); }} className="text-blue-600 hover:underline">Semua</button>
                    <button onClick={() => { const a: AttendanceMap = {}; members.forEach((m) => { a[m.id] = false; }); setAttendance(a); }} className="text-gray-400 hover:underline">Reset</button>
                  </div>
                </div>
                {members.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-lg">Belum ada anggota.</p>
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
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-black hover:bg-gray-800 disabled:opacity-60 text-white rounded-lg">
                {submitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {submitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">iCare Group</p>
          <h1 className="text-sm font-semibold text-gray-900">{group?.nama_icare ?? "Grup Tidak Ditemukan"}</h1>
          {group?.lokasi_pertemuan && (
            <div className="flex gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin size={10} />{group.lokasi_pertemuan}</span>
            </div>
          )}
        </div>
        {group && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-black hover:bg-gray-800 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus size={13} /> Catat Pertemuan
          </button>
        )}
      </div>

      {!group && (
        <p className="m-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          {loadError === "no_jemaat"
            ? "Akun Anda belum ditautkan ke data jemaat. Minta admin untuk menautkan akun Anda ke data jemaat di halaman Users."
            : loadError === "no_group"
            ? "Data jemaat Anda ditemukan, tetapi belum ditugaskan sebagai leader di iCare group manapun. Minta admin untuk mengatur leader_id di halaman iCare Groups."
            : "Anda belum ditugaskan sebagai leader di iCare group manapun. Hubungi admin."}
        </p>
      )}

      {group && (
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left pane: meeting list ── */}
          <div className={`flex flex-col border-r border-gray-200 overflow-y-auto bg-gray-50 ${
            selectedId ? "hidden sm:flex sm:w-72 lg:w-80 shrink-0" : "flex-1"
          }`}>
            {meetings.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Calendar size={18} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">Belum ada pertemuan</p>
                <button onClick={() => setShowForm(true)} className="text-xs text-blue-600 hover:underline mt-1">Catat sekarang</button>
              </div>
            ) : (
              <>
                <div className="px-4 py-2.5 border-b border-gray-200">
                  <p className="text-xs text-gray-400">{meetings.length} pertemuan</p>
                </div>
                {meetings.map((meeting) => {
                  const d = fmtDate(meeting.tanggal);
                  const isSelected = selectedId === meeting.id;
                  const pct = members.length > 0 ? Math.round((meeting.jumlah_hadir / members.length) * 100) : 0;
                  return (
                    <button key={meeting.id} onClick={() => selectMeeting(meeting.id)}
                      className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 text-left transition-colors ${
                        isSelected ? "bg-white border-l-[3px] border-l-blue-600" : "hover:bg-white"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 mt-0.5 ${isSelected ? "bg-blue-600" : "bg-white border border-gray-200"}`}>
                        <span className={`text-[0.5rem] uppercase font-semibold tracking-wide leading-none ${isSelected ? "text-blue-200" : "text-gray-400"}`}>{d.month}</span>
                        <span className={`text-sm font-bold leading-tight ${isSelected ? "text-white" : "text-gray-700"}`}>{d.day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{meeting.topik ?? "Pertemuan iCare"}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{d.full}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 tabular-nums shrink-0">{meeting.jumlah_hadir}/{members.length}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* ── Right pane: detail ── */}
          <div className={`flex-1 overflow-hidden bg-white ${selectedId ? "flex flex-col" : "hidden sm:flex sm:flex-col"}`}>
            {!selectedMeeting ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users size={18} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">Pilih pertemuan di sebelah kiri</p>
              </div>
            ) : (() => {
              const d = fmtDate(selectedMeeting.tanggal);
              const list = meetingAttendance[selectedMeeting.id];
              const hadirList = list?.filter((a) => a.hadir) ?? [];
              const tidakHadirList = list?.filter((a) => !a.hadir) ?? [];

              return (
                <>
                  {/* Detail header */}
                  <div className="px-6 py-5 border-b border-gray-100">
                    <button
                      onClick={() => { setSelectedId(null); }}
                      className="sm:hidden flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3"
                    >
                      <ChevronLeft size={12} /> Kembali
                    </button>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[0.55rem] text-blue-200 uppercase font-semibold tracking-wide leading-none">{d.month}</span>
                        <span className="text-lg font-bold text-white leading-tight">{d.day}</span>
                        <span className="text-[0.5rem] text-blue-300 leading-none">{d.year}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-gray-900 leading-snug">
                          {selectedMeeting.topik ?? "Pertemuan iCare"}
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">{d.full}</p>
                        {selectedMeeting.lokasi && (
                          <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <MapPin size={10} />{selectedMeeting.lokasi}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Users size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-500">{selectedMeeting.jumlah_hadir} dari {members.length} hadir</span>
                          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${members.length > 0 ? Math.round((selectedMeeting.jumlah_hadir / members.length) * 100) : 0}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>


                  </div>

                  {/* Detail body */}
                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {selectedMeeting.catatan && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <FileText size={10} /> Catatan
                        </p>
                        <p className="text-sm text-amber-900">{selectedMeeting.catatan}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hadir</p>
                          <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            {list ? hadirList.length : "…"}
                          </span>
                        </div>
                        {!list ? <p className="text-xs text-gray-400">Memuat...</p>
                          : hadirList.length === 0 ? <p className="text-xs text-gray-400 italic">—</p>
                          : <div className="space-y-2">
                              {hadirList.map((a, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                                  <span className="text-sm text-gray-700">{a.nama}</span>
                                </div>
                              ))}
                            </div>
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tidak hadir</p>
                          <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            {list ? tidakHadirList.length : "…"}
                          </span>
                        </div>
                        {!list ? <p className="text-xs text-gray-400">Memuat...</p>
                          : tidakHadirList.length === 0 ? <p className="text-xs text-gray-400 italic">Semua hadir</p>
                          : <div className="space-y-2">
                              {tidakHadirList.map((a, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-200 shrink-0" />
                                  <span className="text-sm text-gray-400">{a.nama}</span>
                                </div>
                              ))}
                            </div>
                        }
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

        </div>
      )}
    </div>
  );
}