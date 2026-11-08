// app/api/users/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { isRole, ROLES } from "@/constants/roles";
import { requireRole } from "@/lib/auth/require-role";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, 
);

export async function POST(req: NextRequest) {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return auth.response;
  try {
    const { email, password, full_name, role } = await req.json();
    
    console.log("=== USER CREATE START ===");
    console.log("Raw input:", { email, full_name, role });

    const trimmedEmail = email?.trim?.() || "";
    const trimmedFullName = full_name?.trim?.() || "";
    const trimmedRole = role?.trim?.() || "";
    
    console.log("After trim:", { trimmedEmail, trimmedFullName, trimmedRole });
    
    if (!trimmedEmail || !password || !trimmedFullName || !trimmedRole) {
      const missing = [];
      if (!trimmedEmail) missing.push("email");
      if (!password) missing.push("password");
      if (!trimmedFullName) missing.push("full_name");
      if (!trimmedRole) missing.push("role");
      
      console.error("Validation failed - missing fields:", missing);
      
      return NextResponse.json(
        { error: `Field wajib diisi: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    if (!isRole(trimmedRole)) {
      return NextResponse.json(
        { error: `Role tidak valid. Pilihan: ${ROLES.join(", ")}` },
        { status: 400 },
      );
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: trimmedFullName,
          role: trimmedRole,
        },
      });

    if (authError) {
      console.error("Auth creation error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // The new user joins the creating admin's organization. Upsert covers both
    // cases: the auth trigger already created the profile, or it didn't.
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email: trimmedEmail,
        full_name: trimmedFullName,
        role: trimmedRole,
        organization_id: auth.organizationId,
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: `Gagal menyimpan profil: ${profileError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, id: userId }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}