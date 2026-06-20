// pastor/page.tsx
"use client";
import { useEffect } from "react";
import AdminDashboard from "@/components/AdminDashboard";

export default function PastorDashboardPage() {
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "pastor") window.location.href = "/login";
  }, []);

  return <AdminDashboard />;
}
