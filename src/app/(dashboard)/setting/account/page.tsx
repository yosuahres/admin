//app/(dashboard)/settings/page.tsx
"use client";
import { useEffect, useState } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Toast = { type: "success" | "error"; message: string } | null;

function InlineToast({ toast }: { toast: Toast }) {
  if (!toast) return null;
  return (
    <p className={`text-xs mt-1 ${toast.type === "success" ? "text-gray-500" : "text-gray-900 font-medium"}`}>
      {toast.message}
    </p>
  );
}

function SettingRow({
  label,
  description,
  children,
  last,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`flex items-start gap-6 px-6 py-5 ${!last ? "border-b border-gray-100" : ""}`}>
      <div className="w-56 shrink-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function PasswordInput({
  value, onChange, placeholder, autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "••••••••"}
        autoComplete={autoComplete}
        className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profileToast, setProfileToast] = useState<Toast>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwToast, setPwToast] = useState<Toast>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? "");
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      setFullName(p?.full_name ?? "");
      setLoading(false);
    };
    load();
  }, []);

  const showProfileToast = (t: NonNullable<Toast>) => {
    setProfileToast(t);
    setTimeout(() => setProfileToast(null), 4000);
  };

  const showPwToast = (t: NonNullable<Toast>) => {
    setPwToast(t);
    setTimeout(() => setPwToast(null), 4000);
  };

  const handleSaveProfile = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      showProfileToast({ type: "error", message: error.message });
    } else {
      showProfileToast({ type: "success", message: "Profil berhasil disimpan." });
    }
  };

  const closePwForm = () => {
    setPwOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwToast(null);
  };

  const handleChangePassword = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showPwToast({ type: "error", message: "Password minimal 8 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      showPwToast({ type: "error", message: "Password tidak cocok." });
      return;
    }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPw(false);
    if (error) {
      showPwToast({ type: "error", message: error.message });
    } else {
      showPwToast({ type: "success", message: "Password berhasil diubah." });
      setTimeout(closePwForm, 1500);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[85rem] mx-auto space-y-4">
      {/* Profile section */}
      <section id="profile" className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Detail profil dasar</h2>
          <p className="text-xs text-gray-400 mt-0.5">Kelola detail profil dasar Anda</p>
        </div>

        <form onSubmit={handleSaveProfile}>
          <SettingRow
            label="Nama lengkap"
            description="Ini adalah nama lengkap Anda yang akan muncul di profil."
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Nama lengkap Anda"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition"
              />
              <button
                type="submit"
                disabled={saving}
                className="shrink-0 px-4 py-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
            <InlineToast toast={profileToast} />
          </SettingRow>
        </form>

        <SettingRow
          label="Alamat email"
          description="Ini adalah email profil Anda."
        >
          <input
            type="email"
            value={email}
            readOnly
            disabled
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
          />
        </SettingRow>

        <SettingRow
          label="ID Pengguna"
          description="Ini adalah pengenal pengguna unik Anda."
          last
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={userId}
              readOnly
              disabled
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed font-mono"
            />
            <button
              type="button"
              onClick={handleCopy}
              title="Salin ID"
              className="shrink-0 p-2 text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        </SettingRow>
      </section>

      {/* Change password section */}
      <section id="password" className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Ubah kata sandi</h2>
            <p className="text-xs text-gray-400 mt-0.5">Anda dapat mengubah kata sandi saat ini untuk akun Anda.</p>
          </div>
          <button
            type="button"
            onClick={() => setPwOpen((o) => !o)}
            className="text-sm text-gray-500 hover:text-gray-900 shrink-0 ml-4 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Ubah kata sandi
          </button>
        </div>

        {pwOpen && (
          <form onSubmit={handleChangePassword} className="border-t border-gray-100">

            <SettingRow
              label="Kata sandi saat ini"
              description="Masukkan kata sandi Anda saat ini."
            >
              <PasswordInput
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </SettingRow>

            <SettingRow
              label="Kata sandi baru"
              description="Minimal 8 karakter."
            >
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </SettingRow>

            <SettingRow
              label="Konfirmasi kata sandi baru"
              description="Ulangi kata sandi baru Anda."
              last
            >
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </SettingRow>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
              <InlineToast toast={pwToast} />
              <div className="ml-auto flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingPw}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {savingPw ? "Menyimpan…" : "Perbarui kata sandi"}
                </button>
                <button
                  type="button"
                  onClick={closePwForm}
                  className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
