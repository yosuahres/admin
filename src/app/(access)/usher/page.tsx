//usher/page.tsx
"use client";
import { useEffect, useState } from "react";

export default function UsherDashboardPage() {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role === "usher") setAuthorized(true);
    else window.location.href = "/login";
  }, []); 

  if (!authorized) return null;

  return (
    <div className="p-4">
    </div>
  );
}
