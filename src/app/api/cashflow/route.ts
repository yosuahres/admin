// app/api/cashflow/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rolesForSection } from "@/constants/roles";
import { requireRole } from "@/lib/auth/require-role";

// ── GET /api/cashflow?month=YYYY-MM&page=1&limit=50&search= ──────────────────
export async function GET(req: NextRequest) {
  const auth = await requireRole(rolesForSection("finance"));
  if (!auth.ok) return auth.response;
  const supabase = await createClient();
  const { searchParams } = req.nextUrl;
  const month  = searchParams.get("month");
  const page   = parseInt(searchParams.get("page")  || "1");
  const limit  = parseInt(searchParams.get("limit") || "50");
  const search = searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  let query = supabase
    .from("cashflow_transactions_view")
    .select("*", { count: "exact" })
    .order("transaction_date", { ascending: false });

  // Filter by month (YYYY-MM)
  if (month) {
    const [year, mon] = month.split("-");
    const start = `${year}-${mon}-01`;
    const end   = new Date(parseInt(year), parseInt(mon), 0)
      .toISOString()
      .split("T")[0]; // last day of month
    query = query.gte("transaction_date", start).lte("transaction_date", end);
  }

  // Full-text search across description, category_name, reference_no
  if (search) {
    query = query.or(
      `description.ilike.%${search}%,category_name.ilike.%${search}%,reference_no.ilike.%${search}%`
    );
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0 });
}

// ── POST /api/cashflow ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireRole(rolesForSection("finance"));
  if (!auth.ok) return auth.response;
  const supabase = await createClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from("cashflow_transactions")
    .insert({
      transaction_date: body.transaction_date,
      type:             body.type,
      category_id:      body.category_id || null,
      description:      body.description,
      amount:           body.amount,
      reference_no:     body.reference_no || null,
      notes:            body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}