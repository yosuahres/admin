"use client";
import {
  ArrowLeft,
  Pencil,
  Search,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Department = {
  id: string;
  nama_pelayanan: string;
  deskripsi: string | null;
  leader_id: string | null;
  jemaat?: { nama_lengkap: string } | null;
};

type DepartmentMember = {
  id: string;
  jemaat_id: string;
  role_pelayanan: string | null;
  tanggal_join: string | null;
  jemaat?: {
    nama_lengkap: string;
    gender: string | null;
    phone_number: string | null;
  } | null;
};

type Jemaat = {
  id: string;
  nama_lengkap: string;
  gender: string | null;
  phone_number: string | null;
};

export default function PelayananMembersPage() {
  const { id: deptId } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [department, setDepartment] = useState<Department | null>(null);
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [allJemaat, setAllJemaat] = useState<Jemaat[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"members" | "add">("members");
  const [memberSearch, setMemberSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [roleInput, setRoleInput] = useState<Record<string, string>>({});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Edit role modal
  const [editMember, setEditMember] = useState<DepartmentMember | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    loadAll();
  }, [deptId]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadDepartment(), loadMembers(), loadAllJemaat()]);
    setLoading(false);
  };

  const loadDepartment = async () => {
    const { data } = await supabase
      .from("departments")
      .select("id, nama_pelayanan, deskripsi, leader_id, jemaat(nama_lengkap)")
      .eq("id", deptId)
      .single();
    setDepartment(data as any);
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from("department_members")
      .select(
        "id, jemaat_id, role_pelayanan, tanggal_join, jemaat(nama_lengkap, gender, phone_number)",
      )
      .eq("department_id", deptId)
      .order("tanggal_join", { ascending: false });
    setMembers((data as any) ?? []);
  };

  const loadAllJemaat = async () => {
    const { data } = await supabase
      .from("jemaat")
      .select("id, nama_lengkap, gender, phone_number")
      .order("nama_lengkap");
    setAllJemaat((data as any) ?? []);
  };

  const handleAddMember = async (jemaatId: string) => {
    setLoadingAction(jemaatId);
    const role = roleInput[jemaatId] || null;

    const { error } = await supabase.from("department_members").insert({
      department_id: deptId,
      jemaat_id: jemaatId,
      role_pelayanan: role,
    } as any);

    if (error) {
      alert("Gagal menambah anggota: " + error.message);
    } else {
      setRoleInput((prev) => {
        const n = { ...prev };
        delete n[jemaatId];
        return n;
      });
      await loadMembers();
    }
    setLoadingAction(null);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Yakin ingin mengeluarkan anggota ini dari pelayanan?"))
      return;
    setLoadingAction(memberId);
    const { error } = await supabase
      .from("department_members")
      .delete()
      .eq("id", memberId);
    if (error) alert("Gagal menghapus: " + error.message);
    else await loadMembers();
    setLoadingAction(null);
  };

  const openEditRole = (member: DepartmentMember) => {
    setEditMember(member);
    setEditRole(member.role_pelayanan ?? "");
  };

  const handleEditRoleSubmit = async () => {
    if (!editMember) return;
    setEditSubmitting(true);
    const { error } = await supabase
      .from("department_members")
      .update({ role_pelayanan: editRole || null })
      .eq("id", editMember.id);
    if (error) alert("Gagal mengubah role: " + error.message);
    else {
      setEditMember(null);
      await loadMembers();
    }
    setEditSubmitting(false);
  };

  if (loading) return null;
  if (!department) return null;

  const memberJemaatIds = new Set(members.map((m) => m.jemaat_id));

  const filteredMembers = members.filter((m) =>
    m.jemaat?.nama_lengkap.toLowerCase().includes(memberSearch.toLowerCase()),
  );

  const availableJemaat = allJemaat.filter(
    (j) =>
      !memberJemaatIds.has(j.id) &&
      j.nama_lengkap.toLowerCase().includes(addSearch.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/admin/pelayanan")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          Kembali ke Pelayanan
        </button>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <span className="text-base font-bold text-purple-600">
              {department.nama_pelayanan.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-0.5">
              {department.nama_pelayanan}
            </h1>
            <p className="text-sm text-gray-500">
              {(department as any).jemaat?.nama_lengkap
                ? `Leader: ${(department as any).jemaat.nama_lengkap}`
                : "Belum ada leader"}
              {department.deskripsi && ` · ${department.deskripsi}`}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Role modal */}
      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">
                Edit Role Anggota
              </h2>
              <button
                onClick={() => setEditMember(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                {editMember.jemaat?.nama_lengkap}
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600">
                  Role Pelayanan
                </label>
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="e.g. Vocalist, Keyboardist, Drummer"
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button
                onClick={() => setEditMember(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleEditRoleSubmit}
                disabled={editSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {editSubmitting && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "members"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Anggota ({members.length})
        </button>
        <button
          onClick={() => setActiveTab("add")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "add"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <UserPlus size={13} />
          Tambah Anggota
        </button>
      </div>

      {/* Members tab */}
      {activeTab === "members" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {members.length > 4 && (
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Cari anggota..."
                  className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {filteredMembers.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              {memberSearch
                ? "Anggota tidak ditemukan."
                : "Belum ada anggota di pelayanan ini."}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-purple-600">
                      {m.jemaat?.nama_lengkap.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {m.jemaat?.nama_lengkap}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {m.role_pelayanan ? (
                        <span className="text-purple-600 font-medium">
                          {m.role_pelayanan}
                        </span>
                      ) : (
                        <span>Anggota</span>
                      )}
                      {m.jemaat?.phone_number && ` · ${m.jemaat.phone_number}`}
                      {m.tanggal_join && (
                        <>
                          <span className="mx-1.5 text-gray-300">·</span>
                          Bergabung{" "}
                          {new Date(m.tanggal_join).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditRole(m)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Pencil size={11} />
                      Edit Role
                    </button>
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      disabled={loadingAction === m.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {loadingAction === m.id ? (
                        <span className="w-3 h-3 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <UserMinus size={11} />
                      )}
                      Keluarkan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add members tab */}
      {activeTab === "add" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                placeholder="Cari dari data jemaat..."
                className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {availableJemaat.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              {addSearch
                ? "Jemaat tidak ditemukan."
                : "Semua jemaat sudah menjadi anggota pelayanan ini."}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {availableJemaat.map((j) => (
                <div
                  key={j.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-gray-500">
                      {j.nama_lengkap.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {j.nama_lengkap}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {j.gender === "L"
                        ? "Laki-laki"
                        : j.gender === "P"
                          ? "Perempuan"
                          : "—"}
                      {j.phone_number && ` · ${j.phone_number}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={roleInput[j.id] ?? ""}
                      onChange={(e) =>
                        setRoleInput((prev) => ({
                          ...prev,
                          [j.id]: e.target.value,
                        }))
                      }
                      placeholder="Role (opsional)"
                      className="w-36 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleAddMember(j.id)}
                      disabled={loadingAction === j.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      {loadingAction === j.id ? (
                        <span className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                      ) : (
                        <UserPlus size={11} />
                      )}
                      Tambah
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}