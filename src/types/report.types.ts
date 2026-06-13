// types/report.types.ts

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: "select" | "multiselect" | "text" | "date_range" | "number_range";
  options?: FilterOption[];
  placeholder?: string;
}

export interface ColumnConfig {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  editable?: boolean;
  inputType?: "text" | "number" | "date" | "email" | "textarea" | "select";
  options?: { value: string; label: string }[];
  valueType?: "boolean" | "number";
}

export interface ReportConfig {
  id: string;
  label: string;
  table: string;
  select: string;
  searchColumn: string;
  defaultSort: { column: string; ascending: boolean };
  filters: FilterConfig[];
  columns: ColumnConfig[];
  allowedRoles?: Array<"admin" | "leader" | "finance">;
  transformForExport?: (rows: any[]) => any[];
}

export type ActiveFilters = Record<string, any>;