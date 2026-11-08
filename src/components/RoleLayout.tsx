"use client";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";

// Shared shell for every role section (/admin, /pastor, /leader, /finance,
// /usher). Pages render only after the role check passes, so individual pages
// don't need their own role checks.
export default function RoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authorized = useRoleGuard();

  return <AppShell>{authorized ? children : null}</AppShell>;
}
