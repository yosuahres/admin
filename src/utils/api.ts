// utils/api.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export async function fetchFromBackend(url: string) {
  try {
    const urlObj = new URL(url, "http://localhost");
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;
    const tableName = pathname.replace("/api/", "").replace(/-/g, "_");

    let query =
      tableName === "icare_groups"
        ? supabase
            .from("icare_groups")
            .select("*, jemaat(nama_lengkap)", { count: "exact" })
        : tableName === "profiles"
        ? supabase
            .from("profiles")
            .select("*, jemaat!jemaat_user_id_fkey(id, nama_lengkap)", { count: "exact" })
        : tableName === "departments"
        ? supabase
            .from("departments")
            .select("id, nama_pelayanan, deskripsi, leader_id, created_at, jemaat(nama_lengkap), department_members(count)", { count: "exact" })
        : supabase.from(tableName as any).select("*", { count: "exact" });

    // Apply pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;
    if (limit !== 10000) {
      query = query.range(offset, offset + limit - 1);
    }

    // Apply search if provided
    const search = searchParams.get("search");
    if (search) {
      if (tableName === "profiles") {
        query = query.ilike("full_name", `%${search}%`);
      } else if (tableName === "icare_groups") {
        query = query.ilike("nama_icare", `%${search}%`);
      } else if (tableName === "jemaat") {
        query = query.ilike("nama_lengkap", `%${search}%`);
      } else if (tableName === "events") {
        query = query.ilike("event_name", `%${search}%`);
      } else if (tableName === "departments") {
        query = query.ilike("nama_pelayanan", `%${search}%`);
      }
    }

    // Apply ordering if provided
    const orderBy = searchParams.get("orderBy");
    const orderDir = searchParams.get("orderDir") ?? "asc";
    if (orderBy) {
      query = query.order(orderBy, { ascending: orderDir === "asc" });
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // Flatten relation joins
    const flatData =
      tableName === "profiles"
        ? (data as any[]).map((row) => ({
            ...row,
            jemaat_nama: row.jemaat?.[0]?.nama_lengkap ?? null,
            jemaat_id:   row.jemaat?.[0]?.id ?? null,
            jemaat:      undefined,
          }))
        : tableName === "departments"
        ? (data as any[]).map((row) => ({
            ...row,
            jemaat_nama:       row.jemaat?.nama_lengkap ?? null,
            jemaat:            undefined,
            member_count:      row.department_members?.[0]?.count ?? 0,
            department_members: undefined,
          }))
        : data;

    return {
      data: flatData || [],
      total: count || 0,
    };
  } catch (error) {
    console.error("API fetch error:", error);
    throw error;
  }
}