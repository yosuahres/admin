// components/ReportFilterBar.tsx
"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FilterConfig, ActiveFilters } from "@/types/report.types";
import { CalendarRangePicker } from "@/components/CalendarRangePicker";

interface Props {
  filters: FilterConfig[];
  values: ActiveFilters;
  onChange: (key: string, value: any) => void;
  onClear: () => void;
}

export default function ReportFilterBar({ filters, values, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {filters.map((filter) => (
        <FilterInput
          key={filter.key}
          filter={filter}
          value={values[filter.key]}
          onChange={(v) => onChange(filter.key, v)}
        />
      ))}
    </div>
  );
}

const baseCls =
  "w-full pl-3 pr-8 py-1.5 text-sm border border-transparent rounded-lg bg-gray-100 text-gray-900 outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-500";

function FilterInput({
  filter,
  value,
  onChange,
}: {
  filter: FilterConfig;
  value: any;
  onChange: (v: any) => void;
}) {
  switch (filter.type) {
    case "select":
    case "multiselect":
      return (
        <MultiSelectDropdown filter={filter} value={value} onChange={onChange} />
      );

    case "text":
      return (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={filter.placeholder ?? filter.label}
          className={baseCls + " pr-4"}
        />
      );

    case "date_range": {
      const hasVal = !!(value?.from || value?.to);
      return (
        <CalendarRangePicker
          from={value?.from}
          to={value?.to}
          label={filter.label}
          onChange={(f, t) => onChange(!f && !t ? undefined : { from: f, to: t })}
          buttonClassName={`w-full flex items-center pl-3 pr-2.5 py-1.5 text-sm border rounded-lg outline-none cursor-pointer transition-colors ${
            hasVal
              ? "bg-blue-50 text-blue-700 font-semibold border-blue-200"
              : "bg-gray-100 text-gray-500 font-normal border-transparent hover:bg-gray-200"
          }`}
        />
      );
    }

    case "number_range":
      return (
        <div className="col-span-2 flex items-center gap-1">
          <input
            type="number"
            value={value?.min ?? ""}
            placeholder={`${filter.label} min`}
            onChange={(e) =>
              onChange({
                ...(value ?? {}),
                min: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className={baseCls + " pr-4"}
          />
          <span className="text-gray-300 text-xs shrink-0">–</span>
          <input
            type="number"
            value={value?.max ?? ""}
            placeholder={`${filter.label} max`}
            onChange={(e) =>
              onChange({
                ...(value ?? {}),
                max: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className={baseCls + " pr-4"}
          />
        </div>
      );

    default:
      return null;
  }
}

function MultiSelectDropdown({
  filter,
  value,
  onChange,
}: {
  filter: FilterConfig;
  value: any;
  onChange: (v: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected: string[] = Array.isArray(value)
    ? value
    : value !== undefined && value !== "" && value !== null
    ? [String(value)]
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (val: string) => {
    const next = selected.includes(val)
      ? selected.filter((s) => s !== val)
      : [...selected, val];
    onChange(next.length ? next : undefined);
  };

  const displayLabel =
    selected.length === 0
      ? filter.label
      : selected.length === 1
      ? (filter.options?.find((o) => o.value === selected[0])?.label ?? selected[0])
      : `${selected.length} dipilih`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between pl-3 pr-2.5 py-1.5 text-sm border border-transparent rounded-lg bg-gray-100 outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer transition-colors"
      >
        <span
          className={`truncate ${
            selected.length === 0 ? "text-gray-400 font-normal" : "font-semibold text-gray-900"
          }`}
        >
          {displayLabel}
        </span>
        <ChevronsUpDown size={14} className="text-gray-400 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[160px] bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto">
          {filter.options?.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    checked ? "bg-gray-900 border-gray-900" : "border-gray-300"
                  }`}
                >
                  {checked && <Check size={10} className="text-white" />}
                </div>
                <span className={checked ? "font-medium text-gray-900" : "text-gray-600"}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
