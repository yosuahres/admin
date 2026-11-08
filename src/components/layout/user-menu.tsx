"use client";

import { LogOut, Palette, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import { ROLE_LABELS } from "@/constants/roles";
import { logout } from "@/lib/supabase/logout";
import { cn } from "@/utils/helpers";
import { ThemeDialog } from "./theme-dialog";
import { type CurrentUser, initials } from "./use-current-user";

const row =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-100";

/** Sidebar footer: the signed-in user, opening up to their account actions. */
export function UserMenu({ user }: { user: CurrentUser | null }) {
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      // Stop the drawer from closing on the same Escape.
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  if (!user) {
    // Holds the footer's height while the profile loads.
    return <div className="h-10 animate-pulse rounded-lg bg-neutral-100" />;
  }

  const userInitials = initials(user.fullName);

  return (
    <div ref={rootRef} className="relative">
      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-black/8 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-neutral-900 text-sm font-semibold text-white">
              {userInitials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-neutral-900">
                  {user.fullName}
                </span>
                <span className="shrink-0 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-neutral-500 uppercase">
                  {user.role ? ROLE_LABELS[user.role] : "No access"}
                </span>
              </span>
              <span className="block truncate text-xs text-neutral-500">
                {user.email}
              </span>
              {user.organization ? (
                <span className="block truncate text-xs text-neutral-500">
                  {user.organization}
                </span>
              ) : null}
            </span>
          </div>

          <div className="p-1">
            <Link
              href="/setting/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={row}
            >
              <Settings
                className="size-4 shrink-0 text-neutral-700"
                strokeWidth={1.75}
              />
              Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              aria-haspopup="dialog"
              onClick={() => {
                setOpen(false);
                setThemeOpen(true);
              }}
              className={row}
            >
              <Palette
                className="size-4 shrink-0 text-neutral-700"
                strokeWidth={1.75}
              />
              Switch Theme
            </button>
            <div className="mx-1 my-1 border-t border-black/8" />

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setLogoutOpen(true);
              }}
              className={row}
            >
              <LogOut
                className="size-4 shrink-0 text-neutral-700"
                strokeWidth={1.75}
              />
              Logout
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-left hover:bg-neutral-100",
          open && "bg-neutral-100",
        )}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-neutral-900 text-[11px] font-semibold text-white">
          {userInitials}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-neutral-900">
          {user.fullName}
        </span>
      </button>

      {/* Outside the menu, which unmounts as these open. */}
      <ThemeDialog open={themeOpen} onClose={() => setThemeOpen(false)} />
      <LogoutConfirmModal
        open={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={async () => {
          setLogoutOpen(false);
          await logout();
          window.location.href = "/login";
        }}
      />
    </div>
  );
}
