"use client";

import {
  ArrowLeft,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Church,
  CircleUserRound,
  type LucideIcon,
  ShieldCheck,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type NavItem, navByRole } from "@/constants/navigation";
import {
  getSection,
  ROLE_HOME,
  ROLE_SECTIONS,
  type Section,
} from "@/constants/roles";
import { cn } from "@/utils/helpers";
import { useSidebar } from "./sidebar-state";
import { type CurrentUser, useCurrentUser } from "./use-current-user";
import { UserMenu } from "./user-menu";

/** What a sidebar can be showing: a role's workspace, or Settings. */
export type SidebarArea = "app" | "settings";

export const SECTION_INFO: Record<
  Section,
  { label: string; icon: LucideIcon }
> = {
  admin: { label: "Admin", icon: ShieldCheck },
  finance: { label: "Finance", icon: Wallet },
  leader: { label: "iCare Leader", icon: UsersRound },
  pastor: { label: "Pastor", icon: Church },
  usher: { label: "Usher", icon: CalendarCheck },
};

const SETTINGS_NAV: NavItem[] = [
  { href: "/setting/account", label: "Account", icon: CircleUserRound },
];

/**
 * Which entry the sidebar marks as the page you are on: the longest href the
 * path sits under. Picking the longest rather than the first keeps History lit
 * on /usher/attendance/history instead of Attendance above it.
 */
function activeHref(items: NavItem[], pathname: string): string | null {
  const hrefs = items.flatMap((item) => [
    item.href,
    ...(item.children ?? []).map((c) => c.href),
  ]);

  let best: string | null = null;
  for (const href of hrefs) {
    if (!href) continue;
    if (pathname !== href && !pathname.startsWith(`${href}/`)) continue;
    if (!best || href.length > best.length) best = href;
  }
  return best;
}

const linkClass = (current: boolean) =>
  cn(
    "flex items-center gap-2 rounded-md px-2 py-2 text-[13px] sm:py-1",
    current
      ? "bg-white font-medium text-neutral-900 shadow-sm ring-1 ring-black/5"
      : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
  );

