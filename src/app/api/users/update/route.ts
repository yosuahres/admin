// app/api/users/update/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isRole, ROLES } from "@/constants/roles";
import { isInOrganization, requireRole } from "@/lib/auth/require-role";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,   // service role — server only
);

export async function PATCH(req: Request) {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return auth.response;
  try {
    const { id, email, password, full_name, role } = await req.json();

    if (!id) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    if (!(await isInOrganization(supabaseAdmin, id, auth.organizationId))) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }
    if (role !== undefined && !isRole(role)) {
      return NextResponse.json(
        { error: `Role tidak valid. Pilihan: ${ROLES.join(", ")}` },
        { status: 400 },
      );
    }

    // 1. Update auth user (email and/or password)
    const authUpdate: Record<string, string> = {};
    if (email)    authUpdate.email    = email;
    if (password) authUpdate.password = password;

    if (Object.keys(authUpdate).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        authUpdate,
      );
      if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Update profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name, role })
      .eq("id", id);

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}