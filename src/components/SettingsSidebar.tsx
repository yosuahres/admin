"use client";
import { ArrowLeft, PanelLeftClose, PanelLeftOpen, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/lib/supabase/logout";
import { useIsMobile } from "@/hooks/use-mobile";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";

interface SettingsSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function SettingsSidebar({ mobileOpen = false, onMobileClose }: SettingsSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<{ full_name: string; role: string; email: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (isMobile) setCollapsed(false); }, [isMobile]);
  useEffect(() => { onMobileClose?.(); }, [pathname]);
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", authUser.id)
        .maybeSingle();
      if (profile) {
        setUser({ full_name: profile.full_name, role: profile.role ?? "finance", email: authUser.email ?? "" });
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogoutConfirmed = async () => {
    setShowLogoutModal(false);
    await logout();
    window.location.href = "/login";
  };

  const initials = user
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "";

  const effectiveMobile = mounted && isMobile;
  const effectiveCollapsed = mounted && collapsed;

  const sidebarWidth = !mounted
    ? "w-56"
    : isMobile
    ? "w-56"
    : collapsed
    ? "w-14"
    : "w-56";

  const sidebarContent = (
    <aside className={`h-full bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-300 ${sidebarWidth}`}>
      {/* Top bar */}
      <div className="h-14 flex items-center shrink-0 px-3">
        {effectiveMobile ? (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src="/assets/ifgf-logo.png" alt="IFGF Logo" width={28} height={28} className="h-15 w-auto object-contain" />
            </div>
            <button
              onClick={onMobileClose}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <X size={14} />
            </button>
          </>
        ) : effectiveCollapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand"
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors mx-auto"
          >
            <PanelLeftOpen size={16} />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src="/assets/ifgf-logo.png" alt="IFGF Logo" width={28} height={28} className="h-15 w-auto object-contain" />
            </div>
            {mounted && (
              <button
                onClick={() => setCollapsed(true)}
                aria-label="Collapse"
                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
              >
                <PanelLeftClose size={16} />
              </button>
            )}
          </>
        )}
      </div>

      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        <Link
          href="/setting/account"
          title={effectiveCollapsed && !effectiveMobile ? "Account" : undefined}
          className={`flex items-center gap-3 px-2.5 py-1.5 rounded-sm text-sm font-medium transition-colors ${
            effectiveCollapsed && !effectiveMobile ? "justify-center" : ""
          } ${
            pathname === "/setting/account" ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <User size={17} className="shrink-0" />
          {(!effectiveCollapsed || effectiveMobile) && <span>Account</span>}
        </Link>
      </nav>

      <div className="border-t border-gray-200 p-2 relative" ref={dropdownRef}>
        <Link
          href="/admin"
          title={effectiveCollapsed && !effectiveMobile ? "Back to Dashboard" : undefined}
          className={`flex items-center gap-3 px-2.5 py-1.5 rounded-sm text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors mb-1 ${
            effectiveCollapsed && !effectiveMobile ? "justify-center" : ""
          }`}
        >
          <ArrowLeft size={17} className="shrink-0" />
          {(!effectiveCollapsed || effectiveMobile) && <span className="whitespace-nowrap">Back to Dashboard</span>}
        </Link>
      </div>
    </aside>
  );

  if (mounted && isMobile) {
    return (
      <>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/40" onClick={onMobileClose} />
        )}
        <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          {sidebarContent}
        </div>
        <LogoutConfirmModal open={showLogoutModal} onConfirm={handleLogoutConfirmed} onCancel={() => setShowLogoutModal(false)} />
      </>
    );
  }

  return (
    <>
      {sidebarContent}
      <LogoutConfirmModal open={showLogoutModal} onConfirm={handleLogoutConfirmed} onCancel={() => setShowLogoutModal(false)} />
    </>
  );
}
