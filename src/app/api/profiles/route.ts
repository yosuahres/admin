// app/api/profiles/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";

export async function GET(request: Request) {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return auth.response;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_profiles_with_jemaat");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}