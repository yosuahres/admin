// utils/reportQuery.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportConfig, ActiveFilters } from "@/types/report.types";

export interface QueryResult {
  data: any[];
  total: number;
}

export async function runReportQuery(
  supabase: SupabaseClient,
  config: ReportConfig,
  filters: ActiveFilters,
  search: string,
  page: number,
  limit: number,
  sort?: { column: string; ascending: boolean }
): Promise<QueryResult> {
  let query = supabase
    .from(config.table as any)
    .select(config.select, { count: "exact" });

  // ── Global search ────────────────────────────────────────────────────────
  if (search && config.searchColumn) {
    query = query.ilike(config.searchColumn, `%${search}%`);
  }

  // ── Per-filter logic ─────────────────────────────────────────────────────
  for (const filterDef of config.filters) {
    const val = filters[filterDef.key];
    if (val === undefined || val === null || val === "") continue;

    switch (filterDef.type) {
      case "text":
        if (typeof val === "string" && val.trim()) {
          query = query.ilike(filterDef.key, `%${val.trim()}%`);
        }
        break;

      case "select": {
        const vals = Array.isArray(val) ? val : [val];
        if (vals.length === 0) break;
        if (vals.length === 1) {
          const v = String(vals[0]);
          if (v === "true")  { query = query.eq(filterDef.key, true);  break; }
          if (v === "false") { query = query.eq(filterDef.key, false); break; }
          query = query.eq(filterDef.key, v);
        } else {
          const hasBool = vals.some((v) => v === "true" || v === "false");
          if (hasBool) {
            query = query.in(filterDef.key, vals.map((v) => v === "true" ? true : v === "false" ? false : v));
          } else {
            query = query.in(filterDef.key, vals);
          }
        }
        break;
      }

      case "multiselect":
        if (Array.isArray(val) && val.length > 0) {
          query = query.in(filterDef.key, val);
        }
        break;

      case "date_range": {
        const { from, to } = val as { from?: string; to?: string };
        if (from) query = query.gte(filterDef.key, from);
        if (to)   query = query.lte(filterDef.key, to);
        break;
      }

      case "number_range": {
        const { min, max } = val as { min?: number; max?: number };
        if (min !== undefined) query = query.gte(filterDef.key, min);
        if (max !== undefined) query = query.lte(filterDef.key, max);
        break;
      }
    }
  }

  // ── Sorting ───────────────────────────────────────────────────────────────
  const s = sort ?? config.defaultSort;
  if (s) {
    query = query.order(s.column, { ascending: s.ascending });
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  if (limit < 10000) {
    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: data ?? [],
    total: count ?? 0,
  };
}