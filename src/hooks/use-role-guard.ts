"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { canAccess, isRole, ROLE_HOME } from "@/constants/roles";
import { createClient } from "@/lib/supabase/client";

// Client-side mirror of the middleware check. Reads the role from the user's
// profile (not localStorage) so it always agrees with the middleware.
export function useRoleGuard(): boolean {
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, organization_id")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      const role = profile?.role;
      if (!isRole(role) || !profile?.organization_id) {
        window.location.href = "/login?error=unauthorized";
        return;
      }
      if (!canAccess(role, pathname)) {
        window.location.href = ROLE_HOME[role];
        return;
      }
      setAuthorized(true);
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return authorized;
}
