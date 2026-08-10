import { createContext, useContext, useState, type ReactNode } from "react";

type UIContextValue = {
  createOpen: boolean;
  setCreateOpen: (v: boolean) => void;
};

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [createOpen, setCreateOpen] = useState(false);
  return <UIContext.Provider value={{ createOpen, setCreateOpen }}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
