"use client";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/utils/helpers";
import {
  DIALOG_PANEL,
  DIALOG_SCRIM,
  INPUT,
  LABEL,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  TEXTAREA,
} from "./ui/styles";

interface ModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: {
    name: string;
    label: string;
    type:
      | "text"
      | "email"
      | "password"
      | "select"
      | "textarea"
      | "date"
      | "time"
      | "number";
    options?: { value: string; label: string }[];
    required?: boolean;
    placeholder?: string;
  }[];
  onSubmit: (data: Record<string, any>) => void;
  initialData?: Record<string, any> | null;
  submitText?: string;
  isLoading?: boolean;
}

// Generate time options in 30-minute increments, 24-hour format
const TIME_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "— Pilih Jam —" },
  ...Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    const val = `${String(h).padStart(2, "0")}:${m}`;
    return { value: val, label: val };
  }),
];

export default function ModalForm({
  isOpen,
  onClose,
  title,
  fields,
  onSubmit,
  initialData,
  submitText = "Submit",
  isLoading = false,
}: ModalFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Normalize time values to HH:MM (strip seconds if present e.g. "13:30:00")
    const normalized: Record<string, any> = { ...(initialData ?? {}) };
    (fields ?? []).forEach((field) => {
      if (field.type === "time" && typeof normalized[field.name] === "string") {
        normalized[field.name] = normalized[field.name].slice(0, 5);
      }
    });
    setFormData(normalized);
    setErrors({});
  }, [initialData, isOpen, fields]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit(formData);
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className={DIALOG_SCRIM}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-form-title"
        className={cn(
          DIALOG_PANEL,
          "flex max-h-[90vh] max-w-2xl flex-col overflow-hidden",
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/8 px-5 py-4">
          <h2
            id="modal-form-title"
            className="text-base font-semibold text-neutral-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 cursor-pointer place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid gap-x-6 gap-y-5 overflow-y-auto px-5 py-5 md:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.name}
                className={cn(
                  "flex flex-col gap-2",
                  field.type === "textarea" && "md:col-span-2",
                )}
              >
                <label htmlFor={`field-${field.name}`} className={LABEL}>
                  {field.label}{" "}
                  {field.required && <span className="text-red-600">*</span>}
                </label>

                {field.type === "select" ? (
                  <select
                    id={`field-${field.name}`}
                    value={formData[field.name] || ""}
                    onChange={(e) =>
                      handleInputChange(field.name, e.target.value)
                    }
                    className={INPUT}
                    required={field.required}
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "time" ? (
                  // Custom time select — avoids browser 12/24h locale issues
                  <select
                    id={`field-${field.name}`}
                    value={formData[field.name] || ""}
                    onChange={(e) =>
                      handleInputChange(field.name, e.target.value)
                    }
                    className={INPUT}
                    required={field.required}
                  >
                    {TIME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    id={`field-${field.name}`}
                    value={formData[field.name] || ""}
                    onChange={(e) =>
                      handleInputChange(field.name, e.target.value)
                    }
                    placeholder={field.placeholder}
                    className={cn(TEXTAREA, "resize-none")}
                    rows={4}
                    required={field.required}
                  />
                ) : field.type === "number" ? (
                  <input
                    id={`field-${field.name}`}
                    type="number"
                    min={0}
                    value={formData[field.name] ?? ""}
                    onChange={(e) =>
                      handleInputChange(
                        field.name,
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder={field.placeholder}
                    className={INPUT}
                    required={field.required}
                  />
                ) : (
                  <input
                    id={`field-${field.name}`}
                    type={field.type}
                    value={formData[field.name] || ""}
                    onChange={(e) =>
                      handleInputChange(field.name, e.target.value)
                    }
                    placeholder={field.placeholder}
                    className={INPUT}
                    required={field.required}
                  />
                )}

                {errors[field.name] && (
                  <p className="text-xs text-red-600">{errors[field.name]}</p>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 justify-end gap-2 border-t border-black/8 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className={SECONDARY_BUTTON}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={PRIMARY_BUTTON}
            >
              {isLoading && <Loader2 className="size-3.5 animate-spin" />}
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
