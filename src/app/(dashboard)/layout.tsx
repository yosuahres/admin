"use client";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSettings = pathname.startsWith("/setting");

  return <AppShell area={isSettings ? "settings" : "app"}>{children}</AppShell>;
}
