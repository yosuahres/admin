"use client";
import { LogOut, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "./ui/styles";

interface LogoutConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LogoutConfirmModal({
  open,
  onConfirm,
  onCancel,
}: LogoutConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="logout-title"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-scrim/40"
        onClick={onCancel}
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-black/10 bg-white p-5 text-neutral-900 shadow-2xl">
        <div className="mb-1 flex items-start gap-2">
          <h2 id="logout-title" className="flex-1 text-base font-semibold">
            Sign out of your account?
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="-mt-1 -mr-1 grid size-8 cursor-pointer place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>
        <p className="text-sm text-neutral-500">
          You&apos;ll need to sign in again to access the dashboard.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className={SECONDARY_BUTTON}
          >
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={PRIMARY_BUTTON}>
            <LogOut className="size-3.5" strokeWidth={2} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
