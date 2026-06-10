"use client";
import { ChevronDown, ChevronUp, Home, LogOut, PanelLeftClose, PanelLeftOpen, Settings, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type NavItem, navByRole } from "@/constants/navigation";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/lib/supabase/logout";
import { useIsMobile } from "@/hooks/use-mobile";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<{ full_name: string; role: string; email: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isMobile) setCollapsed(false);
  }, [isMobile]);

  useEffect(() => {
    onMobileClose?.();
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", authUser.id)
        .maybeSingle();
      if (profile) {
        setNavItems(navByRole[profile.role ?? "finance"] ?? []);
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

  useEffect(() => {
    const autoOpen: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (item.children?.some((child) => child.href === pathname)) {
        autoOpen[item.label] = true;
      }
    });
    setOpenDropdowns((prev) => ({ ...prev, ...autoOpen }));
  }, [navItems, pathname]);

  const toggleDropdown = (label: string) => {
    setOpenDropdowns((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogoutConfirmed = async () => {
    setShowLogoutModal(false);
    await logout();
    window.location.href = "/login";
  };

  const initials = user
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  // Use a stable default width on the server; only apply isMobile logic after mount
  const sidebarWidth = !mounted
    ? "w-56"
    : isMobile
    ? "w-56"
    : collapsed
    ? "w-14"
    : "w-56";

  const effectiveMobile = mounted && isMobile;
  const effectiveCollapsed = mounted && collapsed;

  const sidebarContent = (
    <aside
      className={`h-full bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-300 ${sidebarWidth}`}
    >
      {/* Top bar */}
      <div className="h-14 flex items-center shrink-0 px-3">
        {mounted && isMobile ? (
          <>
            <div className="flex items-center gap-2 flex-1">
              <img
                src="/assets/ifgf-logo.png"
                alt="IFGF Logo"
                width={28}
                height={28}
                className="h-20 w-auto object-contain"
              />
            </div>
            <button
              onClick={onMobileClose}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <X size={14} />
            </button>
          </>
        ) : collapsed && mounted ? (
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
              <img
                src="/assets/ifgf-logo.png"
                alt="IFGF Logo"
                width={28}
                height={28}
                className="h-15 w-auto object-contain"
              />
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

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        {navItems.map((item) => {
          const { label, icon: Icon, href, children } = item;

          if (children && children.length > 0) {
            const isOpen = openDropdowns[label] ?? false;
            const anyChildActive = children.some((c) => c.href === pathname);

            return (
              <div key={label}>
                <button
                  onClick={() => {
                    if (effectiveCollapsed && !effectiveMobile) {
                      setCollapsed(false);
                    } else {
                      toggleDropdown(label);
                    }
                  }}
                  title={effectiveCollapsed && !effectiveMobile ? label : undefined}
                  className={`w-full flex items-center gap-3 px-2.5 py-1 rounded-lg text-sm font-medium transition-colors
                    ${effectiveCollapsed && !effectiveMobile ? "justify-center" : ""}
                    ${anyChildActive ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"}`}
                >
                  <Icon size={17} className="shrink-0" />
                  {(!effectiveCollapsed || effectiveMobile) && (
                    <>
                      <span className="whitespace-nowrap flex-1 text-left">{label}</span>
                      {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </>
                  )}
                </button>

                {(!effectiveCollapsed || effectiveMobile) && isOpen && (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-gray-200 pl-2">
                    {children.map((child) => {
                      const childActive = pathname === child.href;
                      const ChildIcon = child.icon;
                      return (
                        <a
                          key={child.href}
                          href={child.href}
                          className={`flex items-center gap-3 px-2.5 py-0.5 rounded-lg text-sm font-medium transition-colors
                            ${childActive ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"}`}
                        >
                          <ChildIcon size={15} className="shrink-0" />
                          <span className="whitespace-nowrap">{child.label}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = pathname === href;
          return (
            <a
              key={href}
              href={href}
              title={effectiveCollapsed && !effectiveMobile ? label : undefined}
              className={`flex items-center gap-3 px-2.5 py-1 rounded-sm text-sm font-medium transition-colors
                ${effectiveCollapsed && !effectiveMobile ? "justify-center" : ""}
                ${active ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"}`}
            >
              <Icon size={17} className="shrink-0" />
              {(!effectiveCollapsed || effectiveMobile) && (
                <span className="whitespace-nowrap">{label}</span>
              )}
            </a>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-gray-200 p-2 relative" ref={dropdownRef}>
          {open && (
            <div className="absolute bottom-full left-0 mb-1 w-60 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-white leading-none">{initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 truncate">{user.full_name}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full capitalize leading-none">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                </div>
              </div>
              {/* Menu items */}
              <div className="p-1">
                <a
                  href="/setting/account"
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                    pathname === "/settings" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Settings size={14} className="shrink-0" />
                  Settings
                </a>
                <a
                  href="/"
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <Home size={14} className="shrink-0" />
                  Home Page
                </a>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <LogOut size={14} className="shrink-0" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}

          {effectiveCollapsed && !effectiveMobile ? (
            <button
              onClick={() => setOpen((prev) => !prev)}
              className="w-full flex justify-center py-1.5 cursor-pointer"
              aria-label="Profile menu"
            >
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center hover:ring-2 hover:ring-blue-300 transition-all">
                <span className="text-[0.6rem] font-semibold text-blue-700 leading-none">
                  {initials}
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setOpen((prev) => !prev)}
              className="w-full flex items-center gap-3 py-1 px-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Profile menu"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-[0.6rem] font-semibold text-blue-700 leading-none">
                  {initials}
                </span>
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs text-gray-500 truncate leading-tight">{user.email}</p>
              </div>
            </button>
          )}
        </div>
      )}
    </aside>
  );

  if (mounted && isMobile) {
    return (
      <>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/40" onClick={onMobileClose} />
        )}
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebarContent}
        </div>
        <LogoutConfirmModal
          open={showLogoutModal}
          onConfirm={handleLogoutConfirmed}
          onCancel={() => setShowLogoutModal(false)}
        />
      </>
    );
  }

  return (
    <>
      {sidebarContent}
      <LogoutConfirmModal
        open={showLogoutModal}
        onConfirm={handleLogoutConfirmed}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
}
