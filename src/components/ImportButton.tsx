// components/ImportButton.tsx
"use client";

import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { importFromExcel, ImportResult } from "../utils/importutils";
import type { ColumnSchema } from "../utils/exportutils";

interface ImportButtonProps {
  schema: ColumnSchema[];
  /** Called with parsed rows — you handle the actual DB insert */
  onImport: (rows: Record<string, any>[]) => Promise<void>;
  /** Label shown on button */
  label?: string;
  /** Extra className applied to the trigger button */
  className?: string;
  /** Called when the trigger button is clicked, before the file picker opens */
  onTrigger?: () => void;
}

type Step = "idle" | "preview" | "importing" | "done";

export default function ImportButton({
  schema,
  onImport,
  label = "Import",
  className,
  onTrigger,
}: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      const parsed = await importFromExcel(file, { schema, skipInvalidRows: true });
      setResult(parsed);
      setStep("preview");
    } catch (err: any) {
      setError(err?.message || "Failed to parse file.");
    }

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirm = async () => {
    if (!result?.data.length) return;
    setStep("importing");
    try {
      await onImport(result.data);
      setStep("done");
      setTimeout(() => {
        setStep("idle");
        setResult(null);
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Import failed.");
      setStep("preview");
    }
  };

  const handleCancel = () => {
    setStep("idle");
    setResult(null);
    setError(null);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { onTrigger?.(); fileInputRef.current?.click(); }}
        className={className ?? "flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 font-medium whitespace-nowrap"}
      >
        <Upload size={18} />
        <span>{label}</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Preview / Confirm modal */}
      {step !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">
                Import Preview
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              {/* Stats */}
              {result && (
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-green-600 font-medium">
                    <CheckCircle size={16} />
                    {result.validRows} valid rows
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    {result.totalRows} total rows
                  </div>
                  {result.errors.length > 0 && (
                    <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                      <AlertCircle size={16} />
                      {result.errors.filter((e) => e.row > 0).length} row errors
                    </div>
                  )}
                </div>
              )}

              {/* Errors list */}
              {result && result.errors.filter((e) => e.row > 0).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 max-h-36 overflow-y-auto text-xs text-amber-800 space-y-1">
                  {result.errors
                    .filter((e) => e.row > 0)
                    .slice(0, 20)
                    .map((err, i) => (
                      <div key={i}>
                        Row {err.row}
                        {err.field ? ` · ${err.field}` : ""}: {err.message}
                      </div>
                    ))}
                  {result.errors.filter((e) => e.row > 0).length > 20 && (
                    <div className="text-amber-600 font-medium">
                      …and {result.errors.filter((e) => e.row > 0).length - 20} more
                    </div>
                  )}
                </div>
              )}

              {/* General error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Column warnings */}
              {result &&
                result.errors.filter((e) => e.row === 0).length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-600 space-y-1">
                    <div className="font-medium mb-1">Column warnings:</div>
                    {result.errors
                      .filter((e) => e.row === 0)
                      .map((e, i) => (
                        <div key={i}>{e.message}</div>
                      ))}
                  </div>
                )}

              {/* Data preview table */}
              {result && result.data.length > 0 && (
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="overflow-x-auto max-h-48">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {schema.map((col) => (
                            <th
                              key={col.key}
                              className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap"
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.data.slice(0, 5).map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {schema.map((col) => (
                              <td
                                key={col.key}
                                className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[140px] truncate"
                              >
                                {row[col.key] ?? (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {result.data.length > 5 && (
                    <div className="text-xs text-gray-400 text-center py-2 border-t border-gray-200">
                      Showing 5 of {result.data.length} rows
                    </div>
                  )}
                </div>
              )}

              {/* Done state */}
              {step === "done" && (
                <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                  <CheckCircle size={18} />
                  Import successful!
                </div>
              )}
            </div>

            {/* Footer */}
            {step !== "done" && (
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  disabled={step === "importing"}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={
                    step === "importing" ||
                    !result?.data.length
                  }
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40"
                >
                  {step === "importing" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Import {result?.validRows ?? 0} rows
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}