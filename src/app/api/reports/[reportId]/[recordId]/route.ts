// api/reports/[reportId]/[recordId]/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { REPORT_CONFIGS } from "@/config/reportConfigs";
import { ROLES, type Role, rolesForSection } from "@/constants/roles";
import { requireRole } from "@/lib/auth/require-role";

// Same role rules the Reports page uses to decide which reports a role sees.
const allowedRolesFor = (reportId: string): readonly Role[] => {
  if (reportId === "cashflow_categories") return rolesForSection("finance");
  return REPORT_CONFIGS.find((c) => c.id === reportId)?.allowedRoles ?? ROLES;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string; recordId: string }> }
) {
  try {
    const supabase = await createClient();
    const { reportId, recordId } = await params;

    const auth = await requireRole(allowedRolesFor(reportId));
    if (!auth.ok) return auth.response;
    const body = await req.json();

    const tableMap: Record<string, string> = {
      jemaat: "jemaat",
      icare_report: "icare_meetings",
      usher_attendance: "attendance_reports",
      events: "events",
      cashflow_transactions: "cashflow_transactions",
      cashflow_categories: "cashflow_categories",
    };

    const tableName = tableMap[reportId];
    if (!tableName) {
      return NextResponse.json(
        { error: "Invalid report ID" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from(tableName as any)
      .update(body)
      .eq("id", recordId)
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string; recordId: string }> }
) {
  try {
    const supabase = await createClient();
    const { reportId, recordId } = await params;

    const auth = await requireRole(allowedRolesFor(reportId));
    if (!auth.ok) return auth.response;

    const tableMap: Record<string, string> = {
      jemaat: "jemaat",
      icare_report: "icare_meetings",
      usher_attendance: "attendance_reports",
      events: "events",
      cashflow_transactions: "cashflow_transactions",
      cashflow_categories: "cashflow_categories",
    };

    const tableName = tableMap[reportId];
    if (!tableName) {
      return NextResponse.json(
        { error: "Invalid report ID" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from(tableName as any)
      .delete()
      .eq("id", recordId);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