function NavGroupBlock({
  item,
  active,
}: {
  item: NavItem;
  active: string | null;
}) {
  const children = item.children ?? [];
  const [open, setOpen] = useState(() =>
    children.some((child) => child.href === active),
  );
  const Icon = item.icon;
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-[13px] text-neutral-700 hover:bg-neutral-100 sm:py-1"
      >
        <Icon
          className="size-3.5 shrink-0 text-neutral-500"
          strokeWidth={1.75}
        />
        <span className="flex-1 text-left">{item.label}</span>
        <Chevron
          className="size-3.5 shrink-0 text-neutral-400"
          strokeWidth={2}
        />
      </button>

      {open ? (
        <ul className="mt-0.5 space-y-0.5">
          {children.map((child) =>
            child.href ? (
              <li key={child.href}>
                <Link
                  href={child.href}
                  aria-current={child.href === active ? "page" : undefined}
                  className={cn(
                    linkClass(child.href === active),
                    "block truncate pl-7.5",
                  )}
                >
                  {child.label}
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      ) : null}
    </li>
  );
}

function NavList({
  items,
  active,
}: {
  items: NavItem[];
  active: string | null;
}) {
  return (
    <ul className="mb-2 space-y-0.5">
      {items.map((item) => {
        if (item.children?.length) {
          return <NavGroupBlock key={item.label} item={item} active={active} />;
        }
        if (!item.href) return null;

        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active === item.href ? "page" : undefined}
              className={linkClass(active === item.href)}
            >
              <Icon
                className="size-3.5 shrink-0 text-neutral-500"
                strokeWidth={1.75}
              />
              <span className="flex-1 truncate text-left">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** The IFGF mark on its brand blue. Literal colour: it must not flip with the theme. */
function BrandMark() {
  return (
    <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-md bg-[#0081c3]">
      {/* biome-ignore lint/performance/noImgElement: tiny static asset */}
      <img
        src="/assets/ifgf-logo2.png"
        alt=""
        className="size-full scale-125 object-contain"
      />
    </span>
  );
}

/**
 * The organisation and the workspace you are in. A role that may open more
 * than one workspace (admin: Admin and Finance) gets a menu to move between them.
 */
function WorkspaceSwitcher({
  user,
  current,
}: {
  user: CurrentUser | null;
  current: Section | null;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const sections = user?.role ? ROLE_SECTIONS[user.role] : [];
  const switchable = sections.length > 1;
  const subtitle = current ? SECTION_INFO[current].label : "";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
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

  const label = (
    <>
      <BrandMark />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-neutral-900">
          {user?.organization || "IFGF"}
        </span>
        <span className="block truncate text-[11px] text-neutral-500">
          {subtitle}
        </span>
      </span>
    </>
  );

  if (!switchable) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1.5">
        {label}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
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
        {label}
        <ChevronsUpDown
          className="size-3.5 shrink-0 text-neutral-400"
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full left-0 z-50 mt-1 w-full min-w-48 rounded-xl border border-black/10 bg-white p-1 shadow-lg"
        >
          <p className="px-2 pt-1.5 pb-1 text-[11px] font-medium text-neutral-500">
            Workspaces
          </p>
          {sections.map((section) => {
            const { label: name, icon: Icon } = SECTION_INFO[section];
            return (
              <Link
                key={section}
                href={`/${section}`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-100"
              >
                <Icon
                  className="size-4 shrink-0 text-neutral-500"
                  strokeWidth={1.75}
                />
                <span className="flex-1">{name}</span>
                {section === current ? (
                  <Check
                    className="size-4 shrink-0 text-neutral-900"
                    strokeWidth={2}
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Everything inside the panel — shared by the fixed desktop rail and the drawer. */
function SidebarBody({
  area,
  user,
  onClose,
}: {
  area: SidebarArea;
  user: CurrentUser | null;
  /** Rendered as a close button in the drawer; absent on desktop. */
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const section = getSection(pathname);
  const items =
    area === "settings"
      ? SETTINGS_NAV
      : section
        ? navByRole[section]
        : user?.role
          ? navByRole[user.role]
          : [];
  const active = activeHref(items, pathname);

  return (
    <>
      <div className="flex items-center gap-1 p-2.5">
        {area === "settings" ? (
          <p className="min-w-0 flex-1 truncate px-2 py-1.5 text-sm font-semibold text-neutral-900">
            Settings
          </p>
        ) : (
          <WorkspaceSwitcher user={user} current={section} />
        )}

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid size-9 shrink-0 place-items-center rounded-md text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
          >
            <X className="size-5" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
        {area === "settings" ? (
          <p className="px-2 pt-1 pb-1 text-[11px] font-medium text-neutral-500">
            Account
          </p>
        ) : null}
        <NavList items={items} active={active} />
      </nav>

      <div className="border-t border-black/8 p-2.5">
        {area === "settings" ? (
          <Link
            href={user?.role ? ROLE_HOME[user.role] : "/"}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <ArrowLeft
              className="size-3.5 shrink-0 text-neutral-500"
              strokeWidth={1.75}
            />
            Back to Dashboard
          </Link>
        ) : (
          <UserMenu user={user} />
        )}
      </div>
    </>
  );
}

export function AppSidebar({ area = "app" }: { area?: SidebarArea }) {
  const { open, setOpen } = useSidebar();
  const user = useCurrentUser();

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-52 shrink-0 flex-col border-r border-black/8 bg-neutral-50 lg:flex">
        <SidebarBody area={area} user={user} />
      </aside>

      {/* Off-canvas drawer, below lg. Kept mounted so it can slide, and inert
          while closed so nothing inside it takes focus. */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          !open && "pointer-events-none",
        )}
        inert={!open}
      >
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-scrim/40 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          role="dialog"
          aria-modal={open}
          aria-label="Navigation"
          className={cn(
            "absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col border-r border-black/8 bg-neutral-50 shadow-xl transition-transform duration-200",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarBody area={area} user={user} onClose={() => setOpen(false)} />
        </div>
      </div>
    </>
  );
}
