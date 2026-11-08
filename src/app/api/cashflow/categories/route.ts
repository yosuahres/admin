// app/api/cashflow/categories/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { rolesForSection } from "@/constants/roles";
import { requireRole } from "@/lib/auth/require-role";

// ── GET /api/cashflow/categories ──────────────────────────────────────────────
export async function GET() {
  const auth = await requireRole(rolesForSection("finance"));
  if (!auth.ok) return auth.response;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cashflow_categories")
    .select("id, name, type")
    .order("type")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}