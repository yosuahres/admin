"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import SettingsSidebar from "@/components/SettingsSidebar";
import { PageActionsProvider } from "@/contexts/page-actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isSettings = pathname.startsWith("/setting");

  return (
    <PageActionsProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {isSettings ? (
          <SettingsSidebar
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
        ) : (
          <Sidebar
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
        )}
        <div className="flex flex-col flex-1 min-w-0">
          <Header onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </PageActionsProvider>
  );
}
