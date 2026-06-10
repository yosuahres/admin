"use client";
import { useEffect, useState } from "react";

export default function UserDashboardPage() {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role === "finance") setAuthorized(true);
    else window.location.href = "/login";
  }, []); 

  if (!authorized) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
    </div>
  );
}
