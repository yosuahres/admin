import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isRole, type Role } from "@/constants/roles";
import { createClient } from "@/lib/supabase/server";

type RoleCheck =
  | { ok: true; userId: string; role: Role; organizationId: string }
  | { ok: false; response: NextResponse };

const deny = (error: string, status: number): RoleCheck => ({
  ok: false,
  response: NextResponse.json({ error }, { status }),
});

// Guard for API routes: the caller must be signed in, belong to an
// organization and hold one of `allowed`.
export async function requireRole(allowed: readonly Role[]): Promise<RoleCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return deny("Unauthorized", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;
  const organizationId = profile?.organization_id;
  if (!isRole(role) || !allowed.includes(role) || !organizationId) {
    return deny("Forbidden", 403);
  }

  return { ok: true, userId: user.id, role, organizationId };
}

// For service-role routes, which bypass row-level security: confirms the
// target user belongs to the caller's organization.
export async function isInOrganization(
  admin: SupabaseClient,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data !== null;
}
