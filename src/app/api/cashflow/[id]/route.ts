// app/api/cashflow/[id]/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rolesForSection } from "@/constants/roles";
import { requireRole } from "@/lib/auth/require-role";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(rolesForSection("finance"));
  if (!auth.ok) return auth.response;
  const supabase = await createClient();

  const { id } = await params;
  const body = await req.json();

  const { data, error } = await supabase
    .from("cashflow_transactions")
    .update({
      transaction_date: body.transaction_date,
      type:             body.type,
      category_id:      body.category_id || null,
      description:      body.description,
      amount:           body.amount,
      reference_no:     body.reference_no || null,
      notes:            body.notes || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(rolesForSection("finance"));
  if (!auth.ok) return auth.response;
  const supabase = await createClient();

  const { id } = await params;

  const { error } = await supabase
    .from("cashflow_transactions")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}