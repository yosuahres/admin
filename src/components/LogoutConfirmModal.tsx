"use client";
import { useEffect, useRef } from "react";
import { LogOut, X } from "lucide-react";

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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-modal-in">
        <div className="p-6">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <LogOut size={22} className="text-red-500" />
          </div>

          <h2
            id="logout-title"
            className="text-base font-semibold text-gray-900 mb-1"
          >
            Sign out of your account?
          </h2>
          <p className="text-sm text-gray-500">
            You'll need to sign in again to access the dashboard.
          </p>

          <div className="flex gap-3 mt-6">
            <button
              ref={cancelRef}
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-zinc-900 hover:bg-black active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        .animate-modal-in {
          animation: modal-in 0.18s cubic-bezier(0.34, 1.3, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
}