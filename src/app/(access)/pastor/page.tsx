//pastoral/page.tsx
"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default function DashboardPage() {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("role");
      if (role === "pastor") {
        setAuthorized(true);
      } else {
        window.location.href = "/login";
      }
    }
  }, []);

  if (!authorized) return null;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 p-8 bg-zinc-50 dark:bg-black">
          <p>Welcome to the pastor dashboard!</p>
        </main>
      </div>
    </div>
  );
}
