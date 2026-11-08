"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type SidebarState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarState>({
  open: false,
  setOpen: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

/**
 * Holds the drawer state for the narrow layout, where the sidebar is off-canvas
 * and the page header carries the button that opens it. Above `lg` the sidebar
 * is always on screen and this state is never read.
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Following a nav link should leave the drawer behind. Adjusted during render
  // rather than in an effect, so the drawer never paints over the new page.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return <SidebarContext value={{ open, setOpen }}>{children}</SidebarContext>;
}

/** Opens the drawer. Sits at the start of the page header, hidden on desktop. */
export function SidebarTrigger() {
  const { setOpen } = useSidebar();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open menu"
      className="-ml-1 grid size-9 shrink-0 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100 lg:hidden"
    >
      <Menu className="size-5" strokeWidth={1.75} />
    </button>
  );
}
