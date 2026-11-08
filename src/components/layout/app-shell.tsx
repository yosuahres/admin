"use client";

import type { ReactNode } from "react";
import { PageActionsProvider } from "@/contexts/page-actions";
import { AppSidebar, type SidebarArea } from "./app-sidebar";
import { SidebarProvider } from "./sidebar-state";
import { Topbar } from "./topbar";

/** The frame every signed-in page sits in: the sidebar, and the page beside it. */
export function AppShell({
  area = "app",
  children,
}: {
  area?: SidebarArea;
  children: ReactNode;
}) {
  return (
    <PageActionsProvider>
      <SidebarProvider>
        <div className="flex h-dvh overflow-hidden bg-white">
          <AppSidebar area={area} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </PageActionsProvider>
  );
}
