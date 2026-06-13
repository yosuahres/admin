"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CalendarRangePickerProps {
  from?: string;
  to?: string;
  onChange: (from: string | undefined, to: string | undefined) => void;
  label?: string;
  buttonClassName?: string;
  align?: "left" | "right";
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYMD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtShort(s: string) {
  return parseYMD(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function CalendarRangePicker({
  from,
  to,
  onChange,
  label = "Tanggal",
  buttonClassName,
  align = "left",
}: CalendarRangePickerProps) {
  const todayYMD = toYMD(new Date());
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() =>
    from ? parseYMD(from).getFullYear() : new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(() =>
    from ? parseYMD(from).getMonth() : new Date().getMonth()
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (from && open) {
      const d = parseYMD(from);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [from, open]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function handleDayClick(ymd: string) {
    if (!from || (from && to)) {
      onChange(ymd, undefined);
    } else if (ymd === from) {
      onChange(undefined, undefined);
    } else if (ymd < from) {
      onChange(ymd, from);
      setOpen(false);
    } else {
      onChange(from, ymd);
      setOpen(false);
    }
  }

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const pickingEnd = !!from && !to;
  const effectiveTo =
    to ?? (pickingEnd && hovered && hovered >= from! ? hovered : undefined);

  const hasValue = !!(from || to);

  let triggerText: string;
  if (!hasValue) triggerText = label;
  else if (from && !to) triggerText = `From ${fmtShort(from)}`;
  else triggerText = `${fmtShort(from!)} – ${fmtShort(to!)}`;

  const defaultBtnCls = `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg shadow-sm transition-colors ${
    hasValue
      ? "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
      : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
  }`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={buttonClassName ?? defaultBtnCls}
      >
        <CalendarDays size={14} className="shrink-0" />
        <span className="truncate flex-1 text-left">{triggerText}</span>
        {open ? <ChevronUp size={13} className="shrink-0" /> : <ChevronDown size={13} className="shrink-0" />}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1.5 ${align === "right" ? "right-0" : "left-0"} w-72 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden`}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="px-3 pb-2">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-0.5">
              {DAY_HEADERS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                const isStart = ymd === from;
                const isEnd = ymd === to;
                const isToday = ymd === todayYMD;
                const inRange = !!(from && effectiveTo && ymd > from && ymd < effectiveTo);
                const isHoveredEnd =
                  pickingEnd && !!hovered && ymd === hovered && hovered >= from!;
                const hasRange = !!(from && effectiveTo && from !== effectiveTo);

                const showRangeBg =
                  inRange || (isStart && hasRange) || ((isEnd || isHoveredEnd) && hasRange);
                const bgLeft = isStart ? "left-1/2" : "left-0";
                const bgRight = isEnd || isHoveredEnd ? "right-1/2" : "right-0";

                return (
                  <div key={day} className="relative flex items-center justify-center h-9">
                    {showRangeBg && (
                      <div
                        className={`absolute inset-y-1.5 ${bgLeft} ${bgRight} bg-gray-100 pointer-events-none`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleDayClick(ymd)}
                      onMouseEnter={() => pickingEnd && setHovered(ymd)}
                      onMouseLeave={() => setHovered(null)}
                      className={`relative z-10 w-8 h-8 text-sm rounded-full flex items-center justify-center transition-colors select-none ${
                        isStart || isEnd
                          ? "bg-gray-900 text-white font-semibold"
                          : isToday
                          ? "bg-gray-900 text-white font-semibold"
                          : isHoveredEnd
                          ? "bg-gray-700 text-white"
                          : "hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      {day}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 italic">
              {!from ? "Pick start date" : !to ? "Pick end date" : " "}
            </span>
            {hasValue && (
              <button
                type="button"
                onClick={() => { onChange(undefined, undefined); setOpen(false); }}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
