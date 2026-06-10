"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ColumnSchema } from "@/utils/exportutils";

export interface PageActions {
  addLabel?: string;
  onAdd?: () => void;
  exportTitle?: string;
  exportSchema?: ColumnSchema[];
  /** Returns current table items at call time — use a ref inside to avoid stale closures */
  getItems?: () => any[];
  onImport?: (rows: Record<string, any>[]) => Promise<void>;
  /** Custom export handler — use a ref inside to avoid stale closures */
  onExport?: () => void;
}

const SetCtx = createContext<(a: PageActions | null) => void>(() => {});
const ActionsCtx = createContext<PageActions>({});

export function PageActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActionsState] = useState<PageActions>({});
  const setActions = useCallback((a: PageActions | null) => {
    setActionsState(a ?? {});
  }, []);

  return (
    <SetCtx.Provider value={setActions}>
      <ActionsCtx.Provider value={actions}>
        {children}
      </ActionsCtx.Provider>
    </SetCtx.Provider>
  );
}

/** Call inside a page to register header actions. Runs once on mount, cleaned up on unmount. */
export function useSetPageActions(actions: PageActions) {
  const setActions = useContext(SetCtx);
  useEffect(() => {
    setActions(actions);
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActions]);
}

/** Read current page actions — used by Header. */
export function usePageActions() {
  return useContext(ActionsCtx);
}
