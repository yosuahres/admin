"use client";

import { useEffect, useState } from "react";
import { isRole, type Role } from "@/constants/roles";
import { createClient } from "@/lib/supabase/client";

export type CurrentUser = {
  fullName: string;
  email: string;
  role: Role | null;
  organization: string;
};

/** The signed-in user's profile, as the sidebar shows it. Null until loaded. */
export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, organizations(name)")
        .eq("id", authUser.id)
        .maybeSingle();
      if (cancelled || !profile) return;

      setUser({
        fullName: profile.full_name || authUser.email || "",
        email: authUser.email ?? "",
        role: isRole(profile.role) ? profile.role : null,
        organization: profile.organizations?.name ?? "",
      });
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return user;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
