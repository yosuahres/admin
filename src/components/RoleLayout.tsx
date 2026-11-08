"use client";
import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { PageActionsProvider } from "@/contexts/page-actions";
import { useRoleGuard } from "@/hooks/use-role-guard";

// Shared shell for every role section (/admin, /pastor, /leader, /finance,
// /usher). Pages render only after the role check passes, so individual pages
// don't need their own role checks.
export default function RoleLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const authorized = useRoleGuard();

  return (
    <PageActionsProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div className="flex flex-col flex-1 min-w-0">
          <Header onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            {authorized ? children : null}
          </main>
        </div>
      </div>
    </PageActionsProvider>
  );
}
