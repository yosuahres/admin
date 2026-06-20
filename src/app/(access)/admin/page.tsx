// admin/page.tsx
"use client";
import { useEffect } from "react";
import AdminDashboard from "@/components/AdminDashboard";

export default function DashboardPage() {
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") window.location.href = "/login";
  }, []);

  return <AdminDashboard />;
}
